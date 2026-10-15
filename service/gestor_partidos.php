<?php
/**
 * Reglas de negocio de los partidos, compartidas por el organizador
 * (TorneoController) y el juez (JuezController): guardar resultados,
 * recalcular la tabla, hacer avanzar al ganador en una llave de
 * eliminación y mandar los avisos.
 */
class GestorPartidos {
    private PartidoRepository $partidos;
    private EquipoRepository $equipos;
    private TorneoRepository $torneos;
    private JuezRepository $jueces;
    private Notificador $avisos;

    public function __construct(?PartidoRepository $p = null, ?EquipoRepository $e = null, ?TorneoRepository $t = null) {
        $this->partidos = $p ?? new PartidoRepository();
        $this->equipos  = $e ?? new EquipoRepository();
        $this->torneos  = $t ?? new TorneoRepository();
        $this->jueces   = new JuezRepository();
        $this->avisos   = new Notificador(null, $this->equipos, $this->torneos);
    }

    public function crear(Partido $p, int $organizadorId): int {
        $id = $this->partidos->crear($p, $organizadorId);
        $this->avisos->partido($p, 'Nuevo partido');
        $this->avisarJuez($p, null);
        return $id;
    }

    /**
     * Carga el marcador en $p (o lo deja sin resultado si $jugado es false).
     * En una llave de eliminación no se permite empate.
     */
    public function aplicarMarcador(Partido $p, bool $jugado, $local, $visitante): void {
        if (!$jugado) { $p->setResultado(null); return; }
        if ($p->getLocalId() === null || $p->getVisitanteId() === null) {
            throw new ApiException('Para cargar un resultado, el partido necesita los dos equipos.');
        }
        $hs = ($local ?? '') !== '' ? (float)$local : null;
        $as = ($visitante ?? '') !== '' ? (float)$visitante : null;
        if ($hs === null || $as === null) throw new ApiException('Ingresá el marcador de ambos equipos.');
        if ($hs == $as && $this->partidos->avancesDesde((int)$p->getId())) {
            throw new ApiException('En una llave de eliminación no puede haber empate: cargá el resultado final (por ejemplo, después de los penales).');
        }
        $p->setResultado(Resultado::jugado($p->getLocalId(), $p->getVisitanteId(), $hs, $as));
    }

    /** Guarda los cambios del partido ($antes = cómo estaba) y avisa a quien corresponda. */
    public function guardar(Partido $p, Partido $antes): void {
        $this->partidos->transaccion(function () use ($p) {
            $this->partidos->actualizar($p);
            $this->avanzar($p);
            $this->recalcular($p->getTorneoId());
        });

        if ($p->estaJugado() && !$p->getResultado()->igualMarcador($antes->getResultado())) {
            $this->avisos->resultado($p);
            $this->avisos->seguidores($p->getTorneoId(), 'resultado', $this->textoResultado($p));
        } elseif (!$p->estaJugado() && !$p->mismosDatos($antes)) {
            $this->avisos->partido($p, 'Partido actualizado');
        }
        $this->avisarJuez($p, $antes->getJuezId());
    }

    public function eliminar(Partido $p): void {
        $this->partidos->transaccion(function () use ($p) {
            $this->partidos->eliminar($p->getId());
            $this->recalcular($p->getTorneoId());
        });
        $this->avisos->partidoCancelado($p);
    }

    public function recalcular(int $torneoId): void {
        $stats = TablaPosiciones::calcular($this->equipos->idsDelTorneo($torneoId), $this->partidos->jugadosDelTorneo($torneoId));
        $this->equipos->guardarEstadisticas($torneoId, $stats);
    }

    /**
     * Llaves de eliminación: pasa el ganador (o el perdedor) al partido que
     * indica avance_llave. Si se borra el resultado, el lugar queda vacío.
     * No se puede cambiar un resultado si el partido siguiente ya se jugó.
     */
    private function avanzar(Partido $p): void {
        $r = $p->getResultado();
        foreach ($this->partidos->avancesDesde((int)$p->getId()) as $a) {
            $destino = $this->partidos->buscar((int)$a['destino_fk']);
            if ($destino === null) continue;
            $equipo = null;
            if ($r !== null && $r->estaJugado()) {
                $ganador = $r->getGanadorEquipoId();
                $equipo = $a['resultado'] === 'ganador' ? $ganador : ($ganador === $p->getLocalId() ? $p->getVisitanteId() : $p->getLocalId());
            }
            $actual = $a['lado'] === 'local' ? $destino->getLocalId() : $destino->getVisitanteId();
            if ($actual === $equipo) continue;
            if ($destino->estaJugado()) {
                throw new ApiException('No se puede cambiar este resultado: el partido siguiente de la llave ya se jugó.');
            }
            if ($a['lado'] === 'local') $destino->setLocalId($equipo); else $destino->setVisitanteId($equipo);
            $this->partidos->actualizar($destino);
        }
    }

    private function textoResultado(Partido $p): string {
        $r = $p->getResultado();
        return $this->equipos->nombre($p->getLocalId()) . ' ' . Formato::marcador($r->getLocal()) . '-'
             . Formato::marcador($r->getVisitante()) . ' ' . $this->equipos->nombre($p->getVisitanteId())
             . ' en «' . $this->torneos->nombre($p->getTorneoId()) . '».';
    }

    private function avisarJuez(Partido $p, ?int $juezAntes): void {
        if ($p->getJuezId() === null || $p->getJuezId() === $juezAntes) return;
        $ci = $this->jueces->ciDeJuez($p->getJuezId());
        if ($ci === null) return;
        $this->avisos->enviar($ci, 'arbitraje', 'Te asignaron para arbitrar ' . $this->equipos->nombre($p->getLocalId()) . ' vs '
            . $this->equipos->nombre($p->getVisitanteId()) . ' (' . Formato::fechaCorta($p->getFecha()) . ') en «'
            . $this->torneos->nombre($p->getTorneoId()) . '».', $p->getTorneoId(), $p->getId());
    }
}
