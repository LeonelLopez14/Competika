<?php
require_once __DIR__ . '/../core/autoload.php';

/** Torneos, equipos, partidos y fixture. */
class TorneoController {
    private TorneoRepository $torneos;
    private EquipoRepository $equipos;
    private PartidoRepository $partidos;
    private UsuarioRepository $usuarios;
    private CatalogoRepository $catalogos;
    private PremioRepository $premios;
    private JuezRepository $jueces;
    private Notificador $avisos;
    private ?GestorPartidos $gestor = null;
    private ?GeneradorFixture $generador = null;

    public function __construct() {
        $this->torneos   = new TorneoRepository();
        $this->equipos   = new EquipoRepository();
        $this->partidos  = new PartidoRepository();
        $this->usuarios  = new UsuarioRepository();
        $this->catalogos = new CatalogoRepository();
        $this->premios   = new PremioRepository();
        $this->jueces    = new JuezRepository();
        $this->avisos    = new Notificador(null, $this->equipos, $this->torneos);
    }

    // =====================================================
    // Lectura
    // =====================================================

    public function listar(): array {
        $ci = Auth::ci();
        $lista = $this->torneos->listar($ci, null, $ci !== null && $this->esAdmin($ci));
        return ['success' => true, 'tournaments' => array_map(fn(Torneo $t) => $t->toResumen(), $lista)];
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
        $ci = Auth::ci();
        if ($t->estaOculto() && ($ci === null || !$this->puedeGestionar($t, $ci))) throw ApiException::noEncontrado('Torneo');
        $t->setEquipos($this->equipos->delTorneo($t->getId()));
        $t->setPartidos($this->partidos->delTorneo($t->getId()));
        $t->setPremios($this->premios->delTorneo($t->getId()));
        $t->setEsDelUsuario($ci !== null && $this->puedeGestionar($t, $ci));
        $pid = $ci !== null ? $this->usuarios->participanteId($ci) : null;
        $miEquipo = $pid !== null ? $this->equipos->equipoDelParticipante($t->getId(), $pid) : null;
        $t->setUsuarioInscripto($miEquipo !== null);
        $t->setEquipoDelUsuario($miEquipo);

        $d = $t->toDetalle();
        $d['following'] = $ci !== null && $this->torneos->sigue($ci, $t->getId());
        $d['followers'] = $this->torneos->cantidadSeguidores($t->getId());
        $d['eliminationMatches'] = array_map('strval', $this->partidos->idsEliminatorios($t->getId()));
        $paso = $this->generador()->proximoPaso($t);
        $d['fixture'] = ['action' => $paso['accion'], 'label' => $paso['label'], 'reason' => $paso['motivo'],
                         'byRounds' => Fixture::porRondas($t->getTipo()?->getClave())];
        $campeon = $this->generador()->campeon($t);
        $d['champion'] = $campeon !== null ? (string)$campeon : null;
        if ($t->getTipo()?->getClave() === 'vidas') {
            $vidas = $this->generador()->vidasRestantes($t);
            foreach ($d['teams'] as &$e) $e['livesLeft'] = $vidas[(int)$e['id']] ?? 0;
            unset($e);
        }
        return ['success' => true, 'tournament' => $d];
    }

    public function catalogos(): array {
        return [
            'success'    => true,
            'formats'    => array_map(fn(TipoTorneo $x) => $x->toArray(), $this->catalogos->tiposTorneo(true)),
            'currencies' => array_map(fn(Moneda $m) => $m->toArray(), $this->catalogos->monedas(true)),
        ];
    }

    /** Jueces aprobados, para elegir el juez principal o el de un partido. */
    public function jueces(): array {
        Auth::exigirLogin();
        return ['success' => true, 'judges' => $this->jueces->todos()];
    }

    // =====================================================
    // Torneos
    // =====================================================

    public function crear(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        $cuenta = $this->usuarios->buscar($ci);
        if ($cuenta === null) throw new ApiException('Necesitás iniciar sesión.', 401);

        $esAdmin = $this->esAdmin($ci);
        $organizadorId = $this->usuarios->organizadorId($ci);
        if ($organizadorId === null && !$esAdmin) {
            throw ApiException::prohibido('Para crear un torneo necesitás el rol de Organizador. Activalo en Configuración.');
        }

        $t = new Torneo(null, '', 0);
        $this->aplicarDatos($t, $d, false);
        $t->setEstado($esAdmin ? Torneo::PENDIENTE : Torneo::EN_REVISION);
        $this->aplicarConfiguracion($t, $d, false, $cuenta->comoPersona(), $ci);
        $premios = Premio::listaDesdeFormulario(is_array($d['prizes'] ?? null) ? $d['prizes'] : []);

        $id = $this->torneos->transaccion(function () use ($ci, $t, $premios, $organizadorId) {
            $t->setOrganizadorId($organizadorId ?? $this->usuarios->asegurarOrganizador($ci));
            $id = $this->torneos->crear($t);
            $this->premios->reemplazar($id, $premios);
            return $id;
        });
        Auditoria::registrar($ci, Auditoria::TORNEO, 'Creó un torneo', "«{$t->getNombre()}» (#{$id})." . ($t->estaEnRevision() ? ' Queda en revisión.' : ''));
        if ($t->estaEnRevision()) $this->avisos->torneoPorRevisar($id, $t->getNombre(), $this->usuarios->nombreCompleto($ci));
        return ['success' => true, 'id' => $id, 'status' => $t->estadoFront()];
    }

    public function actualizar(Request $req): array {
        $t = $this->exigirGestion($req->idQuery());
        $d = $req->json();
        $estadoAntes = $t->getEstado();
        if ($t->estaOculto()) unset($d['status']);
        $this->aplicarDatos($t, $d, true);
        $this->aplicarConfiguracion($t, $d, true, $t->getContactoCuenta(), $this->torneos->ciOrganizador($t->getId()));
        if ($t->getConfiguracion()->getCupo() < $this->equipos->cantidadEnTorneo($t->getId())) {
            throw new ApiException('El cupo no puede ser menor que la cantidad de equipos ya inscriptos.');
        }
        $this->torneos->transaccion(function () use ($t, $d) {
            $this->torneos->actualizar($t);
            if (is_array($d['prizes'] ?? null)) $this->premios->reemplazar($t->getId(), Premio::listaDesdeFormulario($d['prizes']));
        });
        Auditoria::actual(Auditoria::TORNEO, 'Editó un torneo', "«{$t->getNombre()}» (#{$t->getId()})."
            . ($t->getEstado() !== $estadoAntes ? " Estado: {$estadoAntes} → {$t->getEstado()}." : ''));
        if ($estadoAntes === Torneo::RECHAZADO && !$this->esAdmin(Auth::ci())) {
            $this->torneos->reenviarARevision($t->getId());
            Auditoria::actual(Auditoria::TORNEO, 'Reenvió un torneo a revisión', "«{$t->getNombre()}» (#{$t->getId()}).");
            $this->avisos->torneoPorRevisar($t->getId(), $t->getNombre(), $this->usuarios->nombreCompleto((string)Auth::ci()));
        }
        if ($t->getEstado() !== $estadoAntes && $t->getEstado() !== Torneo::PENDIENTE) $this->avisos->cambioDeEstado($t);
        return ['success' => true];
    }

    public function eliminar(Request $req): array {
        $t = $this->exigirGestion($req->idQuery());
        if ($this->torneos->tieneResultados($t->getId())) {
            throw new ApiException('Este torneo tiene resultados registrados y no se puede eliminar (los resultados son permanentes). Podés marcarlo como Finalizado.');
        }
        $inscriptos = $this->torneos->usuariosInscriptos($t->getId());
        $this->torneos->eliminar($t->getId());
        Auditoria::actual(Auditoria::TORNEO, 'Eliminó un torneo', "«{$t->getNombre()}» (#{$t->getId()}).");
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
        if ($this->torneos->ciOrganizador($t->getId()) === $ci) throw new ApiException('No podés inscribirte en un torneo que organizás.');

        $participanteId = $this->usuarios->participanteId($ci);
        if ($participanteId === null) {
            throw ApiException::prohibido('Para inscribirte necesitás el rol de Participante. Activalo en Configuración.');
        }
        if ($this->equipos->participanteInscripto($t->getId(), $participanteId)) {
            throw new ApiException('Ya estás inscripto en este torneo.');
        }
        if ($t->getConfiguracion()->esCompetitivo() && !$this->usuarios->tieneCarne($ci)) {
            throw new ApiException('Este torneo es competitivo: necesitás el carné de deportista vigente. Marcalo en Configuración.');
        }
        if ($this->equipos->cantidadEnTorneo($t->getId()) >= $t->getConfiguracion()->getCupo()) {
            throw new ApiException('El torneo está completo.');
        }

        $jugador = $this->usuarios->nombreCompleto($ci);
        $nombreEquipo = Validar::texto($d['teamName'] ?? null, 100) ?? mb_substr($jugador, 0, 100);
        $this->equipos->transaccion(function () use ($participanteId, $t, $nombreEquipo) {
            $this->equipos->crearEnTorneo(new Equipo(null, $nombreEquipo, 1), $t->getId(), $participanteId);
        });
        Auditoria::registrar($ci, Auditoria::INSCRIPCION, 'Se inscribió en un torneo', "«{$t->getNombre()}» (#{$t->getId()}) con el equipo «{$nombreEquipo}».");
        $this->avisos->inscripcion($t->getId(), $ci, $jugador, $nombreEquipo);
        return ['success' => true, 'message' => 'Inscripción realizada.'];
    }

    public function agregarEquipo(Request $req): array {
        $t = $this->exigirGestion($req->idQuery());
        $d = $req->json();
        $equipo = new Equipo(null, Equipo::validarNombre($d['name'] ?? null), Equipo::validarJugadores(max(1, (int)($d['players'] ?? 1))));
        if ($this->equipos->cantidadEnTorneo($t->getId()) >= $t->getConfiguracion()->getCupo()) {
            throw new ApiException('El torneo alcanzó el máximo de participantes.');
        }
        $id = $this->equipos->crearEnTorneo($equipo, $t->getId());
        Auditoria::actual(Auditoria::INSCRIPCION, 'Agregó un equipo', "«{$equipo->getNombre()}» en «{$t->getNombre()}» (#{$t->getId()}).");
        return ['success' => true, 'id' => $id];
    }

    public function actualizarEquipo(Request $req): array {
        $equipoId = $req->idQuery('team_id');
        $torneoId = $this->exigirEquipoGestionable($equipoId);
        $d = $req->json();
        $nombreAntes = $this->equipos->nombre($equipoId);
        $this->equipos->actualizar($equipoId,
            array_key_exists('name', $d) ? Equipo::validarNombre($d['name']) : null,
            array_key_exists('players', $d) ? Equipo::validarJugadores($d['players']) : null);
        Auditoria::actual(Auditoria::INSCRIPCION, 'Editó un equipo', "«{$nombreAntes}» → «{$this->equipos->nombre($equipoId)}» en «{$this->torneos->nombre($torneoId)}» (#{$torneoId}).");
        return ['success' => true];
    }

    public function eliminarEquipo(Request $req): array {
        $equipoId = $req->idQuery('team_id');
        $torneoId = $this->exigirEquipoGestionable($equipoId);
        if ($this->equipos->tieneResultadosEnTorneo($equipoId, $torneoId)) {
            throw new ApiException('El equipo tiene partidos con resultado registrado y no se puede eliminar.');
        }
        $usuarios = $this->equipos->usuarios($equipoId);
        $nombreEquipo = $this->equipos->nombre($equipoId);
        $this->equipos->quitarDeTorneo($equipoId, $torneoId);
        Auditoria::actual(Auditoria::INSCRIPCION, 'Dio de baja un equipo', "«{$nombreEquipo}» de «{$this->torneos->nombre($torneoId)}» (#{$torneoId}).");
        $this->avisos->baja($torneoId, $usuarios);
        return ['success' => true];
    }

    public function integrantesEquipo(Request $req): array {
        $equipoId = $req->idQuery('team_id');
        $torneoId = $this->exigirEquipoGestionable($equipoId);
        $capitan = $this->equipos->capitan($equipoId, $torneoId);
        return ['success' => true, 'members' => array_map(fn($m) => [
            'id' => hash('sha256', $m['ci'] . $equipoId),
            'name' => $m['nombre'],
            'captain' => $m['ci'] === $capitan,
        ], $this->equipos->integrantes($equipoId))];
    }

    public function quitarIntegrante(Request $req): array {
        $equipoId = $req->idQuery('team_id');
        $torneoId = $this->exigirEquipoGestionable($equipoId);
        if ($this->equipos->tieneResultadosEnTorneo($equipoId, $torneoId)) {
            throw new ApiException('El equipo tiene partidos con resultado registrado y no se puede modificar.');
        }
        $integrantes = $this->equipos->integrantes($equipoId);
        $capitan = $this->equipos->capitan($equipoId, $torneoId);
        foreach ($integrantes as $m) {
            if (!hash_equals(hash('sha256', $m['ci'] . $equipoId), (string)($req->json()['member'] ?? ''))) continue;
            if ($m['ci'] === $capitan) {
                throw new ApiException(count($integrantes) > 1
                    ? 'No se puede quitar al capitán mientras haya otros integrantes: dá de baja el equipo completo.'
                    : 'Es el único integrante: para sacarlo dá de baja el equipo.');
            }
            $equipo = $this->equipos->nombre($equipoId);
            $nombreTorneo = $this->torneos->nombre($torneoId);
            $this->equipos->quitarIntegrante($equipoId, (int)$this->usuarios->participanteId($m['ci']));
            Auditoria::actual(Auditoria::INSCRIPCION, 'Quitó a un integrante del equipo', "{$m['nombre']} de «{$equipo}» en «{$nombreTorneo}» (#{$torneoId}).");
            $this->avisos->enviar($m['ci'], 'baja', "El organizador te quitó del equipo «{$equipo}» en «{$nombreTorneo}».", $torneoId);
            return ['success' => true];
        }
        throw ApiException::noEncontrado('Integrante');
    }

    // =====================================================
    // Partidos y resultados
    // =====================================================

    public function agregarPartido(Request $req): array {
        $t = $this->exigirGestion($req->idQuery());
        $p = $this->partidoDesde($t, $req->json());
        $this->gestor()->crear($p, $t->getOrganizadorId());
        return ['success' => true, 'id' => $p->getId()];
    }

    public function actualizarPartido(Request $req): array {
        $id = $req->idQuery('match_id');
        $t = $this->exigirGestionDePartido($id);
        $d = $req->json();
        $antes = $this->partidos->buscar($id);
        $p = $this->partidoDesde($t, $d, $id, $antes);

        if ($t->getConfiguracion()->esCompetitivo() && !$this->esAdmin(Auth::ci())) {
            // En un torneo competitivo el marcador lo carga el juez del partido
            $jugado = !empty($d['played']);
            $r = $antes->getResultado();
            $cambia = $jugado !== $antes->estaJugado()
                || ($jugado && ((float)($d['homeScore'] ?? -1) != $r->getLocal() || (float)($d['awayScore'] ?? -1) != $r->getVisitante()));
            if ($cambia) throw ApiException::prohibido('En un torneo competitivo el resultado lo carga el juez del partido.');
            $p->setResultado($antes->getResultado());
        } else {
            $this->gestor()->aplicarMarcador($p, !empty($d['played']), $d['homeScore'] ?? null, $d['awayScore'] ?? null);
        }
        $this->gestor()->guardar($p, $antes);
        return ['success' => true];
    }

    public function eliminarPartido(Request $req): array {
        $id = $req->idQuery('match_id');
        $this->exigirGestionDePartido($id);
        if ($this->partidos->tuvoResultado($id)) {
            throw new ApiException('Este partido ya tuvo un resultado registrado y no se puede eliminar (los resultados son permanentes).');
        }
        $this->gestor()->eliminar($this->partidos->buscar($id));
        return ['success' => true];
    }

    /** Primer fixture, o la siguiente ronda en los formatos por rondas. */
    public function generarFixture(Request $req): array {
        $t = $this->exigirGestion($req->idQuery());
        $d = $req->json();
        $opc = [
            'inicio'  => Validar::fecha(Validar::texto($d['startDate'] ?? null, 10) ?? $this->proximaFecha($t)),
            'hora'    => Validar::hora(Validar::texto($d['time'] ?? null, 5)),
            'dias'    => Validar::enteroEntre($d['daysBetween'] ?? 7, 0, 60, 'Los días entre fechas deben estar entre 0 y 60.'),
            'minutos' => Validar::enteroEntre($d['minutesBetween'] ?? 60, 10, 600, 'Los minutos entre rondas deben estar entre 10 y 600.'),
            'lugar'   => Validar::texto($d['venue'] ?? null, 150) ?? $t->getDireccion(),
            'grupos'  => (int)($d['groups'] ?? 0),
            'etapas'  => (int)($d['stages'] ?? 3),
        ];
        $total = $this->generador()->generar($t, $opc);
        $this->avisos->fixture($t->getId(), $total);
        return ['success' => true, 'matches' => $total];
    }

    public function seguir(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        $id = (int)($d['torneoId'] ?? 0);
        $t = $this->torneos->buscar($id);
        if ($t === null || ($t->estaOculto() && !$this->puedeGestionar($t, $ci))) throw ApiException::noEncontrado('Torneo');
        $seguir = !empty($d['follow']);
        $this->torneos->seguir($ci, $id, $seguir);
        if ($seguir && !$this->usuarios->roles($ci)['observador']) $this->usuarios->crearObservador($ci);
        return ['success' => true, 'following' => $seguir, 'followers' => $this->torneos->cantidadSeguidores($id)];
    }

    // =====================================================
    // Auxiliares
    // =====================================================

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
            if ($tipo !== null && !$tipo->estaActivo() && $tipo->getId() !== $t->getTipo()?->getId()) {
                throw new ApiException('Ese formato no está habilitado.');
            }
            if ($parcial && $tipo?->getId() !== $t->getTipo()?->getId() && $this->partidos->cantidadDelTorneo((int)$t->getId()) > 0) {
                throw new ApiException('No se puede cambiar el formato de un torneo que ya tiene partidos.');
            }
            $t->setTipo($tipo);
        }
        if ($hay('startDate') || $hay('endDate')) {
            $t->setFechas(array_key_exists('startDate', $d) ? $d['startDate'] : $t->getFechaInicio(),
                          array_key_exists('endDate', $d) ? $d['endDate'] : $t->getFechaFin());
        }
        if (array_key_exists('status', $d)) $t->setEstadoFront((string)$d['status']);
    }

    /** $cuenta: datos de la cuenta del organizador; $ciOrganizador: no puede ser su propio juez. */
    private function aplicarConfiguracion(Torneo $t, array $d, bool $parcial, ?Persona $cuenta, ?string $ciOrganizador): void {
        $c = $t->getConfiguracion();
        if (!$parcial || array_key_exists('maxTeams', $d)) {
            $c->setCupo(Validar::enteroEntre($d['maxTeams'] ?? ConfiguracionTorneo::CUPO_POR_DEFECTO, 2, 1024,
                'La cantidad de participantes debe estar entre 2 y 1024.'));
        }
        if (!$parcial || array_key_exists('playersPerTeam', $d)) {
            $c->setJugadoresPorEquipo(Validar::enteroEntre($d['playersPerTeam'] ?? 1, 1, 50, 'Los jugadores por equipo deben estar entre 1 y 50.'));
        }
        if (array_key_exists('lives', $d)) $c->setVidas(Validar::enteroEntre($d['lives'], 1, 10, 'Las vidas deben estar entre 1 y 10.'));
        if (array_key_exists('groups', $d)) $c->setCantGrupos(($d['groups'] ?? '') === '' ? null : Validar::enteroEntre($d['groups'], 1, 16, 'Los grupos deben estar entre 1 y 16.'));

        $costos = is_array($d['costs'] ?? null) ? $d['costs'] : [];
        if (array_key_exists('entryFee', $costos))    $c->setPrecioInscripcion(Validar::dinero($costos['entryFee']));
        if (array_key_exists('fieldCost', $costos))   $c->setAlquilerLugar(Validar::dinero($costos['fieldCost']));
        if (array_key_exists('refereeCost', $costos)) $c->setPrecioJuez(Validar::dinero($costos['refereeCost']));
        if (array_key_exists('currency', $costos)) {
            $codigo = strtoupper(trim((string)$costos['currency']));
            $moneda = $codigo === '' ? null : $this->catalogos->monedaPorCodigo($codigo);
            if ($codigo !== '' && $moneda === null) throw new ApiException('Moneda inválida.');
            if ($moneda !== null && !$moneda->estaActiva() && $moneda->getCodigo() !== $c->getMoneda()?->getCodigo()) {
                throw new ApiException('Esa moneda no está habilitada.');
            }
            $c->setMoneda($moneda);
        }
        if (is_array($d['referee'] ?? null)) $c->setArbitro(Persona::desdeFormulario($d['referee'], 'del árbitro'));
        if (is_array($d['contact'] ?? null)) {
            $p = Persona::desdeFormulario($d['contact'], 'de contacto');
            $c->setContacto($p !== null && ($cuenta === null || !$p->igualA($cuenta)) ? $p : null);   // igual a la cuenta: no se duplica
        }

        if (!$parcial || array_key_exists('competitive', $d)) $c->setCompetitivo(!empty($d['competitive']));
        if (array_key_exists('mainJudge', $d)) $c->setJuezPrincipalId(($d['mainJudge'] ?? '') === '' ? null : (int)$d['mainJudge']);
        if ($c->esCompetitivo()) {
            $juez = $c->getJuezPrincipalId();
            if ($juez === null) throw new ApiException('Un torneo competitivo necesita un juez principal.');
            if (!$this->jueces->existe($juez)) throw new ApiException('El juez elegido no existe.');
            if ($ciOrganizador !== null && $this->jueces->ciDeJuez($juez) === $ciOrganizador) {
                throw new ApiException('El organizador no puede ser el juez de su propio torneo.');
            }
        }
    }

    /** Partido con los datos del formulario. En un torneo competitivo siempre tiene juez. */
    private function partidoDesde(Torneo $t, array $d, ?int $id = null, ?Partido $antes = null): Partido {
        $equipo = function ($raw) use ($t): ?int {
            if ($raw === null || $raw === '' || $raw === 'tbd') return null;
            if (!$this->equipos->estaEnTorneo((int)$raw, $t->getId())) throw new ApiException('Uno de los equipos no pertenece a este torneo.');
            return (int)$raw;
        };
        $hay = fn(string $k) => $antes === null || array_key_exists($k, $d);
        $local = $hay('home') ? $equipo($d['home'] ?? null) : $antes->getLocalId();
        $visitante = $hay('away') ? $equipo($d['away'] ?? null) : $antes->getVisitanteId();
        if ($local !== null && $local === $visitante) throw new ApiException('Local y visitante no pueden ser el mismo equipo.');
        $fecha = $hay('date') || $hay('time')
            ? Partido::fechaDesde(Validar::texto($d['date'] ?? null, 10), Validar::texto($d['time'] ?? null, 8))
            : $antes->getFecha();
        $lugar = $hay('venue') ? Validar::texto($d['venue'] ?? null, 150) : $antes->getUbicacion();
        $fase = $hay('phase') ? (Validar::texto($d['phase'] ?? null, 100) ?? Partido::FASE_POR_DEFECTO) : $antes->getFase();

        $juez = array_key_exists('judge', $d) ? (($d['judge'] ?? '') !== '' ? (int)$d['judge'] : null) : $antes?->getJuezId();
        if ($juez !== null && !$this->jueces->existe($juez)) throw new ApiException('El juez elegido no existe.');
        if ($t->getConfiguracion()->esCompetitivo()) {
            $juez ??= $t->getConfiguracion()->getJuezPrincipalId();
            if ($juez === null) throw new ApiException('En un torneo competitivo cada partido necesita un juez.');
        }
        return new Partido($id, $t->getId(), $local, $visitante, $fecha, $lugar, $fase, null, $juez);
    }

    /** Fecha para la siguiente ronda: una semana después del último partido (o la de inicio). */
    private function proximaFecha(Torneo $t): string {
        $ultima = null;
        foreach ($this->partidos->delTorneo($t->getId()) as $p) if ($p->getFecha() && $p->getFecha() > $ultima) $ultima = $p->getFecha();
        if ($ultima) return date('Y-m-d', strtotime(substr($ultima, 0, 10) . ' +7 days'));
        return $t->getFechaInicio() ?? date('Y-m-d');
    }

    private function gestor(): GestorPartidos {
        return $this->gestor ??= new GestorPartidos($this->partidos, $this->equipos, $this->torneos);
    }

    private function generador(): GeneradorFixture {
        return $this->generador ??= new GeneradorFixture($this->partidos, $this->equipos);
    }

    // ── Permisos ────────────────────────────────────────────
    private function esAdmin(?string $ci): bool {
        return $ci !== null && (new AdminRepository())->adminId($ci) !== null;
    }

    private function puedeGestionar(Torneo $t, string $ci): bool {
        return $this->usuarios->organizadorId($ci) === $t->getOrganizadorId() || $this->esAdmin($ci);
    }

    private function exigirGestion(int $id): Torneo {
        $ci = Auth::exigirLogin();
        $t = $this->torneos->buscar($id);
        if ($t === null) throw ApiException::noEncontrado('Torneo');
        if (!$this->puedeGestionar($t, $ci)) throw ApiException::prohibido('No tenés permiso sobre este torneo.');
        return $t;
    }

    private function exigirEquipoGestionable(int $equipoId): int {
        $torneoId = $this->equipos->torneoDe($equipoId);
        if ($torneoId === null) throw new ApiException('Equipo no encontrado o sin permiso.', 404);
        $this->exigirGestion($torneoId);
        return $torneoId;
    }

    private function exigirGestionDePartido(int $id): Torneo {
        $x = $this->partidos->torneoYOrganizador($id);
        if ($x === null) throw ApiException::noEncontrado('Partido');
        return $this->exigirGestion($x[0]);
    }
}
