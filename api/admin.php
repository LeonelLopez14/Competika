<?php
/** Rutas del panel de administración (controller/admin_controller.php). */
require_once __DIR__ . '/bootstrap.php';

(new Router(fn() => new AdminController()))
    ->get('summary',            'resumen')
    ->get('activity',           'actividad')
    ->get('requests',           'solicitudes')
    ->post('approve',           'aprobar')
    ->post('reject',            'rechazar')
    ->get('users',              'listarUsuarios')
    ->post('user_block',        'bloquear')
    ->post('user_role',         'cambiarRol')
    ->post('user_delete',       'eliminarUsuario')
    ->get('tournaments',        'listarTorneos')
    ->post('tournament_status', 'estadoTorneo')
    ->post('tournament_approve', 'aprobarTorneo')
    ->post('tournament_reject', 'rechazarTorneo')
    ->post('tournament_delete', 'eliminarTorneo')
    ->post('tournament_transfer', 'transferirTorneo')
    ->get('messages',           'mensajes')
    ->post('message_read',      'leerMensaje')
    ->post('message_delete',    'borrarMensaje')
    ->post('announce',          'anunciar')
    ->get('catalogs',           'catalogos')
    ->post('currency_save',     'guardarMoneda')
    ->post('format_save',       'guardarFormato')
    ->despachar(new Request());
