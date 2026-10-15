<?php
/** Cuenta del sitio (tabla usuario). La contraseña solo se guarda hasheada. */
class Usuario {
    private string $ci;
    private string $nombre;
    private string $apellido;
    private ?string $telefono;
    private ?string $direccion;
    private ?string $fechaNac;
    private string $email;
    private string $contrasenia;
    private string $rolUsuario;
    private ?string $nombreUsuario;
    private ?string $biografia;
    private ?string $fotoPerfil;

    public function __construct(
        string $ci, string $nombre, string $apellido,
        ?string $telefono, ?string $direccion, ?string $fechaNac,
        string $email, string $contrasenia, string $rolUsuario,
        ?string $nombreUsuario = null, ?string $biografia = null, ?string $fotoPerfil = null
    ) {
        $this->ci = $ci;
        $this->nombre = $nombre;
        $this->apellido = $apellido;
        $this->telefono = $telefono;
        $this->direccion = $direccion;
        $this->fechaNac = $fechaNac;
        $this->email = $email;
        $this->contrasenia = $contrasenia;
        $this->rolUsuario = $rolUsuario;
        $this->nombreUsuario = $nombreUsuario;
        $this->biografia = $biografia;
        $this->fotoPerfil = $fotoPerfil;
    }

    public static function desdeFila(array $f): self {
        return new self($f['ci'], $f['nombre'], $f['apellido'], $f['telefono'] ?? null, $f['direccion'] ?? null,
            $f['fecha_nac'] ?? null, $f['email'], $f['contrasenia'] ?? '', $f['rol_usuario'],
            $f['nombre_usuario'] ?? null, $f['biografia'] ?? null, $f['foto_perfil'] ?? null);
    }

    public function getCi(): string { return $this->ci; }
    public function getNombre(): string { return $this->nombre; }
    public function getApellido(): string { return $this->apellido; }
    public function getNombreCompleto(): string { return trim($this->nombre . ' ' . $this->apellido); }
    public function getTelefono(): ?string { return $this->telefono; }
    public function getDireccion(): ?string { return $this->direccion; }
    public function getFechaNac(): ?string { return $this->fechaNac; }
    public function getEmail(): string { return $this->email; }
    public function getContrasenia(): string { return $this->contrasenia; }
    public function getRolUsuario(): string { return $this->rolUsuario; }
    public function getNombreUsuario(): ?string { return $this->nombreUsuario; }
    public function getBiografia(): ?string { return $this->biografia; }
    public function getFotoPerfil(): ?string { return $this->fotoPerfil; }

    /** Datos de contacto de la cuenta como Persona (para el contacto de sus torneos). */
    public function comoPersona(): Persona {
        return new Persona(null, $this->getNombreCompleto(), $this->telefono, $this->email);
    }

    /** Datos públicos de la cuenta (nunca incluye la contraseña). */
    public function toArray(array $roles): array {
        return [
            'nombre'        => $this->nombre,
            'apellido'      => $this->apellido,
            'telefono'      => $this->telefono,
            'direccion'     => $this->direccion,
            'fechaNac'      => $this->fechaNac,
            'email'         => $this->email,
            'rol'           => $this->rolUsuario,
            'nombreUsuario' => $this->nombreUsuario,
            'biografia'     => $this->biografia,
            'foto'          => Formato::fotoUrl($this->fotoPerfil),
            'roles'         => $roles,
        ];
    }
}
