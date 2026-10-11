<?php
/**
 * Estado de la sesión actual, leído siempre desde la base de datos
 * (así el navbar y el perfil muestran la cuenta correcta después de
 * iniciar sesión con otra cuenta o de editar el perfil).
 *
 *   { logged: false, invitado: bool }
 *   { logged: true, nombre, apellido, email, rol, roles{...}, foto, nombreUsuario }
 */
require_once __DIR__ . '/bootstrap.php';

$ci = currentCi();
if ($ci === null) {
    echo json_encode(['logged' => false, 'invitado' => !empty($_SESSION['invitado'])]);
    exit;
}

try {
    $pdo = db();
    $s = $pdo->prepare("SELECT nombre, apellido, email, rol_usuario, nombre_usuario, foto_perfil FROM usuario WHERE ci = ?");
    $s->execute([$ci]);
    $u = $s->fetch();
} catch (Throwable $e) {
    failInternal($e);
}

if (!$u) {                     // la cuenta ya no existe: se cierra la sesión
    $_SESSION = [];
    session_destroy();
    echo json_encode(['logged' => false, 'invitado' => false]);
    exit;
}

echo json_encode([
    'logged'        => true,
    'invitado'      => false,
    'nombre'        => $u['nombre'],
    'apellido'      => $u['apellido'],
    'email'         => $u['email'],
    'rol'           => $u['rol_usuario'],
    'roles'         => userRoles($pdo, $ci),
    'foto'          => fotoUrl($u['foto_perfil']),
    'nombreUsuario' => $u['nombre_usuario'],
], JSON_UNESCAPED_UNICODE);
