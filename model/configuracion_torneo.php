<?php
/** Configuración de un torneo (tabla configuracion_torneo): cupo, costos, premios, moneda, árbitro y contacto. */
class ConfiguracionTorneo {
    public const CUPO_POR_DEFECTO = 8;

    public function __construct(
        private ?int $id = null,
        private int $cupo = self::CUPO_POR_DEFECTO,
        private float $precioInscripcion = 0,
        private float $alquilerLugar = 0,
        private float $precioJuez = 0,
        private ?string $premios = null,
        private ?Moneda $moneda = null,
        private ?Persona $arbitro = null,
        private ?Persona $contacto = null      // null = se usan los datos de la cuenta del organizador
    ) {}

    public static function desdeFila(array $f): self {
        return new self(
            isset($f['configuracion_id']) ? (int)$f['configuracion_id'] : null,
            (int)($f['cant_equipos'] ?? self::CUPO_POR_DEFECTO) ?: self::CUPO_POR_DEFECTO,
            (float)($f['precio_participacion'] ?? 0),
            (float)($f['alquiler_lugar'] ?? 0),
            (float)($f['precio_juez'] ?? 0),
            $f['premios'] ?? null,
            !empty($f['moneda_codigo']) ? new Moneda($f['moneda_codigo'], $f['moneda_nombre'], $f['moneda_simbolo']) : null,
            !empty($f['arb_id']) ? new Persona((int)$f['arb_id'], $f['arb_nombre'], $f['arb_telefono'], $f['arb_email']) : null,
            !empty($f['con_id']) ? new Persona((int)$f['con_id'], $f['con_nombre'], $f['con_telefono'], $f['con_email']) : null,
        );
    }

    public function getId(): ?int { return $this->id; }
    public function getCupo(): int { return $this->cupo; }
    public function getPrecioInscripcion(): float { return $this->precioInscripcion; }
    public function getAlquilerLugar(): float { return $this->alquilerLugar; }
    public function getPrecioJuez(): float { return $this->precioJuez; }
    public function getPremios(): ?string { return $this->premios; }
    public function getMoneda(): ?Moneda { return $this->moneda; }
    public function getArbitro(): ?Persona { return $this->arbitro; }
    public function getContacto(): ?Persona { return $this->contacto; }

    public function setCupo(int $c): void { $this->cupo = $c; }
    public function setPrecioInscripcion(float $v): void { $this->precioInscripcion = $v; }
    public function setAlquilerLugar(float $v): void { $this->alquilerLugar = $v; }
    public function setPrecioJuez(float $v): void { $this->precioJuez = $v; }
    public function setPremios(?string $p): void { $this->premios = $p; }
    public function setMoneda(?Moneda $m): void { $this->moneda = $m; }
    public function setArbitro(?Persona $p): void { $this->arbitro = $p; }
    public function setContacto(?Persona $p): void { $this->contacto = $p; }

    public function costosToArray(): array {
        return [
            'entryFee'       => Formato::numero($this->precioInscripcion) ?? 0,
            'fieldCost'      => Formato::numero($this->alquilerLugar) ?? 0,
            'refereeCost'    => Formato::numero($this->precioJuez) ?? 0,
            'currency'       => $this->moneda?->getCodigo(),
            'currencySymbol' => $this->moneda?->getSimbolo() ?? '$',
        ];
    }
}
