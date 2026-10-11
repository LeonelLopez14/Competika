<?php
/**
 * "Continuar como invitado": cierra cualquier sesión de usuario y deja una
 * sesión de invitado, que puede navegar y ver torneos pero no crear ni
 * unirse (para eso la API pide iniciar sesión).
 */
require_once __DIR__ . '/../config/session.php';
rechazarOrigenAjeno();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Location: ../frontend/paginas/login/login.html');
    exit;
}

$_SESSION = [];
session_regenerate_id(true);
$_SESSION['invitado'] = true;

header('Location: ../frontend/index.html');
exit;
