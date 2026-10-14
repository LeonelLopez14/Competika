<?php
/**
 * Carga automática de clases (sin Composer).
 * Cada clase vive en un archivo con su nombre en snake_case dentro de su capa:
 *   model/       entidades (Torneo, Equipo, Partido, ...)
 *   repository/  acceso a datos (TorneoRepository, ...)
 *   service/     reglas de negocio compartidas (Notificador, ...)
 *   controller/  controladores de la API (TorneoController, ...)
 *   core/        infraestructura (Request, Auth, ApiException, ...)
 */
require_once __DIR__ . '/../config/database.php';

spl_autoload_register(function (string $clase): void {
    $archivo = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $clase)) . '.php';
    $raiz = dirname(__DIR__);
    if (str_ends_with($clase, 'Repository')) {
        $carpetas = ['repository'];
        $archivo = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', substr($clase, 0, -10))) . '_repository.php';
    } elseif (str_ends_with($clase, 'Controller')) {
        $carpetas = ['controller'];
        $archivo = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', substr($clase, 0, -10))) . '_controller.php';
    } else {
        $carpetas = ['model', 'service', 'core'];
    }
    foreach ($carpetas as $c) {
        if (is_file("$raiz/$c/$archivo")) { require_once "$raiz/$c/$archivo"; return; }
    }
});
