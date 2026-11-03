<?php
/** Rutas del rol juez (controller/juez_controller.php). */
require_once __DIR__ . '/bootstrap.php';

(new Router(fn() => new JuezController()))
    ->get('status',      'estado')
    ->post('request',    'solicitar')
    ->get('invitations', 'invitaciones')
    ->post('respond',    'responderInvitacion')
    ->post('department', 'guardarDepartamento')
    ->get('matches',     'misPartidos')
    ->post('result',     'cargarResultado')
    ->despachar(new Request());
