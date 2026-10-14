<?php
require_once __DIR__ . '/base_repository.php';

/**
 * Partidos (enfrentamiento), sus equipos (enfrentamiento_equipo, es_local
 * marca al local) y su resultado. La app no tiene DELETE sobre resultado:
 * un resultado "deshecho" vuelve a estado pendiente.
 */
class PartidoRepository extends BaseRepository {

    private const SELECT = "
        SELECT e.enfrentamiento_id, e.torneo_id_fk, e.ubicacion, e.fecha, r.nombre AS fase,
               (SELECT equipo_id_fk FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = e.enfrentamiento_id ORDER BY es_local DESC, equipo_id_fk LIMIT 1) AS eq_local,
               (SELECT equipo_id_fk FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = e.enfrentamiento_id ORDER BY es_local DESC, equipo_id_fk LIMIT 1 OFFSET 1) AS eq_visitante,
               res.resultado_id, res.puntaje_a, res.puntaje_b, res.estado AS res_estado, res.ganador_equipo_fk
        FROM enfrentamiento e
        JOIN ronda r ON r.ronda_id = e.ronda_id_fk
        LEFT JOIN resultado res ON res.resultado_id =
             (SELECT MAX(resultado_id) FROM resultado WHERE enfrentamiento_id_fk = e.enfrentamiento_id)";

    /** @return Partido[] por fecha */
    public function delTorneo(int $torneoId): array {
        return array_map([Partido::class, 'desdeFila'],
            $this->filas(self::SELECT . " WHERE e.torneo_id_fk = ? ORDER BY e.fecha IS NULL, e.fecha, e.enfrentamiento_id", [$torneoId]));
    }

    public function buscar(int $id): ?Partido {
        $f = $this->fila(self::SELECT . " WHERE e.enfrentamiento_id = ?", [$id]);
        return $f ? Partido::desdeFila($f) : null;
    }

    /** [torneoId, organizadorId] del partido, o null si no existe. */
    public function torneoYOrganizador(int $id): ?array {
        $f = $this->fila("SELECT e.torneo_id_fk, t.organizador_id_fk FROM enfrentamiento e
                          JOIN torneo t ON t.torneo_id = e.torneo_id_fk WHERE e.enfrentamiento_id = ?", [$id]);
        return $f ? [(int)$f['torneo_id_fk'], (int)$f['organizador_id_fk']] : null;
    }

    private function rondaId(int $torneoId, string $fase): int {
        $id = $this->valor("SELECT ronda_id FROM ronda WHERE torneo_id_fk = ? AND nombre = ? LIMIT 1", [$torneoId, $fase]);
        return $id !== false ? (int)$id : $this->insertar("INSERT INTO ronda (nombre, torneo_id_fk) VALUES (?, ?)", [$fase, $torneoId]);
    }

    private function asignarEquipos(Partido $p): void {
        $this->ejecutar("DELETE FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = ?", [$p->getId()]);
        $ins = $this->db->prepare("INSERT INTO enfrentamiento_equipo (enfrentamiento_id_fk, equipo_id_fk, es_local) VALUES (?, ?, ?)");
        if ($p->getLocalId() !== null)     $ins->execute([$p->getId(), $p->getLocalId(), 1]);
        if ($p->getVisitanteId() !== null) $ins->execute([$p->getId(), $p->getVisitanteId(), 0]);
    }

    public function crear(Partido $p, int $organizadorId): int {
        return $this->transaccion(function () use ($p, $organizadorId) {
            $id = $this->insertar("INSERT INTO enfrentamiento (ubicacion, fecha, torneo_id_fk, ronda_id_fk, organizador_id_fk) VALUES (?,?,?,?,?)",
                [$p->getUbicacion(), $p->getFecha(), $p->getTorneoId(), $this->rondaId($p->getTorneoId(), $p->getFase()), $organizadorId]);
            $p->setId($id);
            $this->asignarEquipos($p);
            return $id;
        });
    }

    /** Guarda datos, equipos y resultado (o lo deja pendiente si $p no tiene resultado jugado). */
    public function actualizar(Partido $p): void {
        $this->transaccion(function () use ($p) {
            $this->ejecutar("UPDATE enfrentamiento SET ubicacion = ?, fecha = ?, ronda_id_fk = ? WHERE enfrentamiento_id = ?",
                [$p->getUbicacion(), $p->getFecha(), $this->rondaId($p->getTorneoId(), $p->getFase()), $p->getId()]);
            $this->asignarEquipos($p);

            $resId = $this->valor("SELECT resultado_id FROM resultado WHERE enfrentamiento_id_fk = ? ORDER BY resultado_id DESC LIMIT 1", [$p->getId()]);
            $r = $p->getResultado();
            if ($r !== null && $r->estaJugado()) {
                $vals = [$r->getLocal(), $r->getVisitante(), $r->getEstado(), $r->getGanadorEquipoId()];
                if ($resId === false) {
                    $this->ejecutar("INSERT INTO resultado (puntaje_a, puntaje_b, estado, ganador_equipo_fk, enfrentamiento_id_fk) VALUES (?,?,?,?,?)", [...$vals, $p->getId()]);
                } else {
                    $this->ejecutar("UPDATE resultado SET puntaje_a = ?, puntaje_b = ?, estado = ?, ganador_equipo_fk = ? WHERE resultado_id = ?", [...$vals, $resId]);
                }
            } elseif ($resId !== false) {
                $this->ejecutar("UPDATE resultado SET puntaje_a = NULL, puntaje_b = NULL, estado = 'pendiente',
                                 ganador_equipo_fk = NULL, ganador_participante_fk = NULL WHERE resultado_id = ?", [$resId]);
            }
        });
    }

    /** ¿Tuvo alguna vez un resultado registrado? (no se puede borrar) */
    public function tuvoResultado(int $id): bool {
        return (int)$this->valor("SELECT COUNT(*) FROM resultado WHERE enfrentamiento_id_fk = ?", [$id]) > 0;
    }

    public function eliminar(int $id): void {
        $this->transaccion(function () use ($id) {
            foreach (['enfrentamiento_juez', 'enfrentamiento_equipo', 'enfrentamiento_participante'] as $tbl) {
                $this->ejecutar("DELETE FROM $tbl WHERE enfrentamiento_id_fk = ?", [$id]);
            }
            $this->ejecutar("DELETE FROM enfrentamiento WHERE enfrentamiento_id = ?", [$id]);
        });
    }

    /** @return Partido[] jugados del torneo (para la tabla de posiciones) */
    public function jugadosDelTorneo(int $torneoId): array {
        return array_values(array_filter($this->delTorneo($torneoId), fn(Partido $p) => $p->estaJugado()));
    }
}
