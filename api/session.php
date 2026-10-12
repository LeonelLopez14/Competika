<?php
/**
 * Estado de la sesión actual, leído siempre desde la base de datos
 * (así el navbar y el perfil muestran la cuenta correcta después de
 * iniciar sesión con otra cuenta o de editar el perfil).
 *
 *   { logged: false }   -> el sitio muestra "Invitado"
 *   { logged: true, nombre, apellido, email, telefono, rol, roles{...}, foto, nombreUsuario }
 */
require_once __DIR__ . '/bootstrap.php';

$ci = currentCi();
if ($ci === null) {
    echo json_encode(['logged' => false]);
    exit;
}

try {
    $pdo = db();
    $s = $pdo->prepare("SELECT nombre, apellido, email, telefono, rol_usuario, nombre_usuario, foto_perfil FROM usuario WHERE ci = ?");
    $s->execute([$ci]);
    $u = $s->fetch();
} catch (Throwable $e) {
    failInternal($e);
}

if (!$u) {                     // la cuenta ya no existe: se cierra la sesión
    $_SESSION = [];
    session_destroy();
    echo json_encode(['logged' => false]);
    exit;
}

echo json_encode([
    'logged'        => true,
    'nombre'        => $u['nombre'],
    'apellido'      => $u['apellido'],
    'email'         => $u['email'],
    'telefono'      => $u['telefono'],
    'rol'           => $u['rol_usuario'],
    'roles'         => userRoles($pdo, $ci),
    'foto'          => fotoUrl($u['foto_perfil']),
    'nombreUsuario' => $u['nombre_usuario'],
], JSON_UNESCAPED_UNICODE);
