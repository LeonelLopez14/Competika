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

    /** Jueces habilitados: [{id, nombre, certificado}] para asignarlos a partidos. */
    public function todos(): array {
        return array_map(fn($f) => ['id' => (string)$f['juez_id'], 'name' => $f['nombre'], 'certified' => (bool)$f['certificado']],
            $this->filas("SELECT j.juez_id, j.certificado, CONCAT(u.nombre, ' ', u.apellido) AS nombre
                          FROM juez j JOIN usuario u ON u.ci = j.usuario_ci_fk ORDER BY u.nombre, u.apellido"));
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
