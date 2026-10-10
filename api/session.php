<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (empty($_SESSION['usuario_ci'])) {
    echo json_encode(['logged' => false]);
    exit;
}

echo json_encode([
    'logged'   => true,
    'ci'       => $_SESSION['usuario_ci'],
    'nombre'   => $_SESSION['usuario_nombre'] ?? '',
    'apellido' => $_SESSION['usuario_apellido'] ?? '',
    'email'    => $_SESSION['usuario_email'] ?? '',
    'rol'      => $_SESSION['usuario_rol'] ?? ''
]);
