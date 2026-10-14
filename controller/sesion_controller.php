<?php
require_once __DIR__ . '/../core/autoload.php';

/**
 * Estado de la sesión (api/session.php), leído siempre desde la base: así
 * el menú muestra la cuenta correcta después de cambiar de cuenta o de
 * editar el perfil.  { logged:false } -> el sitio muestra "Invitado".
 */
class SesionController {
    private UsuarioRepository $usuarios;

    public function __construct() {
        $this->usuarios = new UsuarioRepository();
    }

    public function estado(): array {
        $ci = Auth::ci();
        if ($ci === null) return ['logged' => false];
        $u = $this->usuarios->buscar($ci);
        if ($u === null) {                 // la cuenta ya no existe: se cierra la sesión
            $_SESSION = [];
            session_destroy();
            return ['logged' => false];
        }
        return [
            'logged'        => true,
            'nombre'        => $u->getNombre(),
            'apellido'      => $u->getApellido(),
            'email'         => $u->getEmail(),
            'telefono'      => $u->getTelefono(),
            'rol'           => $u->getRolUsuario(),
            'roles'         => $this->usuarios->roles($ci),
            'foto'          => Formato::fotoUrl($u->getFotoPerfil()),
            'nombreUsuario' => $u->getNombreUsuario(),
        ];
    }
}
