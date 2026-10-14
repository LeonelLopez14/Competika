<?php
require_once __DIR__ . '/base_repository.php';

/** Cuentas de usuario y sus roles (tablas usuario, organizador, participante, juez, observador, admin). */
class UsuarioRepository extends BaseRepository {
    private const ROLES = ['admin', 'organizador', 'participante', 'juez', 'observador'];

    public function registrar(Usuario $usuario): bool {
        $sql = "INSERT INTO usuario (ci, nombre, apellido, telefono, direccion, fecha_nac, email, contrasenia, rol_usuario)
                VALUES (:ci, :nombre, :apellido, :telefono, :direccion, :fecha_nac, :email, :contrasenia, :rol_usuario)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':ci' => $usuario->getCi(),
            ':nombre' => $usuario->getNombre(),
            ':apellido' => $usuario->getApellido(),
            ':telefono' => $usuario->getTelefono(),
            ':direccion' => $usuario->getDireccion(),
            ':fecha_nac' => $usuario->getFechaNac(),
            ':email' => $usuario->getEmail(),
            ':contrasenia' => password_hash($usuario->getContrasenia(), PASSWORD_BCRYPT),
            ':rol_usuario' => $usuario->getRolUsuario()
        ]);
    }

    public function existeEmail(string $email): bool {
        return $this->valor("SELECT ci FROM usuario WHERE email = ?", [$email]) !== false;
    }

    public function existeCi(string $ci): bool {
        return $this->valor("SELECT ci FROM usuario WHERE ci = ?", [$ci]) !== false;
    }

    public function obtenerPorEmail(string $email): ?array {
        return $this->fila("SELECT * FROM usuario WHERE email = ?", [$email]);
    }

    public function buscar(string $ci): ?Usuario {
        $f = $this->fila("SELECT * FROM usuario WHERE ci = ?", [$ci]);
        return $f ? Usuario::desdeFila($f) : null;
    }

    public function nombreCompleto(string $ci): string {
        return (string)($this->valor("SELECT CONCAT(nombre, ' ', apellido) FROM usuario WHERE ci = ?", [$ci]) ?: '');
    }

    // ── Roles ────────────────────────────────────────────────
    public function crearOrganizador(string $ci): bool {
        return $this->ejecutar("INSERT INTO organizador (usuario_ci_fk) VALUES (?)", [$ci]) > 0;
    }

    public function crearParticipante(string $ci): bool {
        return $this->ejecutar("INSERT INTO participante (usuario_ci_fk, carne_deportista) VALUES (?, 0)", [$ci]) > 0;
    }

    public function crearObservador(string $ci): bool {
        return $this->ejecutar("INSERT INTO observador (usuario_ci_fk) VALUES (?)", [$ci]) > 0;
    }

    /** ['admin' => bool, 'organizador' => bool, ...] según las tablas de especialización. */
    public function roles(string $ci): array {
        $roles = [];
        foreach (self::ROLES as $tabla) {
            $roles[$tabla] = $this->valor("SELECT 1 FROM $tabla WHERE usuario_ci_fk = ? LIMIT 1", [$ci]) !== false;
        }
        return $roles;
    }

    public function organizadorId(string $ci): ?int {
        $v = $this->valor("SELECT organizador_id FROM organizador WHERE usuario_ci_fk = ? ORDER BY organizador_id LIMIT 1", [$ci]);
        return $v === false ? null : (int)$v;
    }

    public function participanteId(string $ci): ?int {
        $v = $this->valor("SELECT participante_id FROM participante WHERE usuario_ci_fk = ? ORDER BY participante_id LIMIT 1", [$ci]);
        return $v === false ? null : (int)$v;
    }

    /** Devuelve el organizador_id; si la cuenta no tiene el rol, se lo otorga. */
    public function asegurarOrganizador(string $ci): int {
        $id = $this->organizadorId($ci);
        if ($id !== null) return $id;
        $this->crearOrganizador($ci);
        return (int)$this->db->lastInsertId();
    }

    public function asegurarParticipante(string $ci): int {
        $id = $this->participanteId($ci);
        if ($id !== null) return $id;
        $this->crearParticipante($ci);
        return (int)$this->db->lastInsertId();
    }

    public function quitarRol(string $ci, string $tabla): void {
        if (!in_array($tabla, self::ROLES, true)) throw new InvalidArgumentException("Rol inválido: $tabla");
        $this->ejecutar("DELETE FROM $tabla WHERE usuario_ci_fk = ?", [$ci]);
    }

    public function actualizarRolPrincipal(string $ci, string $rol): void {
        $this->ejecutar("UPDATE usuario SET rol_usuario = ? WHERE ci = ?", [$rol, $ci]);
    }

    public function inscripcionesActivas(string $ci): int {
        return (int)$this->valor("SELECT
            (SELECT COUNT(*) FROM equipo_participante ep JOIN participante p ON p.participante_id = ep.participante_id_fk WHERE p.usuario_ci_fk = ?) +
            (SELECT COUNT(*) FROM tabla_posiciones tp JOIN participante p ON p.participante_id = tp.participante_id_fk WHERE p.usuario_ci_fk = ?)", [$ci, $ci]);
    }

    // ── Datos de la cuenta ───────────────────────────────────
    public function nombreUsuarioEnUso(string $nombreUsuario, string $exceptoCi): bool {
        return $this->valor("SELECT 1 FROM usuario WHERE nombre_usuario = ? AND ci <> ?", [$nombreUsuario, $exceptoCi]) !== false;
    }

    public function emailEnUso(string $email, string $exceptoCi): bool {
        return $this->valor("SELECT 1 FROM usuario WHERE email = ? AND ci <> ?", [$email, $exceptoCi]) !== false;
    }

    public function actualizarPerfil(string $ci, string $nombre, string $apellido, ?string $usuario, ?string $telefono, ?string $bio): void {
        $this->ejecutar("UPDATE usuario SET nombre = ?, apellido = ?, nombre_usuario = ?, telefono = ?, biografia = ? WHERE ci = ?",
            [$nombre, $apellido, $usuario, $telefono, $bio, $ci]);
    }

    public function actualizarEmail(string $ci, string $email): void {
        $this->ejecutar("UPDATE usuario SET email = ? WHERE ci = ?", [$email, $ci]);
    }

    public function verificarPassword(string $ci, string $password): bool {
        $hash = $this->valor("SELECT contrasenia FROM usuario WHERE ci = ?", [$ci]);
        return is_string($hash) && $password !== '' && password_verify($password, $hash);
    }

    public function actualizarPassword(string $ci, string $password): void {
        $this->ejecutar("UPDATE usuario SET contrasenia = ? WHERE ci = ?", [password_hash($password, PASSWORD_BCRYPT), $ci]);
    }

    public function fotoPerfil(string $ci): ?string {
        return $this->valor("SELECT foto_perfil FROM usuario WHERE ci = ?", [$ci]) ?: null;
    }

    public function actualizarFoto(string $ci, ?string $archivo): void {
        $this->ejecutar("UPDATE usuario SET foto_perfil = ? WHERE ci = ?", [$archivo, $ci]);
    }

    /**
     * Borra la cuenta. Los equipos y resultados de los torneos se conservan,
     * pero se desvinculan de la persona.
     */
    public function eliminarCuenta(string $ci): void {
        $this->transaccion(function () use ($ci) {
            $this->ejecutar("DELETE FROM notificacion WHERE usuario_ci_fk = ?", [$ci]);
            $sub = "SELECT participante_id FROM participante WHERE usuario_ci_fk = ?";
            $this->ejecutar("UPDATE tabla_posiciones SET participante_id_fk = NULL WHERE participante_id_fk IN ($sub)", [$ci]);
            $this->ejecutar("UPDATE resultado SET ganador_participante_fk = NULL WHERE ganador_participante_fk IN ($sub)", [$ci]);
            $this->ejecutar("DELETE FROM enfrentamiento_participante WHERE participante_id_fk IN ($sub)", [$ci]);
            $this->ejecutar("DELETE FROM equipo_participante WHERE participante_id_fk IN ($sub)", [$ci]);
            $this->ejecutar("DELETE FROM enfrentamiento_juez WHERE juez_id_fk IN (SELECT juez_id FROM juez WHERE usuario_ci_fk = ?)", [$ci]);
            foreach (['participante', 'juez', 'organizador', 'observador'] as $tabla) $this->quitarRol($ci, $tabla);
            $this->ejecutar("DELETE FROM usuario WHERE ci = ?", [$ci]);
        });
    }
}
