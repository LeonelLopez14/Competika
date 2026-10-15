<?php
/** Pedido de un usuario para ser juez (tabla solicitud_juez). */
class SolicitudJuez {
    public const PENDIENTE = 'pendiente';
    public const APROBADA = 'aprobada';
    public const RECHAZADA = 'rechazada';

    public function __construct(
        private ?int $id,
        private string $usuarioCi,
        private bool $certificado,
        private ?string $deportes,
        private ?string $experiencia,
        private string $estado = self::PENDIENTE,
        private ?string $fecha = null,
        private ?string $motivoRechazo = null,
        private ?string $nombreUsuario = null,      // para el panel de administración
        private ?string $emailUsuario = null
    ) {}

    public static function desdeFila(array $f): self {
        return new self((int)$f['solicitud_id'], $f['usuario_ci_fk'], (bool)$f['certificado'], $f['deportes'], $f['experiencia'],
            $f['estado'], $f['fecha'], $f['motivo_rechazo'], $f['nombre_completo'] ?? null, $f['email'] ?? null);
    }

    /** Arma la solicitud con lo que mandó el formulario. */
    public static function desdeFormulario(string $ci, array $d): self {
        $deportes = Validar::texto($d['deportes'] ?? null, 150);
        $experiencia = Validar::texto($d['experiencia'] ?? null, 500);
        if ($deportes === null) throw new ApiException('Indicá en qué deportes podés arbitrar.');
        if ($experiencia === null || mb_strlen($experiencia) < 20) {
            throw new ApiException('Contá brevemente tu experiencia como juez o árbitro (al menos 20 caracteres).');
        }
        return new self(null, $ci, !empty($d['certificado']), $deportes, $experiencia);
    }

    public function getId(): ?int { return $this->id; }
    public function getUsuarioCi(): string { return $this->usuarioCi; }
    public function tieneCertificado(): bool { return $this->certificado; }
    public function getDeportes(): ?string { return $this->deportes; }
    public function getExperiencia(): ?string { return $this->experiencia; }
    public function getEstado(): string { return $this->estado; }
    public function estaPendiente(): bool { return $this->estado === self::PENDIENTE; }

    public function toArray(): array {
        return [
            'id' => $this->id, 'certificado' => $this->certificado, 'deportes' => $this->deportes,
            'experiencia' => $this->experiencia, 'estado' => $this->estado, 'fecha' => $this->fecha,
            'motivo' => $this->motivoRechazo, 'nombre' => $this->nombreUsuario, 'email' => $this->emailUsuario,
        ];
    }
}
