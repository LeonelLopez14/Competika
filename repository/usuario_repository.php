<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../model/usuario.php';

class UsuarioRepository {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

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
        $sql = "SELECT ci FROM usuario WHERE email = :email";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':email' => $email]);
        return $stmt->fetch() !== false;
    }

    public function existeCi(string $ci): bool {
        $sql = "SELECT ci FROM usuario WHERE ci = :ci";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':ci' => $ci]);
        return $stmt->fetch() !== false;
    }

    public function obtenerPorEmail(string $email): ?array {
    $sql = "SELECT * FROM usuario WHERE email = :email";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([':email' => $email]);
    $data = $stmt->fetch();
    return $data ?: null;
}

public function crearOrganizador(string $ci): bool {
    $sql = "INSERT INTO organizador (usuario_ci_fk) VALUES (:ci)";
    $stmt = $this->db->prepare($sql);
    return $stmt->execute([':ci' => $ci]);
}

public function crearParticipante(string $ci): bool {
    $sql = "INSERT INTO participante (usuario_ci_fk) VALUES (:ci)";
    $stmt = $this->db->prepare($sql);
    return $stmt->execute([':ci' => $ci]);
}

public function crearObservador(string $ci): bool {
    $sql = "INSERT INTO observador (usuario_ci_fk) VALUES (:ci)";
    $stmt = $this->db->prepare($sql);
    return $stmt->execute([':ci' => $ci]);
}


}