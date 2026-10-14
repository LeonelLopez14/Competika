<?php
/** Formato de torneo (catálogo tipo_torneo). */
class TipoTorneo {
    public function __construct(
        private int $id,
        private string $nombre,      // nombre interno en la base (liga_t_vs_t, ...)
        private ?string $clave,      // id que usa el frontend (liga-simple, ...)
        private ?string $etiqueta,   // texto para mostrar
        private ?string $categoria   // liga | eliminacion | puntos | mixto | especial
    ) {}

    public static function desdeFila(array $f): self {
        return new self((int)$f['tipo_torneo_id'], $f['nombre'], $f['clave'] ?? null, $f['etiqueta'] ?? null, $f['categoria'] ?? null);
    }

    public function getId(): int { return $this->id; }
    public function getNombre(): string { return $this->nombre; }
    public function getClave(): ?string { return $this->clave; }
    public function getEtiqueta(): string { return $this->etiqueta ?? $this->nombre; }
    public function getCategoria(): ?string { return $this->categoria; }

    public function toArray(): array {
        return ['id' => $this->clave, 'label' => $this->getEtiqueta(), 'category' => $this->categoria];
    }
}
