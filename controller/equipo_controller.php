<?php
require_once __DIR__ . '/../core/autoload.php';

/**
 * Equipos de varios integrantes (api/teams.php). Quien inscribe el equipo es
 * el capitán: invita por correo, cancela invitaciones y quita integrantes.
 */
class EquipoController {
    private EquipoRepository $equipos;
    private TorneoRepository $torneos;
    private UsuarioRepository $usuarios;
    private InvitacionRepository $invitaciones;
    private Notificador $avisos;

    public function __construct() {
        $this->equipos = new EquipoRepository();
        $this->torneos = new TorneoRepository();
        $this->usuarios = new UsuarioRepository();
        $this->invitaciones = new InvitacionRepository();
        $this->avisos = new Notificador(null, $this->equipos, $this->torneos);
    }

    /** Mi equipo en el torneo (integrantes, invitaciones) y las invitaciones que recibí para ese torneo. */
    public function miEquipo(Request $req): array {
        $ci = Auth::exigirLogin();
        $t = $this->torneo($req->idQuery());
        $equipoId = $this->equipoDe($ci, $t->getId());
        $recibidas = array_values(array_filter($this->invitaciones->pendientesPara($ci), fn($i) => $i['tournamentId'] === $t->getId()));
        if ($equipoId === null) return ['success' => true, 'team' => null, 'invitations' => $recibidas];

        $capitan = $this->equipos->capitan($equipoId, $t->getId());
        return ['success' => true, 'invitations' => $recibidas, 'team' => [
            'id'         => (string)$equipoId,
            'isCaptain'  => $capitan === $ci,
            'max'        => $t->getConfiguracion()->getJugadoresPorEquipo(),
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
        if ($this->equipoDe($invitado['ci'], $t->getId()) !== null) throw new ApiException('Esa persona ya juega en un equipo de este torneo.');
        if ($this->invitaciones->hayPendiente($equipoId, $invitado['ci'])) throw new ApiException('Ya le mandaste una invitación.');
        $ocupados = count($this->equipos->integrantes($equipoId)) + count($this->invitaciones->pendientesDeEquipo($equipoId));
        if ($ocupados >= $t->getConfiguracion()->getJugadoresPorEquipo()) {
            throw new ApiException('El equipo ya está completo (máximo ' . $t->getConfiguracion()->getJugadoresPorEquipo() . ' jugadores, contando invitaciones pendientes).');
        }

        $this->invitaciones->crear($equipoId, $t->getId(), $invitado['ci'], $ci);
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
        if ($this->equipoDe($ci, $t->getId()) !== null) throw new ApiException('Ya jugás en un equipo de este torneo.');
        if (count($this->equipos->integrantes($equipoId)) >= $t->getConfiguracion()->getJugadoresPorEquipo()) {
            throw new ApiException('El equipo ya está completo.');
        }
        if ($t->getConfiguracion()->esCompetitivo() && !$this->usuarios->tieneCarne($ci)) {
            throw new ApiException('Este torneo es competitivo: necesitás el carné de deportista vigente. Marcalo en Configuración.');
        }

        $this->equipos->transaccion(function () use ($ci, $equipoId, $inv, $t) {
            $this->equipos->agregarIntegrante($equipoId, $this->usuarios->asegurarParticipante($ci));
            $this->invitaciones->cambiarEstado($inv['id'], 'aceptada');
            $this->invitaciones->cancelarOtras($ci, $t->getId(), $inv['id']);
        });
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
        if ($capitan) $this->avisos->enviar($capitan, 'baja', $this->usuarios->nombreCompleto($ci) . " dejó el equipo «{$this->equipos->nombre($equipoId)}».", $t->getId());
        return ['success' => true];
    }

    private function torneo(int $id): Torneo {
        $t = $this->torneos->buscar($id);
        if ($t === null) throw ApiException::noEncontrado('Torneo');
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
