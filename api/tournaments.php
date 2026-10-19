<?php
/** Rutas de torneos (controller/torneo_controller.php). */
require_once __DIR__ . '/bootstrap.php';

(new Router(fn() => new TorneoController()))
    ->get('list',          'listar')
    ->get('get',           'ver')
    ->get('catalogs',      'catalogos')
    ->get('mine',          'mios')
    ->post('create',       'crear')
    ->post('inscribirse',  'inscribirse')
    ->post('update',       'actualizar')
    ->post('delete',       'eliminar')
    ->post('add_team',     'agregarEquipo')
    ->post('update_team',  'actualizarEquipo')
    ->post('delete_team',  'eliminarEquipo')
    ->get('team_members',  'integrantesEquipo')
    ->post('remove_member', 'quitarIntegrante')
    ->post('add_match',    'agregarPartido')
    ->post('update_match', 'actualizarPartido')
    ->post('delete_match', 'eliminarPartido')
    ->post('generate_fixture', 'generarFixture')
    ->get('judges',        'jueces')
    ->post('follow',       'seguir')
    ->despachar(new Request());
