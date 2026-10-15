<?php
/**
 * Equipos e invitaciones — rutas.  Lógica en controller/equipo_controller.php
 *
 *   GET  ?action=mine&id=TORNEO | invitations
 *   POST ?action=invite {torneoId, email} | respond {id, accept} | cancel {id}
 *   POST ?action=remove {torneoId, member} | leave {torneoId}
 */
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
