<?php
/** Cerrar sesión. Lógica en controller/cuenta_controller.php */
require_once __DIR__ . '/cuenta_controller.php';
(new CuentaController())->logout();
