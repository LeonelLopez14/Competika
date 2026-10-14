<?php
/**
 * API de torneos — rutas.  Lógica en controller/torneo_controller.php
 *
 * Públicas:
 *   GET  ?action=list | get&id=5 | catalogs
 * Con sesión:
 *   GET  ?action=mine
 *   POST ?action=create | inscribirse {torneoId, teamName}
 * Solo el organizador del torneo:
 *   POST ?action=update&id=5      | delete&id=5
 *   POST ?action=add_team&id=5    | update_team&team_id=9 | delete_team&team_id=9
 *   POST ?action=add_match&id=5   | update_match&match_id=3 | delete_match&match_id=3
 */
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
    ->post('add_match',    'agregarPartido')
    ->post('update_match', 'actualizarPartido')
    ->post('delete_match', 'eliminarPartido')
    ->despachar(new Request());
