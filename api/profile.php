<?php
/**
 * API de la cuenta logueada — rutas.  Lógica en controller/perfil_controller.php
 *
 *   GET  ?action=me | activity
 *   POST ?action=update {nombre, apellido, nombreUsuario, telefono, biografia, roles}
 *   POST ?action=email {email, password} | password {current, next}
 *   POST ?action=avatar (multipart, campo "avatar") | avatar_delete
 *   POST ?action=delete_account {password, confirm:"ELIMINAR"}
 *   POST ?action=honor {matchId}
 */
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
