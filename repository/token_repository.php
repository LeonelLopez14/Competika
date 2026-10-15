<?php
require_once __DIR__ . '/base_repository.php';

/** Tokens de "Recordarme" y de recuperación de contraseña (solo su hash). */
class TokenRepository extends BaseRepository {
    // ── Recordarme ───────────────────────────────────────────
    public function guardarRecordada(string $selector, string $validadorHash, string $ci, int $dias): void {
        $this->ejecutar("DELETE FROM sesion_recordada WHERE expira < NOW()");
        $this->ejecutar("INSERT INTO sesion_recordada (selector, validador_hash, usuario_ci_fk, expira)
                         VALUES (?, ?, ?, NOW() + INTERVAL ? DAY)", [$selector, $validadorHash, $ci, $dias]);
    }

    /** ['validador_hash' => ..., 'usuario_ci_fk' => ...] si existe y no venció. */
    public function recordada(string $selector): ?array {
        return $this->fila("SELECT validador_hash, usuario_ci_fk FROM sesion_recordada WHERE selector = ? AND expira > NOW()", [$selector]);
    }

    public function borrarRecordada(string $selector): void {
        $this->ejecutar("DELETE FROM sesion_recordada WHERE selector = ?", [$selector]);
    }

    public function borrarRecordadasDe(string $ci): void {
        $this->ejecutar("DELETE FROM sesion_recordada WHERE usuario_ci_fk = ?", [$ci]);
    }

    // ── Recuperación de contraseña ───────────────────────────
    public function guardarRecuperacion(string $tokenHash, string $ci, int $minutos): void {
        $this->ejecutar("DELETE FROM recuperacion_clave WHERE usuario_ci_fk = ? OR expira < NOW()", [$ci]);   // solo vale el último enlace
        $this->ejecutar("INSERT INTO recuperacion_clave (token_hash, usuario_ci_fk, expira) VALUES (?, ?, NOW() + INTERVAL ? MINUTE)",
            [$tokenHash, $ci, $minutos]);
    }

    /** Cédula dueña de un token vigente y sin usar, o null. */
    public function ciDeRecuperacion(string $tokenHash): ?string {
        $v = $this->valor("SELECT usuario_ci_fk FROM recuperacion_clave WHERE token_hash = ? AND usado = 0 AND expira > NOW()", [$tokenHash]);
        return $v === false ? null : (string)$v;
    }

    public function marcarUsada(string $tokenHash): void {
        $this->ejecutar("UPDATE recuperacion_clave SET usado = 1 WHERE token_hash = ?", [$tokenHash]);
    }
}
