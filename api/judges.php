<?php
/**
 * API del rol juez — rutas.  Lógica en controller/juez_controller.php
 *
 *   GET  ?action=status                 ¿soy juez? + mi última solicitud
 *   POST ?action=request {certificado, deportes, experiencia}
 *   GET  ?action=matches                partidos que tengo asignados
 *   POST ?action=result {matchId, homeScore, awayScore}
 */
require_once __DIR__ . '/bootstrap.php';

(new Router(fn() => new JuezController()))
    ->get('status',   'estado')
    ->post('request', 'solicitar')
    ->get('matches',  'misPartidos')
    ->post('result',  'cargarResultado')
    ->despachar(new Request());
