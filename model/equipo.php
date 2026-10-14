<?php
/** Equipo inscripto en un torneo, con sus estadísticas de la tabla de posiciones. */
class Equipo {
    private const EMOJIS = ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🥍','🏒'];

    public function __construct(
        private ?int $id,
        private string $nombre,
        private int $tamanio = 1,
        private int $puntos = 0,
        private int $ganados = 0,
        private int $empatados = 0,
        private int $perdidos = 0
    ) {}

    public static function desdeFila(array $f): self {
        return new self((int)$f['equipo_id'], $f['nombre'], (int)($f['tamanio'] ?? 1),
            (int)($f['puntos'] ?? 0), (int)($f['partidos_ganados'] ?? 0),
            (int)($f['partidos_empatados'] ?? 0), (int)($f['partidos_perdidos'] ?? 0));
    }

    public static function validarNombre($v): string {
        return Validar::obligatorio($v, 100, 'El nombre del equipo es obligatorio (máx. 100 caracteres).');
    }
    public static function validarJugadores($v): int {
        return Validar::enteroEntre($v, 1, 500, 'Cantidad de jugadores inválida.');
    }

    public function getId(): ?int { return $this->id; }
    public function setId(int $id): void { $this->id = $id; }
    public function getNombre(): string { return $this->nombre; }
    public function getTamanio(): int { return $this->tamanio; }
    public function getPuntos(): int { return $this->puntos; }
    public function getGanados(): int { return $this->ganados; }

    /** $posicion = orden de inscripción (solo define el emoji). */
    public function toArray(int $posicion): array {
        return [
            'id' => (string)$this->id, 'name' => $this->nombre, 'players' => $this->tamanio,
            'wins' => $this->ganados, 'losses' => $this->perdidos, 'draws' => $this->empatados,
            'points' => $this->puntos, 'status' => 'accepted', 'group' => null,
            'emoji' => self::EMOJIS[$posicion % count(self::EMOJIS)],
        ];
    }
}
