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
    ->get('open_teams',   'abiertos')
    ->post('open',        'abrir')
    ->post('join_request', 'solicitar')
    ->get('join_profile',  'perfilSolicitante')
    ->post('join_respond', 'responderSolicitud')
    ->post('join_cancel', 'cancelarSolicitud')
    ->despachar(new Request());
