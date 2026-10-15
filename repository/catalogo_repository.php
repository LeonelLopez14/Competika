<?php
require_once __DIR__ . '/base_repository.php';

/** Catálogos: formatos de torneo (tipo_torneo) y monedas. */
class CatalogoRepository extends BaseRepository {
    /** @return TipoTorneo[] */
    public function tiposTorneo(bool $soloActivos = false): array {
        return array_map([TipoTorneo::class, 'desdeFila'],
            $this->filas("SELECT * FROM tipo_torneo" . ($soloActivos ? " WHERE activo = 1" : "") . " ORDER BY tipo_torneo_id"));
    }

    public function tipoPorClave(string $clave): ?TipoTorneo {
        $f = $this->fila("SELECT * FROM tipo_torneo WHERE clave = ?", [$clave]);
        return $f ? TipoTorneo::desdeFila($f) : null;
    }

    public function actualizarTipo(string $clave, string $etiqueta, bool $activo): void {
        $this->ejecutar("UPDATE tipo_torneo SET etiqueta = ?, activo = ? WHERE clave = ?", [$etiqueta, (int)$activo, $clave]);
    }

    public function tiposActivos(): int {
        return (int)$this->valor("SELECT COUNT(*) FROM tipo_torneo WHERE activo = 1");
    }

    /** @return Moneda[] */
    public function monedas(bool $soloActivas = false): array {
        return array_map([Moneda::class, 'desdeFila'], $this->filas("SELECT * FROM moneda"
            . ($soloActivas ? " WHERE activa = 1" : "") . " ORDER BY codigo = 'UYU' DESC, codigo"));
    }

    public function monedaPorCodigo(string $codigo): ?Moneda {
        $f = $this->fila("SELECT * FROM moneda WHERE codigo = ?", [$codigo]);
        return $f ? Moneda::desdeFila($f) : null;
    }

    public function guardarMoneda(Moneda $m): void {
        $this->ejecutar("INSERT INTO moneda (codigo, nombre, simbolo, activa) VALUES (?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), simbolo = VALUES(simbolo), activa = VALUES(activa)",
            [$m->getCodigo(), $m->getNombre(), $m->getSimbolo(), (int)$m->estaActiva()]);
    }

    public function monedasActivas(): int {
        return (int)$this->valor("SELECT COUNT(*) FROM moneda WHERE activa = 1");
    }
}
