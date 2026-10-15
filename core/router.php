<?php
/** Enrutador de la API: asocia cada ?action= con un método del controlador. */
class Router {
    /** @var callable */
    private $fabrica;
    /** @var array<string, array{0:string,1:string}> accion => [metodo HTTP, método del controlador] */
    private array $rutas = [];

    public function __construct(callable $fabricaControlador) {
        $this->fabrica = $fabricaControlador;
    }

    public function get(string $accion, string $metodo): self  { $this->rutas[$accion] = ['GET', $metodo];  return $this; }
    public function post(string $accion, string $metodo): self { $this->rutas[$accion] = ['POST', $metodo]; return $this; }

    public function despachar(Request $req): void {
        try {
            $ruta = $this->rutas[$req->accion()] ?? null;
            if ($ruta === null) throw new ApiException('Acción no reconocida.', 400);
            [$http, $metodo] = $ruta;
            if ($http === 'POST') $req->exigirMetodo('POST');
            $controlador = ($this->fabrica)();
            Response::json($controlador->$metodo($req));
        } catch (ApiException $e) {
            self::deshacer();
            Response::error($e->getMessage(), $e->getStatus());
        } catch (Throwable $e) {
            self::deshacer();
            Response::errorInterno($e);
        }
    }

    private static function deshacer(): void {
        try {
            $pdo = Database::getInstance();
            if ($pdo->inTransaction()) $pdo->rollBack();
        } catch (Throwable $e) { /* sin conexión: nada que deshacer */ }
    }
}
