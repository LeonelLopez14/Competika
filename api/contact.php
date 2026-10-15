<?php
/** Formulario de Contacto — POST ?action=send {nombre, email, asunto, mensaje} */
require_once __DIR__ . '/bootstrap.php';

(new Router(fn() => new ContactoController()))
    ->post('send', 'enviar')
    ->despachar(new Request());
