<?php
require_once __DIR__ . '/../core/autoload.php';

/** Rol juez: solicitud, partidos asignados y carga de resultados. */
class JuezController {
    private JuezRepository $jueces;
    private PartidoRepository $partidos;

    public function __construct() {
        $this->jueces = new JuezRepository();
        $this->partidos = new PartidoRepository();
    }

    /** Estado del rol: si ya es juez y su última solicitud. */
    public function estado(): array {
        $ci = Auth::exigirLogin();
        return ['success' => true, 'isJudge' => $this->jueces->juezId($ci) !== null,
                'request' => $this->jueces->ultimaSolicitud($ci)?->toArray()];
    }

    public function solicitar(Request $req): array {
        $ci = Auth::exigirLogin();
        if ($this->jueces->juezId($ci) !== null) throw new ApiException('Ya tenés el rol de juez.');
        $ultima = $this->jueces->ultimaSolicitud($ci);
        if ($ultima !== null && $ultima->estaPendiente()) throw new ApiException('Ya tenés una solicitud pendiente de revisión.');

        $s = SolicitudJuez::desdeFormulario($ci, $req->json());
        $this->jueces->crearSolicitud($s);
        $avisos = new Notificador();
        $nombre = (new UsuarioRepository())->nombreCompleto($ci);
        foreach ((new AdminRepository())->cisAdmins() as $admin) {
            $avisos->enviar($admin, 'solicitud_juez', "{$nombre} pidió el rol de juez. Revisalo en Administración.");
        }
        return ['success' => true, 'request' => $this->jueces->ultimaSolicitud($ci)->toArray()];
    }

    private function juezActual(): int {
        $id = $this->jueces->juezId(Auth::exigirLogin());
        if ($id === null) throw ApiException::prohibido('Esta sección es solo para jueces.');
        return $id;
    }

    /** Partidos asignados al juez logueado, con nombres de equipos y torneo. */
    public function misPartidos(): array {
        $equipos = new EquipoRepository();
        $torneos = new TorneoRepository();
        $nombres = [];
        $lista = array_map(function (Partido $p) use ($equipos, $torneos, &$nombres) {
            $tid = $p->getTorneoId();
            $nombres[$tid] ??= $torneos->nombre($tid);
            return $p->toArray() + [
                'tournamentId' => $tid, 'tournament' => $nombres[$tid],
                'homeName' => $p->getLocalId() !== null ? $equipos->nombre($p->getLocalId()) : 'Por definir',
                'awayName' => $p->getVisitanteId() !== null ? $equipos->nombre($p->getVisitanteId()) : 'Por definir',
            ];
        }, $this->partidos->delJuez($this->juezActual()));
        return ['success' => true, 'matches' => $lista];
    }

    public function cargarResultado(Request $req): array {
        $juez = $this->juezActual();
        $d = $req->json();
        $antes = $this->partidos->buscar((int)($d['matchId'] ?? 0));
        if ($antes === null) throw ApiException::noEncontrado('Partido');
        $principal = (new TorneoRepository())->buscar($antes->getTorneoId())?->getConfiguracion()->getJuezPrincipalId();
        if ($antes->getJuezId() !== $juez && $principal !== $juez) throw ApiException::prohibido('Ese partido no está asignado a vos.');

        $p = $this->partidos->buscar($antes->getId());                    // copia a modificar
        $gestor = new GestorPartidos($this->partidos);
        $gestor->aplicarMarcador($p, true, $d['homeScore'] ?? null, $d['awayScore'] ?? null);
        $gestor->guardar($p, $antes);
        return ['success' => true];
    }
}
