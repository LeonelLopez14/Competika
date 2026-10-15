<?php
require_once __DIR__ . '/base_repository.php';

/** Mensajes del formulario de Contacto. */
class ContactoRepository extends BaseRepository {
    public function crear(string $nombre, string $email, string $asunto, string $mensaje, ?string $ci, string $ipHash): int {
        return $this->insertar("INSERT INTO mensaje_contacto (nombre, email, asunto, mensaje, usuario_ci_fk, ip_hash) VALUES (?, ?, ?, ?, ?, ?)",
            [$nombre, $email, $asunto, $mensaje, $ci, $ipHash]);
    }

    /** Mensajes enviados desde esa IP en la última hora (límite anti-spam). */
    public function recientesDesde(string $ipHash): int {
        return (int)$this->valor("SELECT COUNT(*) FROM mensaje_contacto WHERE ip_hash = ? AND fecha > NOW() - INTERVAL 1 HOUR", [$ipHash]);
    }

    public function listar(bool $soloNoLeidos): array {
        return array_map(fn($f) => ['id' => (int)$f['mensaje_id'], 'nombre' => $f['nombre'], 'email' => $f['email'], 'asunto' => $f['asunto'],
                                    'mensaje' => $f['mensaje'], 'leido' => (bool)$f['leido'], 'fecha' => $f['fecha'], 'registrado' => $f['usuario_ci_fk'] !== null],
            $this->filas("SELECT * FROM mensaje_contacto" . ($soloNoLeidos ? " WHERE leido = 0" : "") . " ORDER BY mensaje_id DESC LIMIT 200"));
    }

    public function marcarLeido(int $id, bool $leido): void {
        $this->ejecutar("UPDATE mensaje_contacto SET leido = ? WHERE mensaje_id = ?", [(int)$leido, $id]);
    }

    public function eliminar(int $id): void {
        $this->ejecutar("DELETE FROM mensaje_contacto WHERE mensaje_id = ?", [$id]);
    }

    public function noLeidos(): int {
        return (int)$this->valor("SELECT COUNT(*) FROM mensaje_contacto WHERE leido = 0");
    }
}
