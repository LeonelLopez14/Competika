<?php
/**
 * Panel de administración — rutas.  Lógica en controller/admin_controller.php
 * Todas exigen una cuenta de administrador.
 */
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
    ->post('tournament_delete', 'eliminarTorneo')
    ->post('tournament_transfer', 'transferirTorneo')
    ->get('messages',           'mensajes')
    ->post('message_read',      'leerMensaje')
    ->post('message_delete',    'borrarMensaje')
    ->post('announce',          'anunciar')
    ->despachar(new Request());
