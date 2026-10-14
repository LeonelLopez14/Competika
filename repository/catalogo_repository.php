<?php
require_once __DIR__ . '/base_repository.php';

/** Catálogos de solo lectura: formatos de torneo (tipo_torneo) y monedas. */
class CatalogoRepository extends BaseRepository {
    /** @return TipoTorneo[] */
    public function tiposTorneo(): array {
        return array_map([TipoTorneo::class, 'desdeFila'],
            $this->filas("SELECT * FROM tipo_torneo ORDER BY tipo_torneo_id"));
    }

    public function tipoPorClave(string $clave): ?TipoTorneo {
        $f = $this->fila("SELECT * FROM tipo_torneo WHERE clave = ?", [$clave]);
        return $f ? TipoTorneo::desdeFila($f) : null;
    }

    /** @return Moneda[] */
    public function monedas(): array {
        return array_map([Moneda::class, 'desdeFila'], $this->filas("SELECT * FROM moneda ORDER BY codigo = 'UYU' DESC, codigo"));
    }

    public function monedaPorCodigo(string $codigo): ?Moneda {
        $f = $this->fila("SELECT * FROM moneda WHERE codigo = ?", [$codigo]);
        return $f ? Moneda::desdeFila($f) : null;
    }
}
