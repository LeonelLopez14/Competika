<?php
require_once __DIR__ . '/base_repository.php';

/** Jueces (tabla juez) y solicitudes para serlo (tabla solicitud_juez). */
class JuezRepository extends BaseRepository {
    private const SOLICITUD = "SELECT s.*, CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo, u.email
                               FROM solicitud_juez s JOIN usuario u ON u.ci = s.usuario_ci_fk";

    public function juezId(string $ci): ?int {
        $v = $this->valor("SELECT juez_id FROM juez WHERE usuario_ci_fk = ? ORDER BY juez_id LIMIT 1", [$ci]);
        return $v === false ? null : (int)$v;
    }

    /**
     * Jueces habilitados, con su experiencia (partidos con resultado cargado) para que el organizador elija con datos.
     * @return array<int, array{id: string, name: string, certified: bool, department: ?string, matches: int, tournaments: int, sports: string[]}>
     */
    public function todos(): array {
        return array_map(fn($f) => [
            'id' => (string)$f['juez_id'], 'name' => $f['nombre'], 'certified' => (bool)$f['certificado'],
            'department' => $f['departamento'] ?: null,
            'matches' => (int)$f['partidos'], 'tournaments' => (int)$f['torneos'],
            'sports' => $f['deportes'] !== null && $f['deportes'] !== '' ? explode(', ', $f['deportes']) : [],
        ], $this->filas("
            SELECT j.juez_id, j.certificado, j.departamento, CONCAT(u.nombre, ' ', u.apellido) AS nombre,
                   (SELECT COUNT(DISTINCT ej.enfrentamiento_id_fk) FROM enfrentamiento_juez ej
                      JOIN resultado r ON r.enfrentamiento_id_fk = ej.enfrentamiento_id_fk AND r.estado <> 'pendiente'
                     WHERE ej.juez_id_fk = j.juez_id) AS partidos,
                   (SELECT COUNT(DISTINCT e.torneo_id_fk) FROM enfrentamiento_juez ej
                      JOIN enfrentamiento e ON e.enfrentamiento_id = ej.enfrentamiento_id_fk
                      JOIN resultado r ON r.enfrentamiento_id_fk = e.enfrentamiento_id AND r.estado <> 'pendiente'
                     WHERE ej.juez_id_fk = j.juez_id) AS torneos,
                   (SELECT GROUP_CONCAT(DISTINCT t.deporte ORDER BY t.deporte SEPARATOR ', ') FROM enfrentamiento_juez ej
                      JOIN enfrentamiento e ON e.enfrentamiento_id = ej.enfrentamiento_id_fk
                      JOIN torneo t ON t.torneo_id = e.torneo_id_fk
                      JOIN resultado r ON r.enfrentamiento_id_fk = e.enfrentamiento_id AND r.estado <> 'pendiente'
                     WHERE ej.juez_id_fk = j.juez_id AND t.deporte IS NOT NULL AND t.deporte <> '') AS deportes
            FROM juez j JOIN usuario u ON u.ci = j.usuario_ci_fk
            WHERE u.bloqueado = 0
            ORDER BY u.nombre, u.apellido"));
    }

    public function departamentoDe(string $ci): ?string {
        $v = $this->valor("SELECT departamento FROM juez WHERE usuario_ci_fk = ? ORDER BY juez_id LIMIT 1", [$ci]);
        return $v === false || $v === null || $v === '' ? null : (string)$v;
    }

    public function guardarDepartamento(string $ci, ?string $departamento): void {
        $this->ejecutar("UPDATE juez SET departamento = ? WHERE usuario_ci_fk = ?", [$departamento, $ci]);
    }

    /** Torneos competitivos que eligieron a este juez como principal y esperan su respuesta. */
    public function invitaciones(int $juezId): array {
        return $this->filas("
            SELECT t.torneo_id, t.nombre, t.deporte, t.fecha_inicio, t.fecha_fin, t.direccion, t.departamento,
                   CONCAT(uo.nombre, ' ', uo.apellido) AS organizador
            FROM configuracion_torneo c
            JOIN torneo t ON t.torneo_id = c.torneo_id_fk
            JOIN organizador o ON o.organizador_id = t.organizador_id_fk
            JOIN usuario uo ON uo.ci = o.usuario_ci_fk
            WHERE c.juez_principal_fk = ? AND c.competitivo = 1 AND c.juez_estado = 'pendiente' AND t.estado <> 'rechazado'
            ORDER BY t.torneo_id DESC", [$juezId]);
    }

    /** Guarda la respuesta del juez; devuelve false si la invitación ya no estaba pendiente (la cambió el organizador). */
    public function responderInvitacion(int $juezId, int $torneoId, bool $acepta): bool {
        return $this->ejecutar("UPDATE configuracion_torneo SET juez_estado = ?
                                WHERE torneo_id_fk = ? AND juez_principal_fk = ? AND competitivo = 1 AND juez_estado = 'pendiente'",
            [$acepta ? 'aceptado' : 'rechazado', $torneoId, $juezId]) > 0;
    }

    /** Alta directa (la hace un administrador, sin solicitud). */
    public function darDeAlta(string $ci): void {
        if ($this->juezId($ci) === null) $this->ejecutar("INSERT INTO juez (usuario_ci_fk, certificado) VALUES (?, 0)", [$ci]);
    }

    public function existe(int $juezId): bool {
        return $this->valor("SELECT 1 FROM juez WHERE juez_id = ?", [$juezId]) !== false;
    }

    public function ciDeJuez(int $juezId): ?string {
        $v = $this->valor("SELECT usuario_ci_fk FROM juez WHERE juez_id = ?", [$juezId]);
        return $v === false ? null : (string)$v;
    }

    // ── Solicitudes ──────────────────────────────────────────
    public function ultimaSolicitud(string $ci): ?SolicitudJuez {
        $f = $this->fila(self::SOLICITUD . " WHERE s.usuario_ci_fk = ? ORDER BY s.solicitud_id DESC LIMIT 1", [$ci]);
        return $f ? SolicitudJuez::desdeFila($f) : null;
    }

    public function buscarSolicitud(int $id): ?SolicitudJuez {
        $f = $this->fila(self::SOLICITUD . " WHERE s.solicitud_id = ?", [$id]);
        return $f ? SolicitudJuez::desdeFila($f) : null;
    }

    /** @return SolicitudJuez[] (pendientes primero, después las más nuevas) */
    public function solicitudes(?string $estado = null): array {
        $sql = self::SOLICITUD . ($estado ? " WHERE s.estado = ?" : "") . " ORDER BY s.estado = 'pendiente' DESC, s.solicitud_id DESC LIMIT 100";
        return array_map([SolicitudJuez::class, 'desdeFila'], $this->filas($sql, $estado ? [$estado] : []));
    }

    public function crearSolicitud(SolicitudJuez $s): int {
        return $this->insertar("INSERT INTO solicitud_juez (usuario_ci_fk, certificado, deportes, experiencia) VALUES (?, ?, ?, ?)",
            [$s->getUsuarioCi(), (int)$s->tieneCertificado(), $s->getDeportes(), $s->getExperiencia()]);
    }

    /** Aprueba: marca la solicitud y da de alta al usuario en juez (con su certificado). */
    public function aprobar(SolicitudJuez $s, int $adminId): void {
        $this->transaccion(function () use ($s, $adminId) {
            $this->ejecutar("UPDATE solicitud_juez SET estado = 'aprobada', revisada_por_admin_fk = ?, fecha_revision = NOW()
                             WHERE solicitud_id = ? AND estado = 'pendiente'", [$adminId, $s->getId()]);
            if ($this->juezId($s->getUsuarioCi()) === null) {
                $this->ejecutar("INSERT INTO juez (usuario_ci_fk, certificado) VALUES (?, ?)", [$s->getUsuarioCi(), (int)$s->tieneCertificado()]);
            } else {
                $this->ejecutar("UPDATE juez SET certificado = ? WHERE usuario_ci_fk = ?", [(int)$s->tieneCertificado(), $s->getUsuarioCi()]);
            }
        });
    }

    public function rechazar(SolicitudJuez $s, int $adminId, string $motivo): void {
        $this->ejecutar("UPDATE solicitud_juez SET estado = 'rechazada', revisada_por_admin_fk = ?, fecha_revision = NOW(), motivo_rechazo = ?
                         WHERE solicitud_id = ? AND estado = 'pendiente'", [$adminId, $motivo, $s->getId()]);
    }
}
