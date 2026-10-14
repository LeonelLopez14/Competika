<?php
require_once __DIR__ . '/base_repository.php';

/** Notificaciones de la campana. */
class NotificacionRepository extends BaseRepository {
    private const COLS = "notificacion_id, usuario_ci_fk, tipo, mensaje, torneo_id_fk, ref_id, leida,
                          TIMESTAMPDIFF(SECOND, fecha, NOW()) AS hace";   // segundos calculados por la base (sin líos de zona horaria)

    public function crear(Notificacion $n): int {
        $id = $this->insertar("INSERT INTO notificacion (usuario_ci_fk, tipo, mensaje, torneo_id_fk, ref_id) VALUES (?, ?, ?, ?, ?)",
            [$n->getUsuarioCi(), $n->getTipo(), $n->getMensaje(), $n->getTorneoId(), $n->getRefId()]);
        SenalNotificaciones::avisar($n->getUsuarioCi(), $id);    // despierta al stream de ese usuario
        return $id;
    }

    /** @return Notificacion[] las más nuevas primero */
    public function ultimas(string $ci, int $limite = 30): array {
        return array_map([Notificacion::class, 'desdeFila'], $this->filas(
            "SELECT " . self::COLS . " FROM notificacion WHERE usuario_ci_fk = ? ORDER BY notificacion_id DESC LIMIT " . (int)$limite, [$ci]));
    }

    /** @return Notificacion[] con id mayor a $despuesDe, en orden */
    public function posteriores(string $ci, int $despuesDe): array {
        return array_map([Notificacion::class, 'desdeFila'], $this->filas(
            "SELECT " . self::COLS . " FROM notificacion WHERE usuario_ci_fk = ? AND notificacion_id > ? ORDER BY notificacion_id LIMIT 20",
            [$ci, $despuesDe]));
    }

    public function noLeidas(string $ci): int {
        return (int)$this->valor("SELECT COUNT(*) FROM notificacion WHERE usuario_ci_fk = ? AND leida = 0", [$ci]);
    }

    public function marcarLeida(int $id, string $ci): void {
        $this->ejecutar("UPDATE notificacion SET leida = 1 WHERE notificacion_id = ? AND usuario_ci_fk = ?", [$id, $ci]);
    }

    public function marcarTodasLeidas(string $ci): void {
        $this->ejecutar("UPDATE notificacion SET leida = 1 WHERE usuario_ci_fk = ? AND leida = 0", [$ci]);
    }

    /** Partidos de los equipos de $ci en las próximas 24 h, sin resultado y sin recordatorio enviado. */
    public function partidosParaRecordar(string $ci): array {
        return $this->filas("
            SELECT e.enfrentamiento_id, e.fecha, e.ubicacion, e.torneo_id_fk, t.nombre AS torneo,
                   (SELECT x.equipo_id_fk FROM enfrentamiento_equipo x
                     WHERE x.enfrentamiento_id_fk = e.enfrentamiento_id AND x.equipo_id_fk <> ee.equipo_id_fk LIMIT 1) AS rival
            FROM participante p
            JOIN equipo_participante ep ON ep.participante_id_fk = p.participante_id
            JOIN enfrentamiento_equipo ee ON ee.equipo_id_fk = ep.equipo_id_fk
            JOIN enfrentamiento e ON e.enfrentamiento_id = ee.enfrentamiento_id_fk
            JOIN torneo t ON t.torneo_id = e.torneo_id_fk
            WHERE p.usuario_ci_fk = ?
              AND e.fecha BETWEEN NOW() AND NOW() + INTERVAL 24 HOUR
              AND NOT EXISTS (SELECT 1 FROM resultado r WHERE r.enfrentamiento_id_fk = e.enfrentamiento_id AND r.estado <> 'pendiente')
              AND NOT EXISTS (SELECT 1 FROM notificacion n WHERE n.usuario_ci_fk = p.usuario_ci_fk
                                AND n.tipo = 'recordatorio' AND n.ref_id = e.enfrentamiento_id)", [$ci]);
    }
}
