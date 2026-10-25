<?php
/** Aviso de la campana (tabla notificacion). */
class Notificacion {
    public function __construct(
        private ?int $id,
        private string $usuarioCi,
        private string $tipo,
        private string $mensaje,
        private ?int $torneoId = null,
        private ?int $refId = null,           // ej.: partido del recordatorio
        private bool $leida = false,
        private int $segundosDesde = 0
    ) {
        $this->mensaje = mb_substr($mensaje, 0, 255);
    }

    public static function desdeFila(array $f): self {
        return new self((int)$f['notificacion_id'], $f['usuario_ci_fk'], $f['tipo'], $f['mensaje'],
            $f['torneo_id_fk'] !== null ? (int)$f['torneo_id_fk'] : null,
            isset($f['ref_id']) ? (int)$f['ref_id'] : null, (bool)$f['leida'], max(0, (int)$f['hace']));
    }

    public function getId(): ?int { return $this->id; }
    public function getUsuarioCi(): string { return $this->usuarioCi; }
    public function getTipo(): string { return $this->tipo; }
    public function getMensaje(): string { return $this->mensaje; }
    public function getTorneoId(): ?int { return $this->torneoId; }
    public function getRefId(): ?int { return $this->refId; }

    public function toArray(): array {
        return ['id' => $this->id, 'tipo' => $this->tipo, 'mensaje' => $this->mensaje,
                'torneoId' => $this->torneoId, 'leida' => $this->leida, 'hace' => $this->segundosDesde];
    }
}
