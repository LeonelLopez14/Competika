<?php

class Auditoria {
    public const CUENTA = 'cuenta';
    public const TORNEO = 'torneo';
    public const INSCRIPCION = 'inscripcion';
    public const RESULTADO = 'resultado';
    public const ADMINISTRACION = 'administracion';

    public static function registrar(?string $ci, string $categoria, string $accion, string $detalle): void {
        try {
            (new AuditoriaRepository())->registrar($ci, $categoria, $accion, $detalle);
        } catch (Throwable $e) {
            error_log('Auditoría: ' . $e->getMessage());
        }
    }

    public static function actual(string $categoria, string $accion, string $detalle): void {
        self::registrar(Auth::ci(), $categoria, $accion, $detalle);
    }
}
