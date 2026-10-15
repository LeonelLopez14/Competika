<?php
/** Error esperado de la API: mensaje para el usuario y código HTTP. */
class ApiException extends RuntimeException {
    public function __construct(string $mensaje, private int $status = 422) {
        parent::__construct($mensaje);
    }
    public function getStatus(): int { return $this->status; }

    public static function noEncontrado(string $que): self   { return new self("$que no encontrado.", 404); }
    public static function prohibido(string $mensaje): self  { return new self($mensaje, 403); }
}
