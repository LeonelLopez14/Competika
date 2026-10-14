<?php
require_once __DIR__ . '/../core/autoload.php';

/**
 * Controlador de torneos (api/tournaments.php).
 * Recibe la petición, valida permisos y datos, usa los repositorios para
 * leer/guardar y devuelve arreglos listos para JSON. No contiene SQL.
 */
class TorneoController {
    private TorneoRepository $torneos;
    private EquipoRepository $equipos;
    private PartidoRepository $partidos;
    private UsuarioRepository $usuarios;
    private CatalogoRepository $catalogos;
    private Notificador $avisos;

    public function __construct() {
        $this->torneos   = new TorneoRepository();
        $this->equipos   = new EquipoRepository();
        $this->partidos  = new PartidoRepository();
        $this->usuarios  = new UsuarioRepository();
        $this->catalogos = new CatalogoRepository();
        $this->avisos    = new Notificador(null, $this->equipos, $this->torneos);
    }

    // =====================================================
    // Lectura (pública)
    // =====================================================

    public function listar(): array {
        return ['success' => true, 'tournaments' => array_map(fn(Torneo $t) => $t->toResumen(), $this->torneos->listar(Auth::ci()))];
    }

    public function mios(): array {
        $ci = Auth::exigirLogin();
        $org = $this->usuarios->organizadorId($ci);
        $lista = $org === null ? [] : $this->torneos->listar($ci, $org);
        return ['success' => true, 'tournaments' => array_map(fn(Torneo $t) => $t->toResumen(), $lista)];
    }

    public function ver(Request $req): array {
        $t = $this->torneos->buscar($req->idQuery());
        if ($t === null) throw ApiException::noEncontrado('Torneo');
        $t->setEquipos($this->equipos->delTorneo($t->getId()));
        $t->setPartidos($this->partidos->delTorneo($t->getId()));
        $ci = Auth::ci();
        $t->setEsDelUsuario($ci !== null && $this->usuarios->organizadorId($ci) === $t->getOrganizadorId());
        $pid = $ci !== null ? $this->usuarios->participanteId($ci) : null;
        $t->setUsuarioInscripto($pid !== null && $this->equipos->participanteInscripto($t->getId(), $pid));
        $t->setEquipoDelUsuario($pid !== null ? $this->equipos->equipoDelParticipante($t->getId(), $pid) : null);
        return ['success' => true, 'tournament' => $t->toDetalle()];
    }

    /** Formatos y monedas habilitados (para armar los selects del formulario). */
    public function catalogos(): array {
        return [
            'success'    => true,
            'formats'    => array_map(fn(TipoTorneo $x) => $x->toArray(), $this->catalogos->tiposTorneo()),
            'currencies' => array_map(fn(Moneda $m) => $m->toArray(), $this->catalogos->monedas()),
        ];
    }

    // =====================================================
    // Torneos
    // =====================================================

    public function crear(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        $cuenta = $this->usuarios->buscar($ci);
        if ($cuenta === null) throw new ApiException('Necesitás iniciar sesión.', 401);

        $t = new Torneo(null, '', 0);
        $this->aplicarDatos($t, $d, false);
        $this->aplicarConfiguracion($t, $d, false, $cuenta->comoPersona());

        $id = $this->torneos->transaccion(function () use ($ci, $t) {
            // Crear un torneo otorga el rol organizador si la cuenta no lo tenía
            $t->setOrganizadorId($this->usuarios->asegurarOrganizador($ci));
            return $this->torneos->crear($t);
        });
        return ['success' => true, 'id' => $id];
    }

    public function actualizar(Request $req): array {
        $t = $this->exigirTorneoPropio($req->idQuery());
        $d = $req->json();
        $estadoAntes = $t->getEstado();

        // El dashboard puede mandar los premios por puesto: se guardan como texto
        if (isset($d['prizes']) && is_array($d['prizes']) && !array_key_exists('prizesText', $d)) {
            $lineas = [];
            foreach (array_slice($d['prizes'], 0, 3) as $p) {
                $titulo = trim((string)($p['title'] ?? ''));
                $detalle = trim((string)($p['detail'] ?? ''));
                if ($titulo !== '') $lineas[] = (int)($p['place'] ?? 0) . '° ' . $titulo . ($detalle !== '' ? ": $detalle" : '');
            }
            $d['prizesText'] = implode("\n", $lineas);
        }

        $this->aplicarDatos($t, $d, true);
        $this->aplicarConfiguracion($t, $d, true, $t->getContactoCuenta());
        if ($t->getConfiguracion()->getCupo() < $this->equipos->cantidadEnTorneo($t->getId())) {
            throw new ApiException('El cupo no puede ser menor que la cantidad de equipos ya inscriptos.');
        }
        $this->torneos->actualizar($t);

        if ($t->getEstado() !== $estadoAntes && $t->getEstado() !== Torneo::PENDIENTE) {
            $this->avisos->cambioDeEstado($t);
        }
        return ['success' => true];
    }

    public function eliminar(Request $req): array {
        $t = $this->exigirTorneoPropio($req->idQuery());
        if ($this->torneos->tieneResultados($t->getId())) {
            throw new ApiException('Este torneo tiene resultados registrados y no se puede eliminar (los resultados son permanentes). Podés marcarlo como Finalizado.');
        }
        $inscriptos = $this->torneos->usuariosInscriptos($t->getId());
        $this->torneos->eliminar($t->getId());
        $this->avisos->torneoCancelado($t->getNombre(), $inscriptos);
        return ['success' => true];
    }

    // =====================================================
    // Equipos e inscripción
    // =====================================================

    public function inscribirse(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        $t = $this->torneos->buscar((int)($d['torneoId'] ?? 0));
        if ($t === null) throw ApiException::noEncontrado('Torneo');
        if (!$t->aceptaInscripciones()) throw new ApiException('Las inscripciones de este torneo están cerradas.');

        $participanteId = $this->usuarios->participanteId($ci);
        if ($participanteId !== null && $this->equipos->participanteInscripto($t->getId(), $participanteId)) {
            throw new ApiException('Ya estás inscripto en este torneo.');
        }
        if ($this->equipos->cantidadEnTorneo($t->getId()) >= $t->getConfiguracion()->getCupo()) {
            throw new ApiException('El torneo está completo.');
        }

        $jugador = $this->usuarios->nombreCompleto($ci);
        $nombreEquipo = Validar::texto($d['teamName'] ?? null, 100) ?? mb_substr($jugador, 0, 100);
        $this->equipos->transaccion(function () use ($ci, $t, $nombreEquipo) {
            $pid = $this->usuarios->asegurarParticipante($ci);
            $this->equipos->crearEnTorneo(new Equipo(null, $nombreEquipo, 1), $t->getId(), $pid);
        });
        $this->avisos->inscripcion($t->getId(), $ci, $jugador, $nombreEquipo);
        return ['success' => true, 'message' => 'Inscripción realizada.'];
    }

    public function agregarEquipo(Request $req): array {
        $t = $this->exigirTorneoPropio($req->idQuery());
        $d = $req->json();
        $equipo = new Equipo(null, Equipo::validarNombre($d['name'] ?? null), Equipo::validarJugadores(max(1, (int)($d['players'] ?? 1))));
        if ($this->equipos->cantidadEnTorneo($t->getId()) >= $t->getConfiguracion()->getCupo()) {
            throw new ApiException('El torneo alcanzó el máximo de participantes.');
        }
        return ['success' => true, 'id' => $this->equipos->crearEnTorneo($equipo, $t->getId())];
    }

    public function actualizarEquipo(Request $req): array {
        $equipoId = $req->idQuery('team_id');
        $this->exigirEquipoPropio($equipoId);
        $d = $req->json();
        $this->equipos->actualizar($equipoId,
            array_key_exists('name', $d) ? Equipo::validarNombre($d['name']) : null,
            array_key_exists('players', $d) ? Equipo::validarJugadores($d['players']) : null);
        return ['success' => true];
    }

    public function eliminarEquipo(Request $req): array {
        $equipoId = $req->idQuery('team_id');
        $torneoId = $this->exigirEquipoPropio($equipoId);
        if ($this->equipos->tieneResultadosEnTorneo($equipoId, $torneoId)) {
            throw new ApiException('El equipo tiene partidos con resultado registrado y no se puede eliminar.');
        }
        $usuarios = $this->equipos->usuarios($equipoId);
        $this->equipos->quitarDeTorneo($equipoId, $torneoId);
        $this->avisos->baja($torneoId, $usuarios);
        return ['success' => true];
    }

    // =====================================================
    // Partidos y resultados
    // =====================================================

    public function agregarPartido(Request $req): array {
        $t = $this->exigirTorneoPropio($req->idQuery());
        $p = $this->partidoDesde($t->getId(), $req->json());
        $this->partidos->crear($p, $t->getOrganizadorId());
        $this->avisos->partido($p, 'Nuevo partido');
        return ['success' => true, 'id' => $p->getId()];
    }

    public function actualizarPartido(Request $req): array {
        $id = $req->idQuery('match_id');
        $torneoId = $this->exigirPartidoPropio($id);
        $d = $req->json();
        $antes = $this->partidos->buscar($id);
        $p = $this->partidoDesde($torneoId, $d, $id);

        $jugado = !empty($d['played']);
        if ($jugado) {
            if ($p->getLocalId() === null || $p->getVisitanteId() === null) {
                throw new ApiException('Para cargar un resultado, el partido necesita los dos equipos.');
            }
            $hs = ($d['homeScore'] ?? '') !== '' ? (float)$d['homeScore'] : null;
            $as = ($d['awayScore'] ?? '') !== '' ? (float)$d['awayScore'] : null;
            if ($hs === null || $as === null) throw new ApiException('Ingresá el marcador de ambos equipos.');
            $p->setResultado(Resultado::jugado($p->getLocalId(), $p->getVisitanteId(), $hs, $as));
        }

        $this->partidos->transaccion(function () use ($p, $torneoId) {
            $this->partidos->actualizar($p);
            $this->recalcularPosiciones($torneoId);
        });

        if ($jugado && !$p->getResultado()->igualMarcador($antes->getResultado())) {
            $this->avisos->resultado($p);
        } elseif (!$jugado && !$p->mismosDatos($antes)) {
            $this->avisos->partido($p, 'Partido actualizado');
        }
        return ['success' => true];
    }

    public function eliminarPartido(Request $req): array {
        $id = $req->idQuery('match_id');
        $torneoId = $this->exigirPartidoPropio($id);
        if ($this->partidos->tuvoResultado($id)) {
            throw new ApiException('Este partido ya tuvo un resultado registrado y no se puede eliminar (los resultados son permanentes).');
        }
        $p = $this->partidos->buscar($id);
        $this->partidos->transaccion(function () use ($id, $torneoId) {
            $this->partidos->eliminar($id);
            $this->recalcularPosiciones($torneoId);
        });
        $this->avisos->partidoCancelado($p);
        return ['success' => true];
    }

    // =====================================================
    // Auxiliares
    // =====================================================

    /** Copia al torneo los campos del formulario (todos, o solo los que vinieron si $parcial). */
    private function aplicarDatos(Torneo $t, array $d, bool $parcial): void {
        $hay = fn(string $k) => !$parcial || array_key_exists($k, $d);
        if ($hay('name'))        $t->setNombre($d['name'] ?? null);
        if ($hay('description')) $t->setDescripcion($d['description'] ?? null);
        if ($hay('sport'))       $t->setDeporte($d['sport'] ?? null);
        if ($hay('venue'))       $t->setDireccion($d['venue'] ?? null);
        if ($hay('department'))  $t->setDepartamento($d['department'] ?? null);
        if ($hay('formatSubId')) {
            $clave = Validar::texto($d['formatSubId'] ?? null, 50);
            $tipo = $clave === null ? null : $this->catalogos->tipoPorClave($clave);
            if ($clave !== null && $tipo === null) throw new ApiException('Formato de torneo inválido.');
            $t->setTipo($tipo);
        }
        if ($hay('startDate') || $hay('endDate')) {
            $t->setFechas(array_key_exists('startDate', $d) ? $d['startDate'] : $t->getFechaInicio(),
                          array_key_exists('endDate', $d) ? $d['endDate'] : $t->getFechaFin());
        }
        if (array_key_exists('status', $d)) $t->setEstadoFront((string)$d['status']);
    }

    /** Cupo, costos, moneda, premios, árbitro y contacto. $cuenta = datos de la cuenta del organizador. */
    private function aplicarConfiguracion(Torneo $t, array $d, bool $parcial, ?Persona $cuenta): void {
        $c = $t->getConfiguracion();
        if (!$parcial || array_key_exists('maxTeams', $d)) {
            $c->setCupo(Validar::enteroEntre($d['maxTeams'] ?? ConfiguracionTorneo::CUPO_POR_DEFECTO, 2, 1024,
                'La cantidad de participantes debe estar entre 2 y 1024.'));
        }
        $costos = is_array($d['costs'] ?? null) ? $d['costs'] : [];
        if (array_key_exists('entryFee', $costos))    $c->setPrecioInscripcion(Validar::dinero($costos['entryFee']));
        if (array_key_exists('fieldCost', $costos))   $c->setAlquilerLugar(Validar::dinero($costos['fieldCost']));
        if (array_key_exists('refereeCost', $costos)) $c->setPrecioJuez(Validar::dinero($costos['refereeCost']));
        if (array_key_exists('currency', $costos)) {
            $codigo = strtoupper(trim((string)$costos['currency']));
            $moneda = $codigo === '' ? null : $this->catalogos->monedaPorCodigo($codigo);
            if ($codigo !== '' && $moneda === null) throw new ApiException('Moneda inválida.');
            $c->setMoneda($moneda);
        }
        if (array_key_exists('prizesText', $d)) $c->setPremios(Validar::texto($d['prizesText'], 255));
        if (is_array($d['referee'] ?? null)) $c->setArbitro(Persona::desdeFormulario($d['referee'], 'del árbitro'));
        if (is_array($d['contact'] ?? null)) {
            $p = Persona::desdeFormulario($d['contact'], 'de contacto');
            // Si coincide con la cuenta no se guarda: el torneo usa los datos de la cuenta (sin duplicarlos)
            $c->setContacto($p !== null && ($cuenta === null || !$p->igualA($cuenta)) ? $p : null);
        }
    }

    /** Arma un Partido con lo que mandó el formulario (equipos validados contra el torneo). */
    private function partidoDesde(int $torneoId, array $d, ?int $id = null): Partido {
        $equipo = function ($raw) use ($torneoId): ?int {
            if ($raw === null || $raw === '' || $raw === 'tbd') return null;
            if (!$this->equipos->estaEnTorneo((int)$raw, $torneoId)) throw new ApiException('Uno de los equipos no pertenece a este torneo.');
            return (int)$raw;
        };
        $local = $equipo($d['home'] ?? null);
        $visitante = $equipo($d['away'] ?? null);
        if ($local !== null && $local === $visitante) throw new ApiException('Local y visitante no pueden ser el mismo equipo.');
        $fecha = Partido::fechaDesde(Validar::texto($d['date'] ?? null, 10), Validar::texto($d['time'] ?? null, 8));
        return new Partido($id, $torneoId, $local, $visitante, $fecha, Validar::texto($d['venue'] ?? null, 150),
            Validar::texto($d['phase'] ?? null, 100) ?? Partido::FASE_POR_DEFECTO);
    }

    private function recalcularPosiciones(int $torneoId): void {
        $stats = TablaPosiciones::calcular($this->equipos->idsDelTorneo($torneoId), $this->partidos->jugadosDelTorneo($torneoId));
        $this->equipos->guardarEstadisticas($torneoId, $stats);
    }

    // ── Permisos: solo el organizador del torneo puede modificarlo ──
    private function organizadorActual(): int {
        $org = $this->usuarios->organizadorId(Auth::exigirLogin());
        if ($org === null) throw ApiException::prohibido('No tenés permiso: no organizás este torneo.');
        return $org;
    }

    private function exigirTorneoPropio(int $id): Torneo {
        $org = $this->organizadorActual();
        $t = $this->torneos->buscar($id);
        if ($t === null) throw ApiException::noEncontrado('Torneo');
        if ($t->getOrganizadorId() !== $org) throw ApiException::prohibido('No tenés permiso sobre este torneo.');
        return $t;
    }

    private function exigirEquipoPropio(int $equipoId): int {
        $torneoId = $this->equipos->torneoDelOrganizador($equipoId, $this->organizadorActual());
        if ($torneoId === null) throw new ApiException('Equipo no encontrado o sin permiso.', 404);
        return $torneoId;
    }

    private function exigirPartidoPropio(int $id): int {
        $org = $this->organizadorActual();
        $x = $this->partidos->torneoYOrganizador($id);
        if ($x === null) throw ApiException::noEncontrado('Partido');
        if ($x[1] !== $org) throw ApiException::prohibido('No tenés permiso sobre este partido.');
        return $x[0];
    }
}
