<?php
require_once __DIR__ . '/../core/autoload.php';

/** Equipos de varios integrantes e invitaciones. */
class EquipoController {
    private EquipoRepository $equipos;
    private TorneoRepository $torneos;
    private UsuarioRepository $usuarios;
    private InvitacionRepository $invitaciones;
    private SolicitudEquipoRepository $solicitudes;
    private Notificador $avisos;
    private ActividadRepository $actividad;

    public function __construct() {
        $this->equipos = new EquipoRepository();
        $this->torneos = new TorneoRepository();
        $this->usuarios = new UsuarioRepository();
        $this->invitaciones = new InvitacionRepository();
        $this->solicitudes = new SolicitudEquipoRepository();
        $this->actividad = new ActividadRepository();
        $this->avisos = new Notificador(null, $this->equipos, $this->torneos);
    }

    /** Mi equipo en el torneo (integrantes, invitaciones) y las invitaciones que recibí para ese torneo. */
    public function miEquipo(Request $req): array {
        $ci = Auth::exigirLogin();
        $t = $this->torneo($req->idQuery());
        $equipoId = $this->equipoDe($ci, $t->getId());
        $recibidas = array_values(array_filter($this->invitaciones->pendientesPara($ci), fn($i) => $i['tournamentId'] === $t->getId()));
        if ($equipoId === null) {
            $max = $t->getConfiguracion()->getJugadoresPorEquipo();
            return ['success' => true, 'team' => null, 'invitations' => $recibidas,
                    'canJoin' => $max > 1 && $t->aceptaInscripciones() && $this->usuarios->participanteId($ci) !== null,
                    'myRequests' => array_map(fn($s) => ['id' => $s['id'], 'teamId' => $s['teamId'], 'team' => $s['team']],
                                              $this->solicitudes->pendientesDe($ci, $t->getId()))];
        }

        $capitan = $this->equipos->capitan($equipoId, $t->getId());
        return ['success' => true, 'invitations' => $recibidas, 'team' => [
            'id'         => (string)$equipoId,
            'isCaptain'  => $capitan === $ci,
            'max'        => $t->getConfiguracion()->getJugadoresPorEquipo(),
            'open'       => $this->equipos->estaAbierto($equipoId),
            'requests'   => $capitan === $ci ? array_map(fn($s) => ['id' => $s['id'], 'name' => $s['name'], 'email' => $s['email']],
                                                         $this->solicitudes->pendientesDeEquipo($equipoId)) : [],
            'members'    => array_map(fn($m) => ['name' => $m['nombre'], 'me' => $m['ci'] === $ci,
                                                 'captain' => $m['ci'] === $capitan, 'carne' => $m['carne'],
                                                 'key' => hash('sha256', $m['ci'] . $equipoId)], $this->equipos->integrantes($equipoId)),
            'pending'    => $capitan === $ci ? array_map(fn($i) => ['id' => $i['id'], 'name' => $i['invited'], 'email' => $i['invitedEmail']],
                                                         $this->invitaciones->pendientesDeEquipo($equipoId)) : [],
        ]];
    }

    /** Invitaciones pendientes que recibí (todas). */
    public function misInvitaciones(): array {
        return ['success' => true, 'invitations' => $this->invitaciones->pendientesPara(Auth::exigirLogin())];
    }

    public function invitar(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        $t = $this->torneo((int)($d['torneoId'] ?? 0));
        $equipoId = $this->equipoDeCapitan($ci, $t);
        if ($t->getEstado() === Torneo::FINALIZADO) throw new ApiException('El torneo ya terminó.');

        $email = mb_strtolower(trim((string)($d['email'] ?? '')));
        $invitado = filter_var($email, FILTER_VALIDATE_EMAIL) ? $this->usuarios->obtenerPorEmail($email) : null;
        if ($invitado === null) throw new ApiException('No hay ninguna cuenta con ese correo. Pedile que se registre primero.');
        if ($invitado['ci'] === $ci) throw new ApiException('Ya sos parte del equipo.');
        if ($this->usuarios->participanteId($invitado['ci']) === null) throw new ApiException('Esa persona no tiene el rol de Participante activado.');
        if ($this->equipoDe($invitado['ci'], $t->getId()) !== null) throw new ApiException('Esa persona ya juega en un equipo de este torneo.');
        if ($this->invitaciones->hayPendiente($equipoId, $invitado['ci'])) throw new ApiException('Ya le mandaste una invitación.');
        $ocupados = count($this->equipos->integrantes($equipoId)) + count($this->invitaciones->pendientesDeEquipo($equipoId));
        if ($ocupados >= $t->getConfiguracion()->getJugadoresPorEquipo()) {
            throw new ApiException('El equipo ya está completo (máximo ' . $t->getConfiguracion()->getJugadoresPorEquipo() . ' jugadores, contando invitaciones pendientes).');
        }

        $this->invitaciones->crear($equipoId, $t->getId(), $invitado['ci'], $ci);
        Auditoria::registrar($ci, Auditoria::INSCRIPCION, 'Invitó a un jugador a su equipo', $this->usuarios->nombreCompleto($invitado['ci']) . " al equipo «{$this->equipos->nombre($equipoId)}» en «{$t->getNombre()}» (#{$t->getId()}).");
        $this->avisos->enviar($invitado['ci'], 'invitacion', $this->usuarios->nombreCompleto($ci) . ' te invitó al equipo «'
            . $this->equipos->nombre($equipoId) . "» en «{$t->getNombre()}».", $t->getId());
        return ['success' => true];
    }

    public function responder(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        $inv = $this->invitaciones->buscar((int)($d['id'] ?? 0));
        if ($inv === null || $inv['invitedCi'] !== $ci || $inv['status'] !== 'pendiente') throw ApiException::noEncontrado('Invitación');
        $t = $this->torneo($inv['tournamentId']);
        $equipoId = (int)$inv['teamId'];

        if (empty($d['accept'])) {
            $this->invitaciones->cambiarEstado($inv['id'], 'rechazada');
            $capitan = $this->equipos->capitan($equipoId, $t->getId());
            if ($capitan) $this->avisos->enviar($capitan, 'invitacion', $this->usuarios->nombreCompleto($ci) . " no aceptó sumarse a «{$inv['team']}».", $t->getId());
            return ['success' => true];
        }
        if ($t->getEstado() === Torneo::FINALIZADO) throw new ApiException('El torneo ya terminó.');
        $pid = $this->usuarios->participanteId($ci);
        if ($pid === null) throw ApiException::prohibido('Para aceptar la invitación necesitás el rol de Participante. Activalo en Configuración.');
        if ($this->equipoDe($ci, $t->getId()) !== null) throw new ApiException('Ya jugás en un equipo de este torneo.');
        if (count($this->equipos->integrantes($equipoId)) >= $t->getConfiguracion()->getJugadoresPorEquipo()) {
            throw new ApiException('El equipo ya está completo.');
        }
        if ($t->getConfiguracion()->esCompetitivo() && !$this->usuarios->tieneCarne($ci)) {
            throw new ApiException('Este torneo es competitivo: necesitás el carné de deportista vigente. Marcalo en Configuración.');
        }

        $this->equipos->transaccion(function () use ($ci, $equipoId, $inv, $t, $pid) {
            $this->equipos->agregarIntegrante($equipoId, $pid);
            $this->invitaciones->cambiarEstado($inv['id'], 'aceptada');
            $this->invitaciones->cancelarOtras($ci, $t->getId(), $inv['id']);
            $this->solicitudes->cancelarOtras($ci, $t->getId(), 0);
        });
        Auditoria::registrar($ci, Auditoria::INSCRIPCION, 'Aceptó una invitación y se sumó a un equipo', "«{$inv['team']}» en «{$t->getNombre()}» (#{$t->getId()}).");
        $capitan = $this->equipos->capitan($equipoId, $t->getId());
        if ($capitan) $this->avisos->enviar($capitan, 'invitacion', $this->usuarios->nombreCompleto($ci) . " se sumó a «{$inv['team']}».", $t->getId());
        return ['success' => true];
    }

    public function cancelarInvitacion(Request $req): array {
        $ci = Auth::exigirLogin();
        $inv = $this->invitaciones->buscar((int)($req->json()['id'] ?? 0));
        if ($inv === null || $inv['status'] !== 'pendiente') throw ApiException::noEncontrado('Invitación');
        $this->equipoDeCapitan($ci, $this->torneo($inv['tournamentId']));
        $this->invitaciones->cambiarEstado($inv['id'], 'cancelada');
        return ['success' => true];
    }

    /** El capitán quita a un integrante (identificado por la clave que devuelve miEquipo). */
    public function quitar(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        $t = $this->torneo((int)($d['torneoId'] ?? 0));
        $equipoId = $this->equipoDeCapitan($ci, $t);
        foreach ($this->equipos->integrantes($equipoId) as $m) {
            if (hash_equals(hash('sha256', $m['ci'] . $equipoId), (string)($d['member'] ?? ''))) {
                if ($m['ci'] === $ci) throw new ApiException('El capitán no puede quitarse a sí mismo.');
                $this->equipos->quitarIntegrante($equipoId, (int)$this->usuarios->participanteId($m['ci']));
                Auditoria::registrar($ci, Auditoria::INSCRIPCION, 'Quitó a un integrante del equipo', "{$m['nombre']} de «{$this->equipos->nombre($equipoId)}» en «{$t->getNombre()}» (#{$t->getId()}).");
                $this->avisos->enviar($m['ci'], 'baja', "Te quitaron del equipo «{$this->equipos->nombre($equipoId)}» en «{$t->getNombre()}».", $t->getId());
                return ['success' => true];
            }
        }
        throw ApiException::noEncontrado('Integrante');
    }

    /** Un integrante (no el capitán) deja el equipo. */
    public function salir(Request $req): array {
        $ci = Auth::exigirLogin();
        $t = $this->torneo((int)($req->json()['torneoId'] ?? 0));
        $equipoId = $this->equipoDe($ci, $t->getId());
        if ($equipoId === null) throw new ApiException('No estás en ningún equipo de este torneo.');
        $capitan = $this->equipos->capitan($equipoId, $t->getId());
        if ($capitan === $ci) throw new ApiException('Sos el capitán: para dejar el torneo pedile al organizador que dé de baja al equipo.');
        $this->equipos->quitarIntegrante($equipoId, (int)$this->usuarios->participanteId($ci));
        Auditoria::registrar($ci, Auditoria::INSCRIPCION, 'Dejó un equipo', "«{$this->equipos->nombre($equipoId)}» en «{$t->getNombre()}» (#{$t->getId()}).");
        if ($capitan) $this->avisos->enviar($capitan, 'baja', $this->usuarios->nombreCompleto($ci) . " dejó el equipo «{$this->equipos->nombre($equipoId)}».", $t->getId());
        return ['success' => true];
    }


    public function abiertos(Request $req): array {
        Auth::exigirLogin();
        $t = $this->torneo($req->idQuery());
        $max = $t->getConfiguracion()->getJugadoresPorEquipo();
        return ['success' => true, 'teams' => $max > 1 ? $this->equipos->abiertosDelTorneo($t->getId(), $max) : []];
    }

    public function abrir(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        $t = $this->torneo((int)($d['torneoId'] ?? 0));
        $equipoId = $this->equipoDeCapitan($ci, $t);
        if ($t->getConfiguracion()->getJugadoresPorEquipo() < 2) throw new ApiException('Este torneo es individual: no hay equipos para abrir.');
        if ($t->getEstado() === Torneo::FINALIZADO) throw new ApiException('El torneo ya terminó.');
        $abrir = !empty($d['open']);
        $this->equipos->marcarAbierto($equipoId, $abrir);
        if (!$abrir) $this->solicitudes->cancelarDeEquipo($equipoId);
        Auditoria::registrar($ci, Auditoria::INSCRIPCION, $abrir ? 'Abrió su equipo a nuevos jugadores' : 'Cerró su equipo a nuevos jugadores', "«{$this->equipos->nombre($equipoId)}» en «{$t->getNombre()}» (#{$t->getId()}).");
        return ['success' => true, 'open' => $abrir];
    }

    public function solicitar(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        $t = $this->torneo((int)($d['torneoId'] ?? 0));
        $equipoId = (int)($d['teamId'] ?? 0);
        if ($this->usuarios->participanteId($ci) === null) {
            throw ApiException::prohibido('Para pedir unirte a un equipo necesitás el rol de Participante. Activalo en Configuración.');
        }
        if (!$t->aceptaInscripciones()) throw new ApiException('Este torneo ya no acepta inscripciones.');
        if ($this->equipoDe($ci, $t->getId()) !== null) throw new ApiException('Ya jugás en un equipo de este torneo.');
        $max = $t->getConfiguracion()->getJugadoresPorEquipo();
        if ($equipoId <= 0 || !$this->equipos->estaEnTorneo($equipoId, $t->getId()) || !$this->equipos->estaAbierto($equipoId)) {
            throw new ApiException('Ese equipo no está abierto a nuevos jugadores.');
        }
        if ($this->solicitudes->hayPendiente($equipoId, $ci)) throw new ApiException('Ya le mandaste una solicitud a ese equipo.');
        if (count($this->equipos->integrantes($equipoId)) >= $max) throw new ApiException('El equipo ya está completo.');
        if ($t->getConfiguracion()->esCompetitivo() && !$this->usuarios->tieneCarne($ci)) {
            throw new ApiException('Este torneo es competitivo: necesitás el carné de deportista vigente. Marcalo en Configuración.');
        }

        $this->solicitudes->crear($equipoId, $t->getId(), $ci);
        Auditoria::registrar($ci, Auditoria::INSCRIPCION, 'Pidió unirse a un equipo', "«{$this->equipos->nombre($equipoId)}» en «{$t->getNombre()}» (#{$t->getId()}).");
        $capitan = $this->equipos->capitan($equipoId, $t->getId());
        if ($capitan) $this->avisos->enviar($capitan, 'invitacion', $this->usuarios->nombreCompleto($ci) . " quiere sumarse a «{$this->equipos->nombre($equipoId)}» en «{$t->getNombre()}».", $t->getId());
        return ['success' => true];
    }

    public function perfilSolicitante(Request $req): array {
        $ci = Auth::exigirLogin();
        $sol = $this->solicitudes->buscar($req->idQuery());
        if ($sol === null) throw ApiException::noEncontrado('Solicitud');
        $t = $this->torneo($sol['tournamentId']);
        if ((int)$sol['teamId'] !== $this->equipoDeCapitan($ci, $t)) throw ApiException::prohibido('Solo el capitán del equipo puede hacer esto.');
        $perfil = $this->usuarios->datosParaCapitan($sol['ci']);
        $torneos = $this->actividad->torneosJugados($sol['ci']);
        $equipos = array_map('intval', array_column($torneos, 'equipo_id_fk'));
        $ganados = $jugados = 0;
        foreach ($this->actividad->partidosDeEquipos($equipos) as $p) {
            if (!in_array($p['res_estado'], ['finalizado', 'empate'], true)) continue;
            $jugados++;
            $local = (int)$p['mio'] === (int)$p['a'];
            if ((int)($local ? $p['puntaje_a'] : $p['puntaje_b']) > (int)($local ? $p['puntaje_b'] : $p['puntaje_a'])) $ganados++;
        }
        $perfil['stats'] = [
            'tournaments' => count($torneos),
            'titles' => count(array_filter($torneos, fn($t) => $t['estado'] === Torneo::FINALIZADO && (int)$t['puesto'] === 1)),
            'matches' => $jugados,
            'wins' => $ganados,
        ];
        return ['success' => true, 'profile' => $perfil];
    }

    public function responderSolicitud(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        $sol = $this->solicitudes->buscar((int)($d['id'] ?? 0));
        if ($sol === null || $sol['status'] !== 'pendiente') throw ApiException::noEncontrado('Solicitud');
        $t = $this->torneo($sol['tournamentId']);
        $equipoId = $this->equipoDeCapitan($ci, $t);
        if ((int)$sol['teamId'] !== $equipoId) throw ApiException::prohibido('Solo el capitán del equipo puede hacer esto.');

        if (empty($d['accept'])) {
            $this->solicitudes->cambiarEstado($sol['id'], 'rechazada');
            Auditoria::registrar($ci, Auditoria::INSCRIPCION, 'Rechazó una solicitud para unirse al equipo', "{$sol['name']} en «{$sol['team']}» (#{$t->getId()}).");
            $this->avisos->enviar($sol['ci'], 'invitacion', "El capitán de «{$sol['team']}» no aceptó tu solicitud en «{$t->getNombre()}».", $t->getId());
            return ['success' => true];
        }
        if ($t->getEstado() === Torneo::FINALIZADO) throw new ApiException('El torneo ya terminó.');
        $pid = $this->usuarios->participanteId($sol['ci']);
        if ($pid === null) throw new ApiException('Esa persona ya no tiene el rol de Participante.');
        if ($this->equipoDe($sol['ci'], $t->getId()) !== null) {
            $this->solicitudes->cambiarEstado($sol['id'], 'cancelada');
            throw new ApiException('Esa persona ya juega en otro equipo de este torneo.');
        }
        $max = $t->getConfiguracion()->getJugadoresPorEquipo();
        if (count($this->equipos->integrantes($equipoId)) >= $max) throw new ApiException('El equipo ya está completo.');

        $this->equipos->transaccion(function () use ($sol, $equipoId, $pid, $t, $max) {
            $this->equipos->agregarIntegrante($equipoId, $pid);
            $this->solicitudes->cambiarEstado($sol['id'], 'aceptada');
            $this->solicitudes->cancelarOtras($sol['ci'], $t->getId(), $sol['id']);
            $this->invitaciones->cancelarOtras($sol['ci'], $t->getId(), 0);
            if (count($this->equipos->integrantes($equipoId)) >= $max) {
                $this->equipos->marcarAbierto($equipoId, false);
                $this->solicitudes->cancelarDeEquipo($equipoId);
            }
        });
        Auditoria::registrar($ci, Auditoria::INSCRIPCION, 'Aceptó a un jugador en su equipo', "{$sol['name']} en «{$sol['team']}» (#{$t->getId()}).");
        $this->avisos->enviar($sol['ci'], 'invitacion', "¡Te aceptaron en «{$sol['team']}» en «{$t->getNombre()}»!", $t->getId());
        return ['success' => true];
    }

    public function cancelarSolicitud(Request $req): array {
        $ci = Auth::exigirLogin();
        $sol = $this->solicitudes->buscar((int)($req->json()['id'] ?? 0));
        if ($sol === null || $sol['ci'] !== $ci || $sol['status'] !== 'pendiente') throw ApiException::noEncontrado('Solicitud');
        $this->solicitudes->cambiarEstado($sol['id'], 'cancelada');
        return ['success' => true];
    }

    private function torneo(int $id): Torneo {
        $t = $this->torneos->buscar($id);
        if ($t === null || $t->estaOculto()) throw ApiException::noEncontrado('Torneo');
        return $t;
    }

    private function equipoDe(string $ci, int $torneoId): ?int {
        $pid = $this->usuarios->participanteId($ci);
        return $pid === null ? null : $this->equipos->equipoDelParticipante($torneoId, $pid);
    }

    private function equipoDeCapitan(string $ci, Torneo $t): int {
        $equipoId = $this->equipoDe($ci, $t->getId());
        if ($equipoId === null || $this->equipos->capitan($equipoId, $t->getId()) !== $ci) {
            throw ApiException::prohibido('Solo el capitán del equipo puede hacer esto.');
        }
        return $equipoId;
    }
}
