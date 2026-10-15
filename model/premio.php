<?php
/** Premio de un puesto del torneo (tabla premio). */
class Premio {
    public const MAX_PUESTOS = 3;

    public function __construct(private int $puesto, private string $descripcion) {}

    public static function desdeFila(array $f): self {
        return new self((int)$f['puesto'], $f['descripcion']);
    }

    /** @return Premio[] a partir de [{place, description}], sin repetir puestos ni vacíos */
    public static function listaDesdeFormulario(array $lista): array {
        $premios = [];
        foreach ($lista as $p) {
            if (!is_array($p)) continue;
            $puesto = (int)($p['place'] ?? 0);
            $texto = Validar::texto($p['description'] ?? null, 255);
            if ($texto === null) continue;
            if ($puesto < 1 || $puesto > self::MAX_PUESTOS) throw new ApiException('Los premios son para los puestos 1 a ' . self::MAX_PUESTOS . '.');
            $premios[$puesto] = new self($puesto, $texto);
        }
        ksort($premios);
        return array_values($premios);
    }

    public function getPuesto(): int { return $this->puesto; }
    public function getDescripcion(): string { return $this->descripcion; }

    public function toArray(): array {
        return ['place' => $this->puesto, 'description' => $this->descripcion];
    }
}
