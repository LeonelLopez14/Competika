<?php
/** Persona externa sin cuenta: árbitro o contacto de un torneo. */
class Persona {
    public function __construct(
        private ?int $id,
        private string $nombre,
        private ?string $telefono = null,
        private ?string $email = null
    ) {}

    public static function desdeFila(array $f): self {
        return new self(isset($f['persona_id']) ? (int)$f['persona_id'] : null, $f['nombre'], $f['telefono'] ?? null, $f['email'] ?? null);
    }

    /** Persona desde el formulario; null si vino vacía. */
    public static function desdeFormulario(array $d, string $quien): ?self {
        $nombre = Validar::texto($d['name'] ?? null, 150);
        $tel    = Validar::telefono($d['phone'] ?? null, "El teléfono $quien no es válido.");
        $mail   = Validar::email($d['email'] ?? null, "El correo $quien no es válido.");
        if ($nombre === null && $tel === null && $mail === null) return null;
        if ($nombre === null) throw new ApiException("Completá el nombre $quien.");
        return new self(null, $nombre, $tel, $mail);
    }

    public function getId(): ?int { return $this->id; }
    public function setId(int $id): void { $this->id = $id; }
    public function getNombre(): string { return $this->nombre; }
    public function getTelefono(): ?string { return $this->telefono; }
    public function getEmail(): ?string { return $this->email; }

    /** Mismos datos (sin importar el id). */
    public function igualA(Persona $otra): bool {
        return $this->nombre === $otra->nombre && $this->telefono === $otra->telefono && $this->email === $otra->email;
    }

    public function toArray(): array {
        return ['name' => $this->nombre, 'phone' => $this->telefono, 'email' => $this->email];
    }
}
