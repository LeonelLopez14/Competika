<?php
require_once __DIR__ . '/../core/autoload.php';
require_once __DIR__ . '/../config/session.php';

/**
 * Login, registro y cierre de sesión (formularios HTML clásicos: responden
 * con redirecciones, no JSON). Lo usan controller/login.php, registrar.php y logout.php.
 */
class CuentaController {
    private const LOGIN    = '../frontend/paginas/login/login.html';
    private const REGISTRO = '../frontend/paginas/register/register.html';
    private const INICIO   = '../frontend/index.html';
    private const ROLES_REGISTRO = ['organizador', 'participante', 'observador'];

    private UsuarioRepository $usuarios;

    public function __construct() {
        $this->usuarios = new UsuarioRepository();
    }

    private static function ir(string $destino, ?string $error = null): void {
        header('Location: ' . $destino . ($error !== null ? '?error=' . urlencode($error) : ''));
        exit;
    }

    /** Sesión nueva para la cuenta: se descarta lo anterior (por ejemplo, de otra cuenta) y se cambia el id. */
    private static function iniciarSesion(array $u): void {
        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION['usuario_ci']       = $u['ci'];
        $_SESSION['usuario_nombre']   = $u['nombre'];
        $_SESSION['usuario_apellido'] = $u['apellido'];
        $_SESSION['usuario_email']    = $u['email'];
        $_SESSION['usuario_rol']      = $u['rol_usuario'];
    }

    public function login(): void {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') self::ir(self::LOGIN);
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        if ($email === '' || $password === '') self::ir(self::LOGIN, 'Completá email y contraseña.');

        $u = $this->usuarios->obtenerPorEmail($email);
        // Mismo mensaje si el correo no existe o la contraseña no coincide (no revela qué cuentas existen)
        if (!$u || !password_verify($password, $u['contrasenia'])) self::ir(self::LOGIN, 'Email o contraseña incorrectos.');

        self::iniciarSesion($u);
        // Volver a la página desde donde se pidió el login. Solo páginas propias
        // del sitio (evita redirecciones abiertas a otros dominios).
        $next = (string)($_POST['next'] ?? '');
        if (preg_match('#^frontend/paginas/[a-z_]+/[a-z_]+\.html(\?t=\d+)?$#', $next)) self::ir('../' . $next);
        self::ir(self::INICIO);
    }

    public function registrar(): void {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') self::ir(self::REGISTRO);
        $ci        = trim($_POST['ci'] ?? '');
        $nombre    = trim($_POST['name'] ?? '');
        $apellido  = trim($_POST['surname'] ?? '');
        $telefono  = trim($_POST['telefono'] ?? '') ?: null;
        $direccion = trim($_POST['direccion'] ?? '') ?: null;
        $fechaNac  = trim($_POST['fecha_nac'] ?? '') ?: null;
        $email     = trim($_POST['email'] ?? '');
        $password  = $_POST['password'] ?? '';
        $rol       = $_POST['rol_usuario'] ?? '';

        try {
            if ($ci === '' || $nombre === '' || $apellido === '' || $email === '' || $password === '' || $rol === '') {
                throw new ApiException('Todos los campos son obligatorios.');
            }
            if (!preg_match('/^\d{6,8}$/', preg_replace('/[.\-]/', '', $ci))) throw new ApiException('Ingresá una cédula válida (solo números).');
            $ci = preg_replace('/[.\-]/', '', $ci);
            if (mb_strlen($nombre) > 100 || mb_strlen($apellido) > 100) throw new ApiException('El nombre o el apellido son demasiado largos.');
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) throw new ApiException('Email inválido.');
            if (!in_array($rol, self::ROLES_REGISTRO, true)) throw new ApiException('Elegí un perfil válido.');
            Validar::telefono($telefono);
            Validar::fecha($fechaNac, 'Fecha de nacimiento inválida.');
            Validar::password($password);
            if ($password !== ($_POST['confirm-password'] ?? '')) throw new ApiException('Las contraseñas no coinciden.');
            if ($this->usuarios->existeEmail($email)) throw new ApiException('Ya existe un usuario con ese email.');
            if ($this->usuarios->existeCi($ci)) throw new ApiException('Ya existe un usuario con esa cédula.');
        } catch (ApiException $e) {
            self::ir(self::REGISTRO, $e->getMessage());
        }

        $usuario = new Usuario($ci, $nombre, $apellido, $telefono, $direccion, $fechaNac, $email, $password, $rol);
        try {
            $this->usuarios->transaccion(function () use ($usuario, $ci, $rol) {
                $this->usuarios->registrar($usuario);
                match ($rol) {
                    'organizador'  => $this->usuarios->crearOrganizador($ci),
                    'participante' => $this->usuarios->crearParticipante($ci),
                    'observador'   => $this->usuarios->crearObservador($ci),
                };
            });
        } catch (Throwable $e) {
            error_log('[competika] registro: ' . $e->getMessage());
            self::ir(self::REGISTRO, 'Error al registrar el usuario.');
        }
        self::iniciarSesion($this->usuarios->obtenerPorEmail($email));
        self::ir(self::INICIO);
    }

    public function logout(): void {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        self::ir(self::INICIO);
    }
}
