<?php
/** Rutas de equipos e invitaciones (controller/equipo_controller.php). */
require_once __DIR__ . '/bootstrap.php';

(new Router(fn() => new EquipoController()))
    ->get('mine',         'miEquipo')
    ->get('invitations',  'misInvitaciones')
    ->post('invite',      'invitar')
    ->post('respond',     'responder')
    ->post('cancel',      'cancelarInvitacion')
    ->post('remove',      'quitar')
    ->post('leave',       'salir')
    ->despachar(new Request());
