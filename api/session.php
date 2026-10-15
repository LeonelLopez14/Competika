<?php
/** Estado de la sesión — ruta única.  Lógica en controller/sesion_controller.php */
require_once __DIR__ . '/bootstrap.php';

try {
    Response::json((new SesionController())->estado());
} catch (Throwable $e) {
    Response::errorInterno($e);
}
