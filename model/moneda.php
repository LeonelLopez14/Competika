<?php
/** Moneda (catálogo moneda, ISO 4217). */
class Moneda {
    public function __construct(private string $codigo, private string $nombre, private string $simbolo, private bool $activa = true) {}

    public static function desdeFila(array $f): self {
        return new self($f['codigo'], $f['nombre'], $f['simbolo'], (bool)($f['activa'] ?? true));
    }

    /** Moneda desde el panel de administración ({code, name, symbol, active}). */
    public static function desdeFormulario(array $d): self {
        $codigo = strtoupper(trim((string)($d['code'] ?? '')));
        if (!preg_match('/^[A-Z]{3}$/', $codigo)) throw new ApiException('El código de la moneda son 3 letras (ISO 4217, por ejemplo UYU).');
        $nombre = Validar::obligatorio($d['name'] ?? null, 50, 'Escribí el nombre de la moneda (máx. 50 caracteres).');
        $simbolo = Validar::obligatorio($d['symbol'] ?? null, 5, 'Escribí el símbolo de la moneda (máx. 5 caracteres).');
        return new self($codigo, $nombre, $simbolo, !array_key_exists('active', $d) || !empty($d['active']));
    }

    public function getCodigo(): string { return $this->codigo; }
    public function getNombre(): string { return $this->nombre; }
    public function getSimbolo(): string { return $this->simbolo; }
    public function estaActiva(): bool { return $this->activa; }

    public function toArray(): array {
        return ['code' => $this->codigo, 'name' => $this->nombre, 'symbol' => $this->simbolo, 'active' => $this->activa];
    }
}
