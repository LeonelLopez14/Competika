<?php
/** Moneda (catálogo moneda, ISO 4217). */
class Moneda {
    public function __construct(private string $codigo, private string $nombre, private string $simbolo) {}

    public static function desdeFila(array $f): self {
        return new self($f['codigo'], $f['nombre'], $f['simbolo']);
    }

    public function getCodigo(): string { return $this->codigo; }
    public function getNombre(): string { return $this->nombre; }
    public function getSimbolo(): string { return $this->simbolo; }

    public function toArray(): array {
        return ['code' => $this->codigo, 'name' => $this->nombre, 'symbol' => $this->simbolo];
    }
}
