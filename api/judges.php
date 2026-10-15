<?php
/** Rutas del rol juez (controller/juez_controller.php). */
require_once __DIR__ . '/bootstrap.php';

(new Router(fn() => new JuezController()))
    ->get('status',   'estado')
    ->post('request', 'solicitar')
    ->get('matches',  'misPartidos')
    ->post('result',  'cargarResultado')
    ->despachar(new Request());
