<?php
require_once __DIR__ . '/base_repository.php';

class PremioRepository extends BaseRepository {
    /** @return Premio[] */
    public function delTorneo(int $torneoId): array {
        return array_map([Premio::class, 'desdeFila'],
            $this->filas("SELECT puesto, descripcion FROM premio WHERE torneo_id_fk = ? ORDER BY puesto", [$torneoId]));
    }

    /** @param Premio[] $premios */
    public function reemplazar(int $torneoId, array $premios): void {
        $this->transaccion(function () use ($torneoId, $premios) {
            $this->ejecutar("DELETE FROM premio WHERE torneo_id_fk = ?", [$torneoId]);
            foreach ($premios as $p) {
                $this->ejecutar("INSERT INTO premio (torneo_id_fk, puesto, descripcion) VALUES (?, ?, ?)",
                    [$torneoId, $p->getPuesto(), $p->getDescripcion()]);
            }
        });
    }
}
