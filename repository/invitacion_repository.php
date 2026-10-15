<?php
require_once __DIR__ . '/base_repository.php';

/** Invitaciones a sumarse a un equipo (tabla invitacion_equipo). */
class InvitacionRepository extends BaseRepository {
    private const SELECT = "SELECT i.*, e.nombre AS equipo, t.nombre AS torneo,
                                   CONCAT(ui.nombre, ' ', ui.apellido) AS invitado, ui.email AS invitado_email,
                                   CONCAT(up.nombre, ' ', up.apellido) AS invita
                            FROM invitacion_equipo i
                            JOIN equipo e ON e.equipo_id = i.equipo_id_fk
                            JOIN torneo t ON t.torneo_id = i.torneo_id_fk
                            JOIN usuario ui ON ui.ci = i.invitado_ci_fk
                            JOIN usuario up ON up.ci = i.invitado_por_ci_fk";

    private static function aArreglo(array $f): array {
        return ['id' => (int)$f['invitacion_id'], 'teamId' => (string)$f['equipo_id_fk'], 'team' => $f['equipo'],
                'tournamentId' => (int)$f['torneo_id_fk'], 'tournament' => $f['torneo'], 'invitedCi' => $f['invitado_ci_fk'],
                'invited' => $f['invitado'], 'invitedEmail' => $f['invitado_email'], 'from' => $f['invita'], 'status' => $f['estado']];
    }

    public function crear(int $equipoId, int $torneoId, string $invitadoCi, string $porCi): int {
        return $this->insertar("INSERT INTO invitacion_equipo (equipo_id_fk, torneo_id_fk, invitado_ci_fk, invitado_por_ci_fk) VALUES (?, ?, ?, ?)",
            [$equipoId, $torneoId, $invitadoCi, $porCi]);
    }

    public function buscar(int $id): ?array {
        $f = parent::fila(self::SELECT . " WHERE i.invitacion_id = ?", [$id]);
        return $f ? self::aArreglo($f) : null;
    }

    public function pendientesDeEquipo(int $equipoId): array {
        return array_map([self::class, 'aArreglo'], $this->filas(self::SELECT . " WHERE i.equipo_id_fk = ? AND i.estado = 'pendiente' ORDER BY i.invitacion_id", [$equipoId]));
    }

    public function pendientesPara(string $ci): array {
        return array_map([self::class, 'aArreglo'], $this->filas(self::SELECT . " WHERE i.invitado_ci_fk = ? AND i.estado = 'pendiente' ORDER BY i.invitacion_id DESC", [$ci]));
    }

    public function hayPendiente(int $equipoId, string $ci): bool {
        return $this->valor("SELECT 1 FROM invitacion_equipo WHERE equipo_id_fk = ? AND invitado_ci_fk = ? AND estado = 'pendiente'", [$equipoId, $ci]) !== false;
    }

    public function cambiarEstado(int $id, string $estado): void {
        $this->ejecutar("UPDATE invitacion_equipo SET estado = ? WHERE invitacion_id = ? AND estado = 'pendiente'", [$estado, $id]);
    }

    /** Al unirse a un equipo, las demás invitaciones del mismo torneo dejan de valer. */
    public function cancelarOtras(string $ci, int $torneoId, int $excepto): void {
        $this->ejecutar("UPDATE invitacion_equipo SET estado = 'cancelada' WHERE invitado_ci_fk = ? AND torneo_id_fk = ? AND invitacion_id <> ? AND estado = 'pendiente'",
            [$ci, $torneoId, $excepto]);
    }
}
