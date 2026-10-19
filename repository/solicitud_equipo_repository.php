<?php
require_once __DIR__ . '/base_repository.php';

class SolicitudEquipoRepository extends BaseRepository {
    private const SELECT = "SELECT s.*, e.nombre AS equipo, t.nombre AS torneo,
                                   CONCAT(u.nombre, ' ', u.apellido) AS solicitante, u.email AS solicitante_email
                            FROM solicitud_equipo s
                            JOIN equipo e ON e.equipo_id = s.equipo_id_fk
                            JOIN torneo t ON t.torneo_id = s.torneo_id_fk
                            JOIN usuario u ON u.ci = s.usuario_ci_fk";

    private static function aArreglo(array $f): array {
        return ['id' => (int)$f['solicitud_id'], 'teamId' => (string)$f['equipo_id_fk'], 'team' => $f['equipo'],
                'tournamentId' => (int)$f['torneo_id_fk'], 'tournament' => $f['torneo'], 'ci' => $f['usuario_ci_fk'],
                'name' => $f['solicitante'], 'email' => $f['solicitante_email'], 'status' => $f['estado']];
    }

    public function crear(int $equipoId, int $torneoId, string $ci): int {
        return $this->insertar("INSERT INTO solicitud_equipo (equipo_id_fk, torneo_id_fk, usuario_ci_fk) VALUES (?, ?, ?)", [$equipoId, $torneoId, $ci]);
    }

    public function buscar(int $id): ?array {
        $f = parent::fila(self::SELECT . " WHERE s.solicitud_id = ?", [$id]);
        return $f ? self::aArreglo($f) : null;
    }

    public function pendientesDeEquipo(int $equipoId): array {
        return array_map([self::class, 'aArreglo'], $this->filas(self::SELECT . " WHERE s.equipo_id_fk = ? AND s.estado = 'pendiente' ORDER BY s.solicitud_id", [$equipoId]));
    }

    public function pendientesDe(string $ci, int $torneoId): array {
        return array_map([self::class, 'aArreglo'], $this->filas(self::SELECT . " WHERE s.usuario_ci_fk = ? AND s.torneo_id_fk = ? AND s.estado = 'pendiente' ORDER BY s.solicitud_id", [$ci, $torneoId]));
    }

    public function hayPendiente(int $equipoId, string $ci): bool {
        return $this->valor("SELECT 1 FROM solicitud_equipo WHERE equipo_id_fk = ? AND usuario_ci_fk = ? AND estado = 'pendiente'", [$equipoId, $ci]) !== false;
    }

    public function cambiarEstado(int $id, string $estado): void {
        $this->ejecutar("UPDATE solicitud_equipo SET estado = ? WHERE solicitud_id = ? AND estado = 'pendiente'", [$estado, $id]);
    }

    public function cancelarOtras(string $ci, int $torneoId, int $excepto): void {
        $this->ejecutar("UPDATE solicitud_equipo SET estado = 'cancelada' WHERE usuario_ci_fk = ? AND torneo_id_fk = ? AND solicitud_id <> ? AND estado = 'pendiente'",
            [$ci, $torneoId, $excepto]);
    }

    public function cancelarDeEquipo(int $equipoId): void {
        $this->ejecutar("UPDATE solicitud_equipo SET estado = 'cancelada' WHERE equipo_id_fk = ? AND estado = 'pendiente'", [$equipoId]);
    }
}
