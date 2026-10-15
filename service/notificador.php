<?php
/** Avisos de la campana (un fallo nunca corta la acción principal). */
class Notificador {
    private NotificacionRepository $notificaciones;
    private EquipoRepository $equipos;
    private TorneoRepository $torneos;

    public function __construct(?NotificacionRepository $n = null, ?EquipoRepository $e = null, ?TorneoRepository $t = null) {
        $this->notificaciones = $n ?? new NotificacionRepository();
        $this->equipos = $e ?? new EquipoRepository();
        $this->torneos = $t ?? new TorneoRepository();
    }

    public function enviar(string $ci, string $tipo, string $mensaje, ?int $torneoId = null, ?int $refId = null): void {
        try {
            $this->notificaciones->crear(new Notificacion(null, $ci, $tipo, $mensaje, $torneoId, $refId));
        } catch (Throwable $e) {
            error_log('[competika] notificación no guardada: ' . $e->getMessage());
        }
    }

    private function aEquipo(?int $equipoId, string $tipo, string $mensaje, ?int $torneoId, ?int $refId = null): void {
        foreach ($this->equipos->usuarios($equipoId) as $ci) $this->enviar($ci, $tipo, $mensaje, $torneoId, $refId);
    }

    public function inscripcion(int $torneoId, string $ciJugador, string $nombreJugador, string $equipo): void {
        $nombre = $this->torneos->nombre($torneoId);
        $org = $this->torneos->ciOrganizador($torneoId);
        if ($org !== null && $org !== $ciJugador) {
            $this->enviar($org, 'nuevo_inscripto', "{$nombreJugador} se inscribió en «{$nombre}» con el equipo «{$equipo}».", $torneoId);
        }
        $this->enviar($ciJugador, 'inscripcion', "Te inscribiste en «{$nombre}». Te avisamos cuando haya partidos.", $torneoId);
    }

    public function cambioDeEstado(Torneo $t): void {
        $msg = $t->getEstado() === Torneo::ACTIVO
            ? "«{$t->getNombre()}» comenzó. ¡Éxitos!"
            : "«{$t->getNombre()}» finalizó. Mirá cómo terminó la tabla en tu perfil.";
        foreach ($this->torneos->usuariosInscriptos($t->getId()) as $ci) $this->enviar($ci, 'torneo_estado', $msg, $t->getId());
        $this->seguidores($t->getId(), 'torneo_estado', $msg);
    }

    /** $inscriptos se obtiene ANTES de borrar el torneo. */
    public function torneoCancelado(string $nombre, array $inscriptos): void {
        foreach ($inscriptos as $ci) $this->enviar($ci, 'torneo_cancelado', "El organizador eliminó el torneo «{$nombre}».");
    }

    /** $usuarios se obtiene ANTES de quitar el equipo. */
    public function baja(int $torneoId, array $usuarios): void {
        $nombre = $this->torneos->nombre($torneoId);
        foreach ($usuarios as $ci) $this->enviar($ci, 'baja', "El organizador te quitó del torneo «{$nombre}».", $torneoId);
    }

    public function partido(Partido $p, string $titulo): void {
        $nombre = $this->torneos->nombre($p->getTorneoId());
        $cuando = Formato::fechaCorta($p->getFecha()) . ($p->getUbicacion() ? " · {$p->getUbicacion()}" : '');
        foreach ([[$p->getLocalId(), $p->getVisitanteId()], [$p->getVisitanteId(), $p->getLocalId()]] as [$mio, $rival]) {
            $this->aEquipo($mio, 'partido', "$titulo en «{$nombre}»: vs " . $this->equipos->nombre($rival) . " — $cuando.",
                $p->getTorneoId(), $p->getId());
        }
    }

    public function resultado(Partido $p): void {
        $r = $p->getResultado();
        $nombre = $this->torneos->nombre($p->getTorneoId());
        $lados = [[$p->getLocalId(), $p->getVisitanteId(), $r->getLocal(), $r->getVisitante()],
                  [$p->getVisitanteId(), $p->getLocalId(), $r->getVisitante(), $r->getLocal()]];
        foreach ($lados as [$mio, $rival, $yo, $el]) {
            $verbo = $yo > $el ? 'Ganaste' : ($yo < $el ? 'Perdiste' : 'Empataste');
            $this->aEquipo($mio, 'resultado', "$verbo " . Formato::marcador($yo) . '-' . Formato::marcador($el)
                . " vs " . $this->equipos->nombre($rival) . " en «{$nombre}».", $p->getTorneoId(), $p->getId());
        }
    }

    public function partidoCancelado(Partido $p): void {
        $nombre = $this->torneos->nombre($p->getTorneoId());
        foreach ([[$p->getLocalId(), $p->getVisitanteId()], [$p->getVisitanteId(), $p->getLocalId()]] as [$mio, $rival]) {
            $this->aEquipo($mio, 'partido_cancelado', "Se canceló tu partido vs " . $this->equipos->nombre($rival) . " en «{$nombre}».", $p->getTorneoId());
        }
    }

    public function honor(string $deNombre, int $deEquipo, int $aEquipo, int $torneoId, int $partidoId): void {
        $this->aEquipo($aEquipo, 'honor', "{$deNombre} (" . $this->equipos->nombre($deEquipo) . ") le dio honor a tu equipo por el juego limpio.",
            $torneoId, $partidoId);
    }

    /** Recordatorios de partidos de las próximas 24 h (una vez por partido). Se llama al listar o en el stream. */
    public function recordatorios(string $ci): void {
        try {
            foreach ($this->notificaciones->partidosParaRecordar($ci) as $r) {
                $rival = $this->equipos->nombre($r['rival'] !== null ? (int)$r['rival'] : null);
                $lugar = $r['ubicacion'] ? " en {$r['ubicacion']}" : '';
                $this->enviar($ci, 'recordatorio',
                    "Recordatorio: jugás vs {$rival} el " . Formato::fechaCorta($r['fecha']) . "{$lugar} («{$r['torneo']}»).",
                    (int)$r['torneo_id_fk'], (int)$r['enfrentamiento_id']);
            }
        } catch (Throwable $e) {
            error_log('[competika] recordatorios: ' . $e->getMessage());
        }
    }

    /** Aviso a quienes siguen el torneo (observadores), salvo los que ya juegan en él. */
    public function seguidores(int $torneoId, string $tipo, string $mensaje): void {
        try {
            $juegan = array_flip($this->torneos->usuariosInscriptos($torneoId));
            foreach ($this->torneos->seguidores($torneoId) as $ci) {
                if (!isset($juegan[$ci])) $this->enviar($ci, $tipo, $mensaje, $torneoId);
            }
        } catch (Throwable $e) {
            error_log('[competika] avisos a seguidores: ' . $e->getMessage());
        }
    }

    /** Fixture publicado: un aviso por persona (no uno por partido). */
    public function fixture(int $torneoId, int $partidos): void {
        $nombre = $this->torneos->nombre($torneoId);
        foreach ($this->torneos->usuariosInscriptos($torneoId) as $ci) {
            $this->enviar($ci, 'partido', "Se publicó el fixture de «{$nombre}» ({$partidos} partidos). Mirá cuándo jugás.", $torneoId);
        }
        $this->seguidores($torneoId, 'partido', "Se publicó el fixture de «{$nombre}».");
    }
}
