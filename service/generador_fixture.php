<?php
/** Guarda el fixture, genera rondas siguientes y calcula el campeón. */
class GeneradorFixture {
    private PartidoRepository $partidos;
    private EquipoRepository $equipos;

    public function __construct(?PartidoRepository $p = null, ?EquipoRepository $e = null) {
        $this->partidos = $p ?? new PartidoRepository();
        $this->equipos = $e ?? new EquipoRepository();
    }

    /** Primer fixture o siguiente ronda; devuelve los partidos creados. */
    public function generar(Torneo $t, array $opc): int {
        $formato = $t->getTipo()?->getClave();
        if (!Fixture::soporta($formato)) throw new ApiException('Elegí el formato del torneo en Configuración para generar el fixture.');
        $paso = $this->proximoPaso($t);
        if ($paso['accion'] === null) throw new ApiException($paso['motivo']);

        $equipos = $this->equipos->idsDelTorneo($t->getId());
        $todos = $this->partidos->delTorneo($t->getId());
        $nro = count(array_unique(array_map(fn(Partido $p) => $p->getFase(), $todos))) + 1;

        $plan = match ($formato) {
            'liga-simple', 'sistema-puntos' => Fixture::liga($equipos),
            'liga-doble'          => Fixture::liga($equipos, 2),
            'gran-premio'         => Fixture::granPremio($equipos, max(1, min(10, (int)($opc['etapas'] ?? 3)))),
            'eliminacion-simple',
            'blitz'               => Fixture::eliminacion($equipos),
            'eliminacion-doble'   => Fixture::dobleEliminacion($equipos),
            'suizo'               => Fixture::rondaSuiza($this->tabla($t), $this->cruces($todos), $nro),
            'vidas'               => Fixture::rondaVidas($this->vivos($t), $this->cruces($this->ultimaFase($todos)), $nro),
            'copa-desafio'        => $this->planDesafio($equipos, $todos),
            'grupos'              => $this->planGrupos($t, $equipos, $todos, (int)($opc['grupos'] ?? 0)),
        };
        $creados = $this->guardar($t, $plan, $opc);
        if ($creados === 0) throw new ApiException('No quedan partidos por generar.');
        return $creados;
    }

    /** Qué se puede generar ahora: ['accion' => 'generar'|'siguiente'|null, 'label' => ..., 'motivo' => ...] */
    public function proximoPaso(Torneo $t): array {
        $formato = $t->getTipo()?->getClave();
        $todos = $this->partidos->delTorneo($t->getId());
        $n = count($this->equipos->idsDelTorneo($t->getId()));
        $no = fn(string $m) => ['accion' => null, 'label' => null, 'motivo' => $m];
        if (!Fixture::soporta($formato)) return $no('Elegí el formato del torneo para poder generar el fixture.');
        if (!$todos) {
            return $n < 2 ? $no('Se necesitan al menos 2 equipos inscriptos.') : ['accion' => 'generar', 'label' => 'Generar fixture', 'motivo' => null];
        }
        if (!Fixture::porRondas($formato)) return $no('El fixture ya está generado.');
        if (array_filter($todos, fn(Partido $p) => !$p->estaJugado())) {
            return $no('Cuando estén todos los resultados de la ronda actual vas a poder generar la siguiente.');
        }
        if ($this->campeon($t) !== null) return $no('El torneo ya tiene campeón.');
        $nro = count(array_unique(array_map(fn(Partido $p) => $p->getFase(), $todos))) + 1;
        return match ($formato) {
            'suizo'        => $nro > $this->rondasSuizo($n) ? $no('Se jugaron todas las rondas del sistema suizo.')
                                                            : ['accion' => 'siguiente', 'label' => "Generar ronda $nro", 'motivo' => null],
            'vidas'        => ['accion' => 'siguiente', 'label' => "Generar ronda $nro", 'motivo' => null],
            'copa-desafio' => ['accion' => 'siguiente', 'label' => 'Generar desafío ' . (count($todos) + 1), 'motivo' => null],
            'grupos'       => $this->tieneEliminatoria($todos) ? $no('La eliminatoria ya está generada.')
                                                               : ['accion' => 'siguiente', 'label' => 'Generar eliminatorias', 'motivo' => null],
        };
    }

    /** Equipo campeón (id) o null si todavía no hay. */
    public function campeon(Torneo $t): ?int {
        $formato = $t->getTipo()?->getClave();
        $todos = $this->partidos->delTorneo($t->getId());
        if (!$todos || array_filter($todos, fn(Partido $p) => !$p->estaJugado())) return null;
        switch ($formato) {
            case 'eliminacion-simple': case 'blitz': case 'eliminacion-doble': case 'grupos':
                usort($todos, fn($a, $b) => $a->getId() <=> $b->getId());
                $ultimo = end($todos);
                if ($formato === 'grupos' && !$this->tieneEliminatoria($todos)) return null;
                return $ultimo->getResultado()->getGanadorEquipoId();
            case 'vidas':
                $vivos = $this->vivos($t);
                return count($vivos) === 1 ? $vivos[0] : null;
            case 'copa-desafio':
                $equipos = $this->equipos->idsDelTorneo($t->getId());
                return count($todos) >= count($equipos) - 1 ? $this->campeonDesafio($equipos, $todos) : null;
            case 'suizo':
                return count(array_unique(array_map(fn(Partido $p) => $p->getFase(), $todos))) >= $this->rondasSuizo(count($this->equipos->idsDelTorneo($t->getId())))
                    ? ($this->tabla($t)[0] ?? null) : null;
            default:
                return $t->getEstado() === Torneo::FINALIZADO ? ($this->tabla($t)[0] ?? null) : null;
        }
    }

    // ── Guardado ────────────────────────────────────────────

    private function guardar(Torneo $t, array $plan, array $opc): int {
        $inicio = $opc['inicio'];
        $hora = $opc['hora'];
        $blitz = $t->getTipo()?->getClave() === 'blitz';
        $juez = $t->getConfiguracion()->getJuezPrincipalId();
        $ids = []; $creados = 0;
        $this->partidos->transaccion(function () use ($t, $plan, $opc, $inicio, $hora, $blitz, $juez, &$ids, &$creados) {
            $pendientes = [];
            foreach ($plan as $i => $ronda) {
                $orden = $ronda['fecha'] ?? $i;
                if ($blitz) {
                    $fecha = $inicio;
                    $horaRonda = date('H:i', strtotime(($hora ?? '09:00') . ' +' . ($orden * $opc['minutos']) . ' minutes'));
                } else {
                    $fecha = date('Y-m-d', strtotime("$inicio +" . ($orden * $opc['dias']) . ' days'));
                    $horaRonda = $hora;
                }
                foreach ($ronda['partidos'] as $p) {
                    [$a, $b] = $p;
                    $partido = new Partido(null, $t->getId(), $a[0] === 't' ? $a[1] : null, $b[0] === 't' ? $b[1] : null,
                        Partido::fechaDesde($fecha, $horaRonda), $opc['lugar'], $ronda['fase'], null, $juez);
                    $id = $this->partidos->crear($partido, $t->getOrganizadorId());
                    if (isset($p[2])) $ids[$p[2]] = $id;
                    foreach (['local' => $a, 'visitante' => $b] as $lado => $slot) {
                        if ($slot[0] !== 't') $pendientes[] = [$slot, $id, $lado];
                    }
                    $creados++;
                }
            }
            foreach ($pendientes as [$slot, $destino, $lado]) {
                $this->partidos->guardarAvance($ids[$slot[1]], $slot[0] === 'g' ? 'ganador' : 'perdedor', $destino, $lado);
            }
        });
        return $creados;
    }

    // ── Formatos por rondas ─────────────────────────────────

    /** Equipos ordenados por puntos y victorias (del mejor al peor). */
    private function tabla(Torneo $t): array {
        $lista = $this->equipos->delTorneo($t->getId());
        usort($lista, fn(Equipo $a, Equipo $b) => [$b->getPuntos(), $b->getGanados(), $a->getId()] <=> [$a->getPuntos(), $a->getGanados(), $b->getId()]);
        return array_map(fn(Equipo $e) => $e->getId(), $lista);
    }

    /** "a-b" de los cruces que ya se jugaron. */
    private function cruces(array $partidos): array {
        $c = [];
        foreach ($partidos as $p) {
            if ($p->getLocalId() && $p->getVisitanteId()) $c[min($p->getLocalId(), $p->getVisitanteId()) . '-' . max($p->getLocalId(), $p->getVisitanteId())] = true;
        }
        return $c;
    }

    private function ultimaFase(array $partidos): array {
        if (!$partidos) return [];
        usort($partidos, fn($a, $b) => $a->getId() <=> $b->getId());
        $fase = end($partidos)->getFase();
        return array_filter($partidos, fn(Partido $p) => $p->getFase() === $fase);
    }

    private function rondasSuizo(int $n): int {
        return max(1, (int)ceil(log(max(2, $n), 2)));
    }

    /** Equipos con vidas, del que tiene más al que tiene menos. */
    private function vivos(Torneo $t): array {
        $vidas = $t->getConfiguracion()->getVidas();
        $lista = array_filter($this->equipos->delTorneo($t->getId()), fn(Equipo $e) => $vidas - $e->getPerdidos() > 0);
        usort($lista, fn(Equipo $a, Equipo $b) => [$a->getPerdidos(), $b->getPuntos(), $a->getId()] <=> [$b->getPerdidos(), $a->getPuntos(), $b->getId()]);
        return array_values(array_map(fn(Equipo $e) => $e->getId(), $lista));
    }

    /** Vidas que le quedan a cada equipo. @return array<int,int> */
    public function vidasRestantes(Torneo $t): array {
        $vidas = $t->getConfiguracion()->getVidas();
        $r = [];
        foreach ($this->equipos->delTorneo($t->getId()) as $e) $r[$e->getId()] = max(0, $vidas - $e->getPerdidos());
        return $r;
    }

    /** El primer inscripto empieza como campeón; si un retador gana, pasa a ser el campeón. Empate: retiene. */
    public function campeonDesafio(array $equipos, array $partidos): ?int {
        if (!$equipos) return null;
        usort($partidos, fn($a, $b) => $a->getId() <=> $b->getId());
        $campeon = $equipos[0];
        foreach ($partidos as $p) {
            if ($p->estaJugado() && $p->getResultado()->getGanadorEquipoId() !== null) $campeon = $p->getResultado()->getGanadorEquipoId();
        }
        return $campeon;
    }

    private function planDesafio(array $equipos, array $todos): array {
        $retadores = array_values(array_slice($equipos, 1));
        $k = count($todos);
        if (!isset($retadores[$k])) throw new ApiException('Ya se jugaron todos los desafíos.');
        return Fixture::desafio($this->campeonDesafio($equipos, $todos), $retadores[$k], $k + 1);
    }

    private function tieneEliminatoria(array $partidos): bool {
        foreach ($partidos as $p) if (!str_starts_with($p->getFase(), 'Grupo ')) return true;
        return false;
    }

    private function planGrupos(Torneo $t, array $equipos, array $todos, int $cantidad): array {
        if (!$todos) {
            $cantidad = $cantidad ?: ($t->getConfiguracion()->getCantGrupos() ?: max(1, intdiv(count($equipos), 4)));
            $grupos = Fixture::repartirEnGrupos($equipos, $cantidad);
            $this->equipos->borrarGrupos($t->getId());
            $this->equipos->asignarGrupos($t->getId(), $grupos);
            return Fixture::faseDeGrupos($grupos);
        }
        $porGrupo = [];
        foreach ($this->equipos->delTorneo($t->getId()) as $e) $porGrupo[$e->getGrupo() ?? 'A'][] = $e;
        ksort($porGrupo);
        $clasificados = [];
        foreach ($porGrupo as $nombre => $lista) {
            usort($lista, fn(Equipo $a, Equipo $b) => [$b->getPuntos(), $b->getGanados(), $a->getId()] <=> [$a->getPuntos(), $a->getGanados(), $b->getId()]);
            $clasificados[$nombre] = array_map(fn(Equipo $e) => $e->getId(), array_slice($lista, 0, 2));
        }
        return Fixture::eliminatoriaDeGrupos($clasificados);
    }
}
