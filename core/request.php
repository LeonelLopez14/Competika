<?php
/** Datos de la petición HTTP actual (query string y cuerpo JSON). */
class Request {
    private ?array $json = null;

    public function metodo(): string { return $_SERVER['REQUEST_METHOD'] ?? 'GET'; }
    public function accion(): string { return (string)($_GET['action'] ?? ''); }
    public function query(string $clave, $defecto = null) { return $_GET[$clave] ?? $defecto; }
    public function idQuery(string $clave = 'id'): int { return (int)($_GET[$clave] ?? 0); }

    /** Cuerpo JSON como arreglo (vacío si no es JSON válido). */
    public function json(): array {
        if ($this->json === null) {
            $d = json_decode(file_get_contents('php://input') ?: '', true);
            $this->json = is_array($d) ? $d : [];
        }
        return $this->json;
    }

    public function exigirMetodo(string $metodo): void {
        if ($this->metodo() !== $metodo) {
            throw new ApiException("Método no permitido, se esperaba $metodo", 405);
        }
    }
}
