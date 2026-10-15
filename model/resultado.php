<?php
/** Resultado de un partido. puntaje_a = local, puntaje_b = visitante. */
class Resultado {
    public const PENDIENTE = 'pendiente';
    public const FINALIZADO = 'finalizado';
    public const EMPATE = 'empate';

    public function __construct(
        private ?float $local,
        private ?float $visitante,
        private string $estado = self::PENDIENTE,
        private ?int $ganadorEquipoId = null,
        private ?int $id = null
    ) {}

    /** Resultado de un partido jugado: decide estado y ganador a partir del marcador. */
    public static function jugado(int $localId, int $visitanteId, float $local, float $visitante): self {
        if ($local < 0 || $visitante < 0) throw new ApiException('Ingresá el marcador de ambos equipos.');
        $empate = $local == $visitante;
        return new self($local, $visitante, $empate ? self::EMPATE : self::FINALIZADO,
            $empate ? null : ($local > $visitante ? $localId : $visitanteId));
    }

    public function getId(): ?int { return $this->id; }
    public function getLocal(): ?float { return $this->local; }
    public function getVisitante(): ?float { return $this->visitante; }
    public function getEstado(): string { return $this->estado; }
    public function getGanadorEquipoId(): ?int { return $this->ganadorEquipoId; }
    public function estaJugado(): bool { return $this->estado === self::FINALIZADO || $this->estado === self::EMPATE; }

    public function igualMarcador(?Resultado $otro): bool {
        return $otro !== null && $otro->estaJugado() && $this->local == $otro->local && $this->visitante == $otro->visitante;
    }
}
