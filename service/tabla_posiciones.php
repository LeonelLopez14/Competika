<?php
/** Calcula la tabla de posiciones de un torneo: 3 puntos por victoria, 1 por empate. */
class TablaPosiciones {
    public const PUNTOS_VICTORIA = 3;
    public const PUNTOS_EMPATE = 1;

    /**
     * @param int[]     $equipoIds equipos del torneo
     * @param Partido[] $jugados   partidos con resultado
     * @return array<int, array{pj:int,pg:int,pe:int,pp:int,pts:int}>
     */
    public static function calcular(array $equipoIds, array $jugados): array {
        $st = [];
        foreach ($equipoIds as $e) $st[$e] = ['pj' => 0, 'pg' => 0, 'pe' => 0, 'pp' => 0, 'pts' => 0];
        foreach ($jugados as $p) {
            $a = $p->getLocalId(); $b = $p->getVisitanteId(); $r = $p->getResultado();
            if ($a === null || $b === null || $a === $b || !isset($st[$a], $st[$b]) || !$r->estaJugado()) continue;
            $st[$a]['pj']++; $st[$b]['pj']++;
            if ($r->getLocal() > $r->getVisitante())      { self::gana($st[$a], $st[$b]); }
            elseif ($r->getLocal() < $r->getVisitante())  { self::gana($st[$b], $st[$a]); }
            else { $st[$a]['pe']++; $st[$b]['pe']++; $st[$a]['pts'] += self::PUNTOS_EMPATE; $st[$b]['pts'] += self::PUNTOS_EMPATE; }
        }
        return $st;
    }

    private static function gana(array &$ganador, array &$perdedor): void {
        $ganador['pg']++; $ganador['pts'] += self::PUNTOS_VICTORIA; $perdedor['pp']++;
    }
}
