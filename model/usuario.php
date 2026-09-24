<?php
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

    public function __construct(
        string $ci, string $nombre, string $apellido,
        ?string $telefono, ?string $direccion, ?string $fechaNac,
        string $email, string $contrasenia, string $rolUsuario
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
    }

    public function getCi(): string { return $this->ci; }
    public function getNombre(): string { return $this->nombre; }
    public function getApellido(): string { return $this->apellido; }
    public function getTelefono(): ?string { return $this->telefono; }
    public function getDireccion(): ?string { return $this->direccion; }
    public function getFechaNac(): ?string { return $this->fechaNac; }
    public function getEmail(): string { return $this->email; }
    public function getContrasenia(): string { return $this->contrasenia; }
    public function getRolUsuario(): string { return $this->rolUsuario; }
}