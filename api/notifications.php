<?php
/** Rutas de notificaciones (controller/notificacion_controller.php). */
require_once __DIR__ . '/bootstrap.php';

(new Router(fn() => new NotificacionController()))
    ->get('list',      'listar')
    ->get('stream',    'stream')
    ->post('read',     'leer')
    ->post('read_all', 'leerTodas')
    ->despachar(new Request());
