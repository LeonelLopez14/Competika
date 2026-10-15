<?php
/** POST del formulario de login. Lógica en controller/cuenta_controller.php */
require_once __DIR__ . '/cuenta_controller.php';
rechazarOrigenAjeno();
(new CuentaController())->login();
