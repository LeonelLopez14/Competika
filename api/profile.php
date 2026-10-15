<?php
/** Rutas de la cuenta logueada (controller/perfil_controller.php). */
require_once __DIR__ . '/bootstrap.php';

(new Router(fn() => new PerfilController()))
    ->get('me',              'me')
    ->get('activity',        'actividad')
    ->post('update',         'actualizar')
    ->post('email',          'email')
    ->post('password',       'password')
    ->post('avatar',         'subirAvatar')
    ->post('avatar_delete',  'borrarAvatar')
    ->post('delete_account', 'eliminarCuenta')
    ->post('honor',          'honor')
    ->despachar(new Request());
