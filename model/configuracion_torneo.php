<?php
/** Configuración de un torneo (tabla configuracion_torneo). */
class ConfiguracionTorneo {
    public const CUPO_POR_DEFECTO = 8;
    public const VIDAS_POR_DEFECTO = 3;

    private bool $competitivo = false;
    private int $jugadoresPorEquipo = 1;
    private ?int $vidas = null;
    private ?int $cantGrupos = null;
    private ?int $juezPrincipalId = null;
    private ?string $juezPrincipalNombre = null;

    public function __construct(
        private ?int $id = null,
        private int $cupo = self::CUPO_POR_DEFECTO,
        private float $precioInscripcion = 0,
        private float $alquilerLugar = 0,
        private float $precioJuez = 0,
        private ?Moneda $moneda = null,
        private ?Persona $arbitro = null,
        private ?Persona $contacto = null      // null = datos de la cuenta del organizador
    ) {}

    public static function desdeFila(array $f): self {
        $c = new self(
            isset($f['configuracion_id']) ? (int)$f['configuracion_id'] : null,
            (int)($f['cant_equipos'] ?? self::CUPO_POR_DEFECTO) ?: self::CUPO_POR_DEFECTO,
            (float)($f['precio_participacion'] ?? 0),
            (float)($f['alquiler_lugar'] ?? 0),
            (float)($f['precio_juez'] ?? 0),
            !empty($f['moneda_codigo']) ? new Moneda($f['moneda_codigo'], $f['moneda_nombre'], $f['moneda_simbolo']) : null,
            !empty($f['arb_id']) ? new Persona((int)$f['arb_id'], $f['arb_nombre'], $f['arb_telefono'], $f['arb_email']) : null,
            !empty($f['con_id']) ? new Persona((int)$f['con_id'], $f['con_nombre'], $f['con_telefono'], $f['con_email']) : null,
        );
        $c->competitivo = !empty($f['competitivo']);
        $c->jugadoresPorEquipo = max(1, (int)($f['cant_participante'] ?? 1));
        $c->vidas = isset($f['vidas']) ? (int)$f['vidas'] : null;
        $c->cantGrupos = isset($f['cant_grupos']) ? (int)$f['cant_grupos'] : null;
        $c->juezPrincipalId = isset($f['juez_principal_fk']) ? (int)$f['juez_principal_fk'] : null;
        $c->juezPrincipalNombre = $f['juez_principal_nombre'] ?? null;
        return $c;
    }

    public function getId(): ?int { return $this->id; }
    public function getCupo(): int { return $this->cupo; }
    public function getPrecioInscripcion(): float { return $this->precioInscripcion; }
    public function getAlquilerLugar(): float { return $this->alquilerLugar; }
    public function getPrecioJuez(): float { return $this->precioJuez; }
    public function getMoneda(): ?Moneda { return $this->moneda; }
    public function getArbitro(): ?Persona { return $this->arbitro; }
    public function getContacto(): ?Persona { return $this->contacto; }
    public function esCompetitivo(): bool { return $this->competitivo; }
    public function getJugadoresPorEquipo(): int { return $this->jugadoresPorEquipo; }
    public function getVidas(): int { return $this->vidas ?? self::VIDAS_POR_DEFECTO; }
    public function getCantGrupos(): ?int { return $this->cantGrupos; }
    public function getJuezPrincipalId(): ?int { return $this->juezPrincipalId; }

    public function setCupo(int $c): void { $this->cupo = $c; }
    public function setPrecioInscripcion(float $v): void { $this->precioInscripcion = $v; }
    public function setAlquilerLugar(float $v): void { $this->alquilerLugar = $v; }
    public function setPrecioJuez(float $v): void { $this->precioJuez = $v; }
    public function setMoneda(?Moneda $m): void { $this->moneda = $m; }
    public function setArbitro(?Persona $p): void { $this->arbitro = $p; }
    public function setContacto(?Persona $p): void { $this->contacto = $p; }
    public function setCompetitivo(bool $v): void { $this->competitivo = $v; }
    public function setJugadoresPorEquipo(int $n): void { $this->jugadoresPorEquipo = $n; }
    public function setVidas(?int $n): void { $this->vidas = $n; }
    public function setCantGrupos(?int $n): void { $this->cantGrupos = $n; }
    public function setJuezPrincipalId(?int $id): void { $this->juezPrincipalId = $id; }

    public function costosToArray(): array {
        return [
            'entryFee'       => Formato::numero($this->precioInscripcion) ?? 0,
            'fieldCost'      => Formato::numero($this->alquilerLugar) ?? 0,
            'refereeCost'    => Formato::numero($this->precioJuez) ?? 0,
            'currency'       => $this->moneda?->getCodigo(),
            'currencySymbol' => $this->moneda?->getSimbolo() ?? '$',
        ];
    }

    public function reglasToArray(): array {
        return [
            'competitive'    => $this->competitivo,
            'playersPerTeam' => $this->jugadoresPorEquipo,
            'lives'          => $this->getVidas(),
            'groups'         => $this->cantGrupos,
            'mainJudgeId'    => $this->juezPrincipalId !== null ? (string)$this->juezPrincipalId : null,
            'mainJudgeName'  => $this->juezPrincipalNombre,
        ];
    }
}
