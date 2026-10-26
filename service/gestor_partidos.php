<?php
/** Reglas de negocio de los partidos (organizador y juez). */
class GestorPartidos {
    private PartidoRepository $partidos;
    private EquipoRepository $equipos;
    private TorneoRepository $torneos;
    private JuezRepository $jueces;
    private Notificador $avisos;

    public function __construct(?PartidoRepository $p = null, ?EquipoRepository $e = null, ?TorneoRepository $t = null) {
        $this->partidos = $p ?? new PartidoRepository();
        $this->equipos  = $e ?? new EquipoRepository();
        $this->torneos  = $t ?? new TorneoRepository();
        $this->jueces   = new JuezRepository();
        $this->avisos   = new Notificador(null, $this->equipos, $this->torneos);
    }

    public function crear(Partido $p, int $organizadorId): int {
        $id = $this->partidos->crear($p, $organizadorId);
        $this->avisos->partido($p, 'Nuevo partido');
        $this->avisarJuez($p, null);
        return $id;
    }

    /** Carga el marcador; en una llave no se permite empate. */
    public function aplicarMarcador(Partido $p, bool $jugado, $local, $visitante): void {
        if (!$jugado) { $p->setResultado(null); return; }
        if ($p->getLocalId() === null || $p->getVisitanteId() === null) {
            throw new ApiException('Para cargar un resultado, el partido necesita los dos equipos.');
        }
        $hs = ($local ?? '') !== '' ? (float)$local : null;
        $as = ($visitante ?? '') !== '' ? (float)$visitante : null;
        if ($hs === null || $as === null) throw new ApiException('Ingresá el marcador de ambos equipos.');
        if ($hs == $as && $this->esEliminatorio($p)) {
            throw new ApiException('En una llave de eliminación no puede haber empate: cargá el resultado final (por ejemplo, después de los penales).');
        }
        $p->setResultado(Resultado::jugado($p->getLocalId(), $p->getVisitanteId(), $hs, $as));
    }

    /** Guarda los cambios del partido ($antes = cómo estaba) y avisa a quien corresponda. */
    public function guardar(Partido $p, Partido $antes): void {
        $this->partidos->transaccion(function () use ($p) {
            $this->partidos->actualizar($p);
            $this->avanzar($p);
            $this->desempate($p);
            $this->recalcular($p->getTorneoId());
        });

        $this->auditarResultado($p, $antes);
        if ($p->estaJugado() && !$p->getResultado()->igualMarcador($antes->getResultado())) {
            $this->avisos->resultado($p);
            $this->avisos->seguidores($p->getTorneoId(), 'resultado', $this->textoResultado($p));
        } elseif (!$p->estaJugado() && !$p->mismosDatos($antes)) {
            $this->avisos->partido($p, 'Partido actualizado');
        }
        $this->avisarJuez($p, $antes->getJuezId());
    }

    public function eliminar(Partido $p): void {
        $this->partidos->transaccion(function () use ($p) {
            $this->partidos->eliminar($p->getId());
            $this->recalcular($p->getTorneoId());
        });
        $this->avisos->partidoCancelado($p);
    }

    public function recalcular(int $torneoId): void {
        $jugados = $this->partidos->jugadosDelTorneo($torneoId);
        // En grupos + eliminación, la tabla de cada grupo cuenta solo los partidos de la fase de grupos
        if ($this->torneos->buscar($torneoId)?->getTipo()?->getClave() === 'grupos') {
            $jugados = array_values(array_filter($jugados, fn(Partido $p) => str_starts_with($p->getFase(), 'Grupo ')));
        }
        $stats = TablaPosiciones::calcular($this->equipos->idsDelTorneo($torneoId), $jugados);
        $this->equipos->guardarEstadisticas($torneoId, $stats);
    }

    /** Pasa el ganador (o perdedor) al partido siguiente de la llave. */
    private function avanzar(Partido $p): void {
        $r = $p->getResultado();
        foreach ($this->partidos->avancesDesde((int)$p->getId()) as $a) {
            $destino = $this->partidos->buscar((int)$a['destino_fk']);
            if ($destino === null) continue;
            $equipo = null;
            if ($r !== null && $r->estaJugado()) {
                $ganador = $r->getGanadorEquipoId();
                $equipo = $a['resultado'] === 'ganador' ? $ganador : ($ganador === $p->getLocalId() ? $p->getVisitanteId() : $p->getLocalId());
            }
            $actual = $a['lado'] === 'local' ? $destino->getLocalId() : $destino->getVisitanteId();
            if ($actual === $equipo) continue;
            if ($destino->estaJugado()) {
                throw new ApiException('No se puede cambiar este resultado: el partido siguiente de la llave ya se jugó.');
            }
            if ($a['lado'] === 'local') $destino->setLocalId($equipo); else $destino->setVisitanteId($equipo);
            $this->partidos->actualizar($destino);
        }
    }

    /** Partido de llave: alimenta a otro, sale de otro o es la gran final. */
    private function esEliminatorio(Partido $p): bool {
        $id = (int)$p->getId();
        return (bool)$this->partidos->avancesDesde($id) || $this->partidos->tieneOrigenes($id)
            || in_array($p->getFase(), [Fixture::GRAN_FINAL, Fixture::DESEMPATE], true);
    }

    /** Doble eliminación: si el campeón de perdedores gana la gran final, se juega un desempate. */
    private function desempate(Partido $p): void {
        if ($p->getFase() !== Fixture::GRAN_FINAL) return;
        $t = $this->torneos->buscar($p->getTorneoId());
        if ($t === null || $t->getTipo()?->getClave() !== 'eliminacion-doble') return;

        $existente = null;
        foreach ($this->partidos->delTorneo($t->getId()) as $x) if ($x->getFase() === Fixture::DESEMPATE) $existente = $x;
        $hace = $p->estaJugado() && $p->getResultado()->getGanadorEquipoId() === $p->getVisitanteId();

        if ($hace && $existente === null) {
            $fecha = $p->getFecha() ? date('Y-m-d H:i:s', strtotime($p->getFecha() . ' +1 hour')) : null;
            $nuevo = new Partido(null, $t->getId(), $p->getLocalId(), $p->getVisitanteId(), $fecha, $p->getUbicacion(),
                Fixture::DESEMPATE, null, $p->getJuezId());
            $this->partidos->crear($nuevo, $t->getOrganizadorId());
        } elseif (!$hace && $existente !== null) {
            if ($existente->estaJugado()) throw new ApiException('No se puede cambiar este resultado: el desempate de la final ya se jugó.');
            $this->partidos->eliminar((int)$existente->getId());
        }
    }

    private function auditarResultado(Partido $p, Partido $antes): void {
        $ahora = $p->estaJugado() ? $p->getResultado() : null;
        $previo = $antes->estaJugado() ? $antes->getResultado() : null;
        if ($ahora === null && $previo === null) return;
        if ($ahora !== null && $previo !== null && $ahora->igualMarcador($previo)) return;

        $local = $this->equipos->nombre($p->getLocalId());
        $visitante = $this->equipos->nombre($p->getVisitanteId());
        $texto = fn(Resultado $r) => $local . ' ' . Formato::marcador($r->getLocal()) . '-' . Formato::marcador($r->getVisitante()) . ' ' . $visitante;
        $torneo = "«{$this->torneos->nombre($p->getTorneoId())}» (#{$p->getTorneoId()}), partido #{$p->getId()}";
        if ($ahora === null) {
            $accion = 'Anuló un resultado';
            $detalle = "$torneo: se anuló " . $texto($previo) . '.';
        } elseif ($previo === null) {
            $accion = 'Registró un resultado';
            $detalle = "$torneo: " . $texto($ahora) . '.';
        } else {
            $accion = 'Modificó un resultado';
            $detalle = "$torneo: " . $texto($ahora) . ' (antes: ' . Formato::marcador($previo->getLocal()) . '-' . Formato::marcador($previo->getVisitante()) . ').';
        }
        Auditoria::actual(Auditoria::RESULTADO, $accion, $detalle);
    }

    private function textoResultado(Partido $p): string {
        $r = $p->getResultado();
        return $this->equipos->nombre($p->getLocalId()) . ' ' . Formato::marcador($r->getLocal()) . '-'
             . Formato::marcador($r->getVisitante()) . ' ' . $this->equipos->nombre($p->getVisitanteId())
             . ' en «' . $this->torneos->nombre($p->getTorneoId()) . '».';
    }

    private function avisarJuez(Partido $p, ?int $juezAntes): void {
        if ($p->getJuezId() === null || $p->getJuezId() === $juezAntes) return;
        $ci = $this->jueces->ciDeJuez($p->getJuezId());
        if ($ci === null) return;
        $this->avisos->enviar($ci, 'arbitraje', 'Te asignaron para arbitrar ' . $this->equipos->nombre($p->getLocalId()) . ' vs '
            . $this->equipos->nombre($p->getVisitanteId()) . ' (' . Formato::fechaCorta($p->getFecha()) . ') en «'
            . $this->torneos->nombre($p->getTorneoId()) . '».', $p->getTorneoId(), $p->getId());
    }
}
