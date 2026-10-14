<?php
/** Partido (tabla enfrentamiento + enfrentamiento_equipo + último resultado). */
class Partido {
    public const FASE_POR_DEFECTO = 'Fase de Grupos';

    public function __construct(
        private ?int $id,
        private int $torneoId,
        private ?int $localId,
        private ?int $visitanteId,
        private ?string $fecha,          // 'Y-m-d H:i:s' o null
        private ?string $ubicacion,
        private string $fase = self::FASE_POR_DEFECTO,
        private ?Resultado $resultado = null
    ) {}

    public static function desdeFila(array $f): self {
        $res = null;
        if (array_key_exists('res_estado', $f) && $f['res_estado'] !== null) {
            $res = new Resultado(
                $f['puntaje_a'] !== null ? (float)$f['puntaje_a'] : null,
                $f['puntaje_b'] !== null ? (float)$f['puntaje_b'] : null,
                $f['res_estado'], isset($f['ganador_equipo_fk']) ? (int)$f['ganador_equipo_fk'] : null,
                isset($f['resultado_id']) ? (int)$f['resultado_id'] : null
            );
        }
        return new self((int)$f['enfrentamiento_id'], (int)$f['torneo_id_fk'],
            $f['eq_local'] !== null ? (int)$f['eq_local'] : null,
            $f['eq_visitante'] !== null ? (int)$f['eq_visitante'] : null,
            $f['fecha'], $f['ubicacion'], $f['fase'] ?: self::FASE_POR_DEFECTO, $res);
    }

    /** Fecha y hora del formulario -> DATETIME (sin hora = 00:00). */
    public static function fechaDesde(?string $fecha, ?string $hora): ?string {
        Validar::fecha($fecha);
        Validar::hora($hora);
        if ($fecha === null) return null;
        return $fecha . ' ' . ($hora !== null ? substr($hora . ':00', 0, 8) : '00:00:00');
    }

    public function getId(): ?int { return $this->id; }
    public function setId(int $id): void { $this->id = $id; }
    public function getTorneoId(): int { return $this->torneoId; }
    public function getLocalId(): ?int { return $this->localId; }
    public function getVisitanteId(): ?int { return $this->visitanteId; }
    public function getFecha(): ?string { return $this->fecha; }
    public function getUbicacion(): ?string { return $this->ubicacion; }
    public function getFase(): string { return $this->fase; }
    public function getResultado(): ?Resultado { return $this->resultado; }
    public function setResultado(?Resultado $r): void { $this->resultado = $r; }
    public function estaJugado(): bool { return $this->resultado !== null && $this->resultado->estaJugado(); }

    /** Rival de un equipo en este partido (null si el equipo no juega o falta el rival). */
    public function rivalDe(int $equipoId): ?int {
        if ($equipoId === $this->localId) return $this->visitanteId;
        if ($equipoId === $this->visitanteId) return $this->localId;
        return null;
    }

    public function mismosDatos(Partido $otro): bool {
        return $this->fecha === $otro->fecha && $this->ubicacion === $otro->ubicacion
            && $this->localId === $otro->localId && $this->visitanteId === $otro->visitanteId;
    }

    public function toArray(): array {
        $jugado = $this->estaJugado();
        return [
            'id'        => (string)$this->id,
            'home'      => $this->localId !== null ? (string)$this->localId : null,
            'away'      => $this->visitanteId !== null ? (string)$this->visitanteId : null,
            'homeScore' => $jugado ? Formato::numero($this->resultado->getLocal()) : null,
            'awayScore' => $jugado ? Formato::numero($this->resultado->getVisitante()) : null,
            'date'      => $this->fecha ? substr($this->fecha, 0, 10) : null,
            'time'      => $this->fecha ? substr($this->fecha, 11, 5) : null,
            'venue'     => $this->ubicacion,
            'phase'     => $this->fase,
            'played'    => $jugado,
        ];
    }
}
