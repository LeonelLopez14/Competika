<?php
/**
 * Recuperación de contraseña — rutas.  Lógica en controller/clave_controller.php
 *
 *   POST ?action=forgot {email}
 *   GET  ?action=check&token=...
 *   POST ?action=reset {token, password, confirm}
 */
require_once __DIR__ . '/bootstrap.php';

(new Router(fn() => new ClaveController()))
    ->post('forgot', 'olvide')
    ->get('check',   'verificar')
    ->post('reset',  'restablecer')
    ->despachar(new Request());
