<?php
require_once __DIR__ . '/base_repository.php';

/**
 * Equipos. Un equipo pertenece a un torneo a través de su fila en
 * tabla_posiciones (que además guarda sus estadísticas).
 */
class EquipoRepository extends BaseRepository {

    /** @return Equipo[] en orden de inscripción */
    public function delTorneo(int $torneoId): array {
        return array_map([Equipo::class, 'desdeFila'], $this->filas(
            "SELECT e.equipo_id, e.nombre, e.tamanio, tp.puntos, tp.partidos_ganados, tp.partidos_perdidos, tp.partidos_empatados
             FROM tabla_posiciones tp JOIN equipo e ON e.equipo_id = tp.equipo_id_fk
             WHERE tp.torneo_id_fk = ? ORDER BY e.equipo_id", [$torneoId]));
    }

    public function cantidadEnTorneo(int $torneoId): int {
        return (int)$this->valor("SELECT COUNT(*) FROM tabla_posiciones WHERE torneo_id_fk = ? AND equipo_id_fk IS NOT NULL", [$torneoId]);
    }

    public function estaEnTorneo(int $equipoId, int $torneoId): bool {
        return $this->valor("SELECT 1 FROM tabla_posiciones WHERE torneo_id_fk = ? AND equipo_id_fk = ?", [$torneoId, $equipoId]) !== false;
    }

    /** Torneo en el que está el equipo, si ese torneo es del organizador indicado. */
    public function torneoDelOrganizador(int $equipoId, int $organizadorId): ?int {
        $v = $this->valor("SELECT tp.torneo_id_fk FROM tabla_posiciones tp JOIN torneo t ON t.torneo_id = tp.torneo_id_fk
                           WHERE tp.equipo_id_fk = ? AND t.organizador_id_fk = ? LIMIT 1", [$equipoId, $organizadorId]);
        return $v === false ? null : (int)$v;
    }

    public function nombre(?int $equipoId): string {
        if ($equipoId === null) return 'un rival por definir';
        return (string)($this->valor("SELECT nombre FROM equipo WHERE equipo_id = ?", [$equipoId]) ?: 'un rival');
    }

    /** Inscribe un equipo nuevo en el torneo (y, si viene, lo vincula al participante). */
    public function crearEnTorneo(Equipo $e, int $torneoId, ?int $participanteId = null): int {
        return $this->transaccion(function () use ($e, $torneoId, $participanteId) {
            $id = $this->insertar("INSERT INTO equipo (nombre, tamanio) VALUES (?, ?)", [$e->getNombre(), $e->getTamanio()]);
            $e->setId($id);
            if ($participanteId !== null) {
                $this->ejecutar("INSERT INTO equipo_participante (equipo_id_fk, participante_id_fk) VALUES (?, ?)", [$id, $participanteId]);
            }
            $this->ejecutar("INSERT INTO tabla_posiciones (torneo_id_fk, equipo_id_fk, participante_id_fk) VALUES (?, ?, ?)",
                [$torneoId, $id, $participanteId]);
            return $id;
        });
    }

    public function actualizar(int $equipoId, ?string $nombre, ?int $tamanio): void {
        if ($nombre !== null)  $this->ejecutar("UPDATE equipo SET nombre = ? WHERE equipo_id = ?", [$nombre, $equipoId]);
        if ($tamanio !== null) $this->ejecutar("UPDATE equipo SET tamanio = ? WHERE equipo_id = ?", [$tamanio, $equipoId]);
    }

    public function tieneResultadosEnTorneo(int $equipoId, int $torneoId): bool {
        return (int)$this->valor("SELECT COUNT(*) FROM enfrentamiento_equipo ee
                                  JOIN enfrentamiento e ON e.enfrentamiento_id = ee.enfrentamiento_id_fk
                                  JOIN resultado r ON r.enfrentamiento_id_fk = e.enfrentamiento_id
                                  WHERE ee.equipo_id_fk = ? AND e.torneo_id_fk = ?", [$equipoId, $torneoId]) > 0;
    }

    /** Saca el equipo del torneo (y de sus partidos); si queda sin uso, lo borra. */
    public function quitarDeTorneo(int $equipoId, int $torneoId): void {
        $this->transaccion(function () use ($equipoId, $torneoId) {
            $this->ejecutar("DELETE FROM enfrentamiento_equipo WHERE equipo_id_fk = ?
                             AND enfrentamiento_id_fk IN (SELECT enfrentamiento_id FROM enfrentamiento WHERE torneo_id_fk = ?)",
                [$equipoId, $torneoId]);
            $this->ejecutar("DELETE FROM tabla_posiciones WHERE torneo_id_fk = ? AND equipo_id_fk = ?", [$torneoId, $equipoId]);
            $this->borrarSiHuerfano($equipoId);
        });
    }

    /** Borra el equipo si ya no lo referencia ningún torneo, partido ni resultado. */
    public function borrarSiHuerfano(int $equipoId): void {
        $usos = (int)$this->valor("SELECT
            (SELECT COUNT(*) FROM tabla_posiciones WHERE equipo_id_fk = ?) +
            (SELECT COUNT(*) FROM enfrentamiento_equipo WHERE equipo_id_fk = ?) +
            (SELECT COUNT(*) FROM resultado WHERE ganador_equipo_fk = ?)", [$equipoId, $equipoId, $equipoId]);
        if ($usos === 0) {
            $this->ejecutar("DELETE FROM equipo_participante WHERE equipo_id_fk = ?", [$equipoId]);
            $this->ejecutar("DELETE FROM equipo WHERE equipo_id = ?", [$equipoId]);
        }
    }

    /** Cédulas de las personas que juegan en el equipo. */
    public function usuarios(?int $equipoId): array {
        if ($equipoId === null) return [];
        return $this->columna("SELECT DISTINCT p.usuario_ci_fk FROM equipo_participante ep
                               JOIN participante p ON p.participante_id = ep.participante_id_fk WHERE ep.equipo_id_fk = ?", [$equipoId]);
    }

    /** Equipo con el que el participante está inscripto en el torneo (o null). */
    public function equipoDelParticipante(int $torneoId, int $participanteId): ?int {
        $v = $this->valor("SELECT tp.equipo_id_fk FROM tabla_posiciones tp
                           JOIN equipo_participante ep ON ep.equipo_id_fk = tp.equipo_id_fk
                           WHERE tp.torneo_id_fk = ? AND ep.participante_id_fk = ? LIMIT 1", [$torneoId, $participanteId]);
        return $v === false ? null : (int)$v;
    }

    public function participanteInscripto(int $torneoId, int $participanteId): bool {
        return $this->valor("SELECT 1 FROM tabla_posiciones WHERE torneo_id_fk = ? AND participante_id_fk = ?", [$torneoId, $participanteId]) !== false;
    }

    /** Guarda las estadísticas calculadas por TablaPosiciones. */
    public function guardarEstadisticas(int $torneoId, array $stats): void {
        $s = $this->db->prepare("UPDATE tabla_posiciones SET puntos = ?, partidos_jugados = ?, partidos_ganados = ?,
                                 partidos_empatados = ?, partidos_perdidos = ? WHERE torneo_id_fk = ? AND equipo_id_fk = ?");
        foreach ($stats as $equipoId => $x) $s->execute([$x['pts'], $x['pj'], $x['pg'], $x['pe'], $x['pp'], $torneoId, $equipoId]);
    }

    /** Ids de los equipos del torneo. */
    public function idsDelTorneo(int $torneoId): array {
        return array_map('intval', $this->columna("SELECT equipo_id_fk FROM tabla_posiciones WHERE torneo_id_fk = ? AND equipo_id_fk IS NOT NULL", [$torneoId]));
    }
}
