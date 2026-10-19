<?php
require_once __DIR__ . '/base_repository.php';

class AuditoriaRepository extends BaseRepository {
    public function registrar(?string $ci, string $categoria, string $accion, string $detalle): void {
        $actor = null;
        $adminId = null;
        if ($ci !== null) {
            $actor = $this->valor("SELECT CONCAT(nombre, ' ', apellido) FROM usuario WHERE ci = ?", [$ci]);
            $actor = $actor === false ? null : (string)$actor;
            $v = $this->valor("SELECT admin_id FROM admin WHERE usuario_ci_fk = ? AND activo = 1 ORDER BY admin_id LIMIT 1", [$ci]);
            $adminId = $v === false ? null : (int)$v;
        }
        $this->ejecutar("INSERT INTO registro_de_actividad (admin_id_fk, usuario_ci_fk, actor, categoria, nombre, descripcion) VALUES (?, ?, ?, ?, ?, ?)",
            [$adminId, $ci, $actor, $categoria, mb_substr($accion, 0, 150), $detalle]);
    }
}
