<?php
/**
 * Conexión PDO singleton.
 *
 * Las credenciales se toman de variables de entorno (Docker, o SetEnv en Apache).
 * Si no están definidas, se usan los valores de desarrollo local de siempre,
 * así en XAMPP/LAMPP sigue funcionando sin configurar nada.
 *
 * Variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
 */

if (!function_exists('env')) {
    function env(string $key, ?string $default = null): ?string {
        $v = getenv($key);
        if ($v === false || $v === '') {
            $v = $_SERVER[$key] ?? null;   // Apache SetEnv
        }
        return ($v === null || $v === '') ? $default : (string)$v;
    }
}

class Database {
    private static ?PDO $instance = null;

    public static function getInstance(): PDO {
        if (self::$instance === null) {
            $host = env('DB_HOST', 'localhost');
            $port = env('DB_PORT', '3306');
            $db   = env('DB_NAME', 'competika_db');
            $user = env('DB_USER', 'competika_app');
            $pass = env('DB_PASS', 'Jacaranda');   // solo desarrollo local: en servidor usar DB_PASS

            $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
            self::$instance = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }
        return self::$instance;
    }
}
