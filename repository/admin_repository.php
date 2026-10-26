<?php
require_once __DIR__ . '/base_repository.php';

/** Administración: administradores, registro de actividad y listados de todo el sitio. */
class AdminRepository extends BaseRepository {
    public function adminId(string $ci): ?int {
        $v = $this->valor("SELECT admin_id FROM admin WHERE usuario_ci_fk = ? AND activo = 1 ORDER BY admin_id LIMIT 1", [$ci]);
        return $v === false ? null : (int)$v;
    }

    public function cisAdmins(): array {
        return $this->columna("SELECT usuario_ci_fk FROM admin WHERE activo = 1");
    }

    public function cantidadAdmins(): int {
        return (int)$this->valor("SELECT COUNT(DISTINCT usuario_ci_fk) FROM admin WHERE activo = 1");
    }

    public function darAdmin(string $ci): void {
        if ($this->valor("SELECT 1 FROM admin WHERE usuario_ci_fk = ?", [$ci]) === false) {
            $this->ejecutar("INSERT INTO admin (usuario_ci_fk) VALUES (?)", [$ci]);
        } else {
            $this->ejecutar("UPDATE admin SET activo = 1 WHERE usuario_ci_fk = ?", [$ci]);
        }
    }

    /** Se desactiva (no se borra): su registro de actividad queda. */
    public function quitarAdmin(string $ci): void {
        $this->ejecutar("UPDATE admin SET activo = 0 WHERE usuario_ci_fk = ?", [$ci]);
    }

    public function registrar(int $adminId, string $accion, string $descripcion): void {
        $this->ejecutar("INSERT INTO registro_de_actividad (admin_id_fk, usuario_ci_fk, actor, categoria, nombre, descripcion)
                         SELECT a.admin_id, a.usuario_ci_fk, CONCAT(u.nombre, ' ', u.apellido), 'administracion', ?, ?
                         FROM admin a JOIN usuario u ON u.ci = a.usuario_ci_fk WHERE a.admin_id = ?",
            [mb_substr($accion, 0, 150), $descripcion, $adminId]);
    }

    public function actividad(?string $categoria = null, ?string $busqueda = null, int $limite = 200): array {
        $donde = [];
        $params = [];
        if ($categoria !== null) { $donde[] = "r.categoria = ?"; $params[] = $categoria; }
        if ($busqueda !== null) {
            $donde[] = "(r.nombre LIKE ? OR r.descripcion LIKE ? OR COALESCE(r.actor, CONCAT(u.nombre, ' ', u.apellido)) LIKE ?)";
            array_push($params, ...array_fill(0, 3, self::like($busqueda)));
        }
        return array_map(fn($f) => ['id' => (int)$f['registro_id'], 'accion' => $f['nombre'], 'descripcion' => $f['descripcion'],
                                    'fecha' => $f['fecha'], 'categoria' => $f['categoria'], 'admin' => $f['actor']],
            $this->filas("SELECT r.registro_id, r.nombre, r.descripcion, r.fecha, r.categoria,
                                 COALESCE(r.actor, CONCAT(u.nombre, ' ', u.apellido)) AS actor
                          FROM registro_de_actividad r
                          LEFT JOIN admin a ON a.admin_id = r.admin_id_fk
                          LEFT JOIN usuario u ON u.ci = COALESCE(r.usuario_ci_fk, a.usuario_ci_fk)"
                          . ($donde ? " WHERE " . implode(" AND ", $donde) : "")
                          . " ORDER BY r.registro_id DESC LIMIT " . max(1, min(500, $limite)), $params));
    }

    private static function like(string $texto): string {
        return '%' . addcslashes($texto, '%_\\') . '%';
    }

    /** Usuarios con roles y estado (búsqueda por nombre, correo o cédula). */
    public function usuarios(?string $busqueda, ?string $rol = null): array {
        $sql = "SELECT u.ci, u.nombre, u.apellido, u.email, u.bloqueado, u.motivo_bloqueo,
                       EXISTS(SELECT 1 FROM admin x WHERE x.usuario_ci_fk = u.ci AND x.activo = 1) AS es_admin,
                       EXISTS(SELECT 1 FROM organizador x WHERE x.usuario_ci_fk = u.ci) AS es_organizador,
                       EXISTS(SELECT 1 FROM participante x WHERE x.usuario_ci_fk = u.ci) AS es_participante,
                       EXISTS(SELECT 1 FROM juez x WHERE x.usuario_ci_fk = u.ci) AS es_juez,
                       EXISTS(SELECT 1 FROM observador x WHERE x.usuario_ci_fk = u.ci) AS es_observador
                FROM usuario u";
        $params = [];
        $condiciones = [];
        if ($busqueda !== null) {
            $condiciones[] = "(CONCAT(u.nombre, ' ', u.apellido) LIKE ? OR u.email LIKE ? OR u.ci LIKE ?)";
            $params = array_fill(0, 3, self::like($busqueda));
        }
        $porRol = [
            'admin'        => "EXISTS(SELECT 1 FROM admin x WHERE x.usuario_ci_fk = u.ci AND x.activo = 1)",
            'organizador'  => "EXISTS(SELECT 1 FROM organizador x WHERE x.usuario_ci_fk = u.ci)",
            'participante' => "EXISTS(SELECT 1 FROM participante x WHERE x.usuario_ci_fk = u.ci)",
            'juez'         => "EXISTS(SELECT 1 FROM juez x WHERE x.usuario_ci_fk = u.ci)",
            'observador'   => "EXISTS(SELECT 1 FROM observador x WHERE x.usuario_ci_fk = u.ci)",
        ];
        if ($rol !== null && isset($porRol[$rol])) $condiciones[] = $porRol[$rol];
        if ($condiciones) $sql .= " WHERE " . implode(' AND ', $condiciones);
        return array_map(fn($f) => [
            'nombre'    => trim($f['nombre'] . ' ' . $f['apellido']),
            'email'     => $f['email'],
            'ci'        => str_repeat('•', max(0, strlen($f['ci']) - 3)) . substr($f['ci'], -3),
            'bloqueado' => (bool)$f['bloqueado'],
            'motivo'    => $f['motivo_bloqueo'],
            'roles'     => ['admin' => (bool)$f['es_admin'], 'organizador' => (bool)$f['es_organizador'], 'participante' => (bool)$f['es_participante'],
                            'juez' => (bool)$f['es_juez'], 'observador' => (bool)$f['es_observador']],
        ], $this->filas($sql . " ORDER BY u.nombre, u.apellido LIMIT 200", $params));
    }

    public function ciPorEmail(string $email): ?string {
        $v = $this->valor("SELECT ci FROM usuario WHERE email = ?", [$email]);
        return $v === false ? null : (string)$v;
    }

    public function bloquear(string $ci, bool $bloquear, ?string $motivo): void {
        $this->ejecutar("UPDATE usuario SET bloqueado = ?, motivo_bloqueo = ? WHERE ci = ?", [(int)$bloquear, $bloquear ? $motivo : null, $ci]);
    }

    /** Todos los torneos con su organizador y avance. */
    public function torneos(?string $busqueda): array {
        $sql = "SELECT t.torneo_id, t.nombre, t.estado, t.motivo_rechazo, t.deporte, t.fecha_inicio, tt.etiqueta AS formato,
                       CONCAT(u.nombre, ' ', u.apellido) AS organizador, u.email AS organizador_email, c.competitivo,
                       (SELECT COUNT(*) FROM tabla_posiciones tp WHERE tp.torneo_id_fk = t.torneo_id AND tp.equipo_id_fk IS NOT NULL) AS equipos,
                       (SELECT COUNT(*) FROM enfrentamiento e WHERE e.torneo_id_fk = t.torneo_id) AS partidos,
                       (SELECT COUNT(*) FROM resultado r JOIN enfrentamiento e ON e.enfrentamiento_id = r.enfrentamiento_id_fk
                         WHERE e.torneo_id_fk = t.torneo_id) AS resultados
                FROM torneo t
                JOIN organizador o ON o.organizador_id = t.organizador_id_fk
                JOIN usuario u ON u.ci = o.usuario_ci_fk
                LEFT JOIN tipo_torneo tt ON tt.tipo_torneo_id = t.tipo_torneo_id_fk
                LEFT JOIN configuracion_torneo c ON c.torneo_id_fk = t.torneo_id";
        $params = [];
        if ($busqueda !== null) {
            $sql .= " WHERE t.nombre LIKE ? OR u.email LIKE ? OR CONCAT(u.nombre, ' ', u.apellido) LIKE ?";
            $params = array_fill(0, 3, self::like($busqueda));
        }
        return array_map(fn($f) => [
            'id' => (int)$f['torneo_id'], 'nombre' => $f['nombre'], 'estado' => $f['estado'], 'motivo' => $f['motivo_rechazo'], 'deporte' => $f['deporte'],
            'inicio' => $f['fecha_inicio'], 'formato' => $f['formato'], 'organizador' => $f['organizador'],
            'organizadorEmail' => $f['organizador_email'], 'competitivo' => (bool)$f['competitivo'],
            'equipos' => (int)$f['equipos'], 'partidos' => (int)$f['partidos'], 'resultados' => (int)$f['resultados'],
        ], $this->filas($sql . " ORDER BY t.torneo_id DESC LIMIT 200", $params));
    }

    public function transferirTorneo(int $torneoId, int $organizadorId): void {
        $this->transaccion(function () use ($torneoId, $organizadorId) {
            $this->ejecutar("UPDATE torneo SET organizador_id_fk = ? WHERE torneo_id = ?", [$organizadorId, $torneoId]);
            $this->ejecutar("UPDATE enfrentamiento SET organizador_id_fk = ? WHERE torneo_id_fk = ?", [$organizadorId, $torneoId]);
        });
    }

    /** Cédulas de las cuentas con un rol ('todos' = todas). */
    public function cisConRol(string $rol): array {
        if ($rol === 'todos') return $this->columna("SELECT ci FROM usuario WHERE bloqueado = 0");
        if (!in_array($rol, ['organizador', 'participante', 'juez', 'observador'], true)) return [];
        return $this->columna("SELECT DISTINCT r.usuario_ci_fk FROM $rol r JOIN usuario u ON u.ci = r.usuario_ci_fk WHERE u.bloqueado = 0");
    }

    public function totales(): array {
        $f = $this->fila("SELECT (SELECT COUNT(*) FROM usuario) AS usuarios, (SELECT COUNT(*) FROM torneo) AS torneos,
                                 (SELECT COUNT(*) FROM torneo WHERE estado = 'en_revision') AS revision,
                                 (SELECT COUNT(*) FROM juez) AS jueces,
                                 (SELECT COUNT(*) FROM solicitud_juez WHERE estado = 'pendiente') AS pendientes,
                                 (SELECT COUNT(*) FROM mensaje_contacto WHERE leido = 0) AS mensajes,
                                 (SELECT COUNT(*) FROM usuario WHERE bloqueado = 1) AS suspendidos");
        return array_map('intval', $f);
    }
}
