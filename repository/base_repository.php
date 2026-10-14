<?php
require_once __DIR__ . '/../core/autoload.php';

/**
 * Base de los repositorios: todos comparten la conexión PDO singleton
 * (Database::getInstance) y solo usan sentencias preparadas.
 */
abstract class BaseRepository {
    protected PDO $db;

    public function __construct(?PDO $db = null) {
        $this->db = $db ?? Database::getInstance();
    }

    protected function valor(string $sql, array $params = []) {
        $s = $this->db->prepare($sql);
        $s->execute($params);
        return $s->fetchColumn();
    }

    protected function fila(string $sql, array $params = []): ?array {
        $s = $this->db->prepare($sql);
        $s->execute($params);
        return $s->fetch() ?: null;
    }

    protected function filas(string $sql, array $params = []): array {
        $s = $this->db->prepare($sql);
        $s->execute($params);
        return $s->fetchAll();
    }

    protected function columna(string $sql, array $params = []): array {
        $s = $this->db->prepare($sql);
        $s->execute($params);
        return $s->fetchAll(PDO::FETCH_COLUMN);
    }

    protected function ejecutar(string $sql, array $params = []): int {
        $s = $this->db->prepare($sql);
        $s->execute($params);
        return $s->rowCount();
    }

    protected function insertar(string $sql, array $params = []): int {
        $this->ejecutar($sql, $params);
        return (int)$this->db->lastInsertId();
    }

    /** Ejecuta $fn dentro de una transacción (si ya hay una abierta, se suma a ella). */
    public function transaccion(callable $fn) {
        if ($this->db->inTransaction()) return $fn();
        $this->db->beginTransaction();
        try {
            $r = $fn();
            $this->db->commit();
            return $r;
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /** "?, ?, ?" para un IN (...) */
    protected static function marcas(array $valores): string {
        return implode(', ', array_fill(0, count($valores), '?'));
    }
}
