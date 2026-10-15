<?php
require_once __DIR__ . '/base_repository.php';

/** Consultas de la página Perfil: torneos que organizo o juego y partidos de mis equipos. */
class ActividadRepository extends BaseRepository {
    private const TORNEO_COLS = "t.torneo_id, t.nombre, t.deporte, t.fecha_inicio, t.fecha_fin, t.direccion, t.departamento, t.estado,
        (SELECT COUNT(*) FROM tabla_posiciones x WHERE x.torneo_id_fk = t.torneo_id AND x.equipo_id_fk IS NOT NULL) AS equipos,
        (SELECT GROUP_CONCAT(CONCAT(pr.puesto, '° ', pr.descripcion) ORDER BY pr.puesto SEPARATOR '\n') FROM premio pr WHERE pr.torneo_id_fk = t.torneo_id) AS premios";

    public function torneosOrganizados(string $ci): array {
        return $this->filas("SELECT " . self::TORNEO_COLS . "
            FROM torneo t JOIN organizador o ON o.organizador_id = t.organizador_id_fk
            WHERE o.usuario_ci_fk = ? ORDER BY t.fecha_inicio IS NULL, t.fecha_inicio DESC, t.torneo_id DESC", [$ci]);
    }

    /** Torneos donde juega un equipo de $ci, con su puesto actual. */
    public function torneosJugados(string $ci): array {
        return $this->filas("SELECT " . self::TORNEO_COLS . ", tp.equipo_id_fk, tp.puntos, tp.partidos_ganados,
                   (SELECT COUNT(*) + 1 FROM tabla_posiciones y WHERE y.torneo_id_fk = t.torneo_id AND y.equipo_id_fk IS NOT NULL
                      AND (y.puntos > tp.puntos OR (y.puntos = tp.puntos AND y.partidos_ganados > tp.partidos_ganados))) AS puesto
            FROM participante p
            JOIN equipo_participante ep ON ep.participante_id_fk = p.participante_id
            JOIN tabla_posiciones tp ON tp.equipo_id_fk = ep.equipo_id_fk
            JOIN torneo t ON t.torneo_id = tp.torneo_id_fk
            WHERE p.usuario_ci_fk = ? ORDER BY t.fecha_inicio IS NULL, t.fecha_inicio DESC, t.torneo_id DESC", [$ci]);
    }

    /** Partidos de los equipos dados, del más reciente al más viejo. */
    public function partidosDeEquipos(array $equipoIds): array {
        if (!$equipoIds) return [];
        return $this->filas("
            SELECT e.enfrentamiento_id, e.fecha, e.ubicacion, t.torneo_id, t.nombre AS torneo, t.deporte, r.nombre AS fase,
                   ee.equipo_id_fk AS mio,
                   (SELECT equipo_id_fk FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = e.enfrentamiento_id AND es_local = 1 LIMIT 1) AS a,
                   (SELECT equipo_id_fk FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = e.enfrentamiento_id AND es_local = 0 LIMIT 1) AS b,
                   res.puntaje_a, res.puntaje_b, res.estado AS res_estado
            FROM enfrentamiento_equipo ee
            JOIN enfrentamiento e ON e.enfrentamiento_id = ee.enfrentamiento_id_fk
            JOIN torneo t ON t.torneo_id = e.torneo_id_fk
            JOIN ronda r ON r.ronda_id = e.ronda_id_fk
            LEFT JOIN resultado res ON res.resultado_id = (SELECT MAX(resultado_id) FROM resultado WHERE enfrentamiento_id_fk = e.enfrentamiento_id)
            WHERE ee.equipo_id_fk IN (" . self::marcas($equipoIds) . ")
            ORDER BY e.fecha IS NULL, e.fecha DESC", array_values($equipoIds));
    }

    /** [equipo_id => nombre] */
    public function nombresDeEquipos(array $ids): array {
        if (!$ids) return [];
        $r = [];
        foreach ($this->filas("SELECT equipo_id, nombre FROM equipo WHERE equipo_id IN (" . self::marcas($ids) . ")", array_values($ids)) as $x) {
            $r[(int)$x['equipo_id']] = $x['nombre'];
        }
        return $r;
    }

    /** Torneos que sigue el usuario (rol observador). */
    public function torneosSeguidos(string $ci): array {
        return $this->filas("SELECT " . self::TORNEO_COLS . "
            FROM seguimiento s JOIN torneo t ON t.torneo_id = s.torneo_id_fk
            WHERE s.usuario_ci_fk = ? ORDER BY s.fecha DESC", [$ci]);
    }
}
