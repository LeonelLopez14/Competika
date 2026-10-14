<?php
/**
 * Error esperado de la API (dato inválido, sin permiso, no encontrado...).
 * El mensaje se muestra tal cual al usuario y el código es el estado HTTP.
 * Los errores inesperados (PDOException, etc.) NO usan esta clase: el
 * enrutador los registra en el log y devuelve un 500 genérico.
 */
class ApiException extends RuntimeException {
    public function __construct(string $mensaje, private int $status = 422) {
        parent::__construct($mensaje);
    }
    public function getStatus(): int { return $this->status; }

    public static function noEncontrado(string $que): self   { return new self("$que no encontrado.", 404); }
    public static function prohibido(string $mensaje): self  { return new self($mensaje, 403); }
}
