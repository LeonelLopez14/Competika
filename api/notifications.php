<?php
/**
 * API de notificaciones — rutas.  Lógica en controller/notificacion_controller.php
 *
 *   GET  ?action=list           últimas 30 + cantidad sin leer
 *   GET  ?action=stream         tiempo real (Server-Sent Events)
 *   POST ?action=read {id} | read_all
 */
require_once __DIR__ . '/bootstrap.php';

(new Router(fn() => new NotificacionController()))
    ->get('list',      'listar')
    ->get('stream',    'stream')
    ->post('read',     'leer')
    ->post('read_all', 'leerTodas')
    ->despachar(new Request());
