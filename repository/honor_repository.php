<?php
require_once __DIR__ . '/base_repository.php';

/** Honores: un jugador reconoce el juego limpio del equipo rival después de un partido. */
class HonorRepository extends BaseRepository {
    /** Partidos en los que $ci ya dio honor. */
    public function partidosConHonorDe(string $ci): array {
        return array_map('intval', $this->columna("SELECT enfrentamiento_id_fk FROM honor WHERE de_usuario_ci_fk = ?", [$ci]));
    }

    /** Honores recibidos por un conjunto de equipos. */
    public function recibidosPor(array $equipoIds): int {
        if (!$equipoIds) return 0;
        return (int)$this->valor("SELECT COUNT(*) FROM honor WHERE a_equipo_id_fk IN (" . self::marcas($equipoIds) . ")", array_values($equipoIds));
    }

    /** [miEquipo, rival, torneoId] de un partido jugado por un equipo de $ci, o null. */
    public function partidoJugadoPor(string $ci, int $partidoId): ?array {
        $f = $this->fila("
            SELECT ee.equipo_id_fk AS mio, e.torneo_id_fk,
                   (SELECT x.equipo_id_fk FROM enfrentamiento_equipo x
                     WHERE x.enfrentamiento_id_fk = e.enfrentamiento_id AND x.equipo_id_fk <> ee.equipo_id_fk LIMIT 1) AS rival
            FROM participante p
            JOIN equipo_participante ep ON ep.participante_id_fk = p.participante_id
            JOIN enfrentamiento_equipo ee ON ee.equipo_id_fk = ep.equipo_id_fk
            JOIN enfrentamiento e ON e.enfrentamiento_id = ee.enfrentamiento_id_fk
            WHERE p.usuario_ci_fk = ? AND e.enfrentamiento_id = ?
              AND EXISTS (SELECT 1 FROM resultado r WHERE r.enfrentamiento_id_fk = e.enfrentamiento_id AND r.estado IN ('finalizado','empate'))
            LIMIT 1", [$ci, $partidoId]);
        if (!$f || $f['rival'] === null) return null;
        return [(int)$f['mio'], (int)$f['rival'], (int)$f['torneo_id_fk']];
    }

    /** true si se registró (false si ya lo había dado). */
    public function dar(int $partidoId, string $deCi, int $aEquipoId): bool {
        return $this->ejecutar("INSERT IGNORE INTO honor (enfrentamiento_id_fk, de_usuario_ci_fk, a_equipo_id_fk) VALUES (?, ?, ?)",
            [$partidoId, $deCi, $aEquipoId]) > 0;
    }
}
