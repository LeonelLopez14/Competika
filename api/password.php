<?php
/** Rutas de recuperación de contraseña (controller/clave_controller.php). */
require_once __DIR__ . '/bootstrap.php';

(new Router(fn() => new ClaveController()))
    ->post('forgot', 'olvide')
    ->get('check',   'verificar')
    ->post('reset',  'restablecer')
    ->despachar(new Request());
