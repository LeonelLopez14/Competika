<?php
/** Planificación del fixture de cada formato (sin acceso a la base). */
final class Fixture {
    public const GRAN_FINAL = 'Gran final';
    public const DESEMPATE = 'Gran final · Desempate';
    public const COMPLETOS = ['liga-simple', 'liga-doble', 'sistema-puntos', 'gran-premio', 'eliminacion-simple', 'blitz', 'eliminacion-doble'];
    public const POR_RONDAS = ['suizo', 'vidas', 'copa-desafio', 'grupos'];

    private int $siguienteClave = 0;
    /** @var array<int, array{fase:string, partidos: array}> */
    private array $rondas = [];

    public static function soporta(?string $formato): bool {
        return in_array($formato, array_merge(self::COMPLETOS, self::POR_RONDAS), true);
    }

    public static function porRondas(?string $formato): bool {
        return in_array($formato, self::POR_RONDAS, true);
    }

    // ── Round robin ─────────────────────────────────────────

    /** Fechas de todos contra todos (método del círculo). @return array<int, array<int, array{0:int,1:int}>> */
    public static function todosContraTodos(array $equipos): array {
        $lista = array_values($equipos);
        if (count($lista) % 2 === 1) $lista[] = null;
        $n = count($lista);
        $fechas = [];
        for ($r = 0; $r < $n - 1; $r++) {
            $partidos = [];
            for ($i = 0; $i < $n / 2; $i++) {
                $a = $lista[$i]; $b = $lista[$n - 1 - $i];
                if ($a === null || $b === null) continue;
                $partidos[] = $r % 2 === 0 ? [$a, $b] : [$b, $a];
            }
            $fechas[] = $partidos;
            $fijo = array_shift($lista);
            array_unshift($lista, array_pop($lista));
            array_unshift($lista, $fijo);
        }
        return $fechas;
    }

    public static function liga(array $equipos, int $vueltas = 1, string $prefijo = ''): array {
        $fechas = self::todosContraTodos($equipos);
        $plan = [];
        for ($v = 0; $v < $vueltas; $v++) {
            foreach ($fechas as $i => $partidos) {
                $nro = $v * count($fechas) + $i + 1;
                $plan[] = ['fase' => $prefijo . "Fecha $nro", 'partidos' => array_map(
                    fn($p) => $v % 2 === 0 ? [['t', $p[0]], ['t', $p[1]]] : [['t', $p[1]], ['t', $p[0]]], $partidos)];
            }
        }
        return $plan;
    }

    public static function granPremio(array $equipos, int $etapas): array {
        $plan = [];
        for ($e = 1; $e <= $etapas; $e++) {
            foreach (self::liga($equipos, 1, "GP $e · ") as $ronda) $plan[] = $ronda;
        }
        return $plan;
    }

    // ── Llaves ──────────────────────────────────────────────

    /** Orden de siembra estándar: el 1 contra el último, y los mejores en lados opuestos. */
    private static function ordenSiembra(int $tam): array {
        $orden = [0];
        while (count($orden) < $tam) {
            $n = count($orden) * 2;
            $nuevo = [];
            foreach ($orden as $s) { $nuevo[] = $s; $nuevo[] = $n - 1 - $s; }
            $orden = $nuevo;
        }
        return $orden;
    }

    private static function potenciaDe2(int $n): int {
        $p = 1;
        while ($p < $n) $p *= 2;
        return $p;
    }

    private function ronda(string $fase): int {
        $this->rondas[] = ['fase' => $fase, 'partidos' => []];
        return count($this->rondas) - 1;
    }

    /** Agrega un partido y devuelve [slot del ganador, slot del perdedor]. */
    private function partido(int $ronda, ?array $a, ?array $b): array {
        if ($a === null || $b === null) return [$a ?? $b, null];
        $clave = $this->siguienteClave++;
        $this->rondas[$ronda]['partidos'][] = [$a, $b, $clave];
        return [['g', $clave], ['p', $clave]];
    }

    /** Llave de eliminación con siembra; $sembrados en orden de mejor a peor. */
    private function llave(array $sembrados, string $prefijo = ''): array {
        $tam = self::potenciaDe2(count($sembrados));
        $slots = [];
        foreach (self::ordenSiembra($tam) as $i) $slots[] = isset($sembrados[$i]) ? ['t', $sembrados[$i]] : null;

        $perdedoresPorRonda = [];
        $nro = 1;
        while (count($slots) > 1) {
            $partidos = count($slots) / 2;
            $fase = $prefijo . self::nombreRonda($partidos, $nro);
            $r = $this->ronda($fase);
            $ganadores = []; $perdedores = [];
            for ($i = 0; $i < count($slots); $i += 2) {
                [$g, $p] = $this->partido($r, $slots[$i], $slots[$i + 1]);
                $ganadores[] = $g; $perdedores[] = $p;
            }
            if (!$this->rondas[$r]['partidos']) array_pop($this->rondas);
            $perdedoresPorRonda[] = $perdedores;
            $slots = $ganadores;
            $nro++;
        }
        return [$slots[0], $perdedoresPorRonda];
    }

    public static function eliminacion(array $equipos): array {
        $f = new self();
        $f->llave(array_values($equipos));
        return $f->rondas;
    }

    /** Doble eliminación: llave de ganadores, llave de perdedores y gran final. */
    public static function dobleEliminacion(array $equipos): array {
        $f = new self();
        [$campeonG, $perdidos] = $f->llave(array_values($equipos), 'Ganadores · ');

        $llaveP = [];
        foreach (array_values($perdidos) as $k => $perdedores) {
            if ($k === 0) {
                $r = $f->ronda('Perdedores · Ronda 1');
                for ($i = 0; $i < count($perdedores); $i += 2) {
                    $llaveP[] = $f->partido($r, $perdedores[$i], $perdedores[$i + 1] ?? null)[0];
                }
            } else {
                // Los que bajan de la llave de ganadores juegan contra los que siguen vivos abajo
                $bajan = array_reverse($perdedores);
                $r = $f->ronda('Perdedores · Ronda ' . (2 * $k));
                $nuevos = [];
                foreach ($llaveP as $i => $slot) $nuevos[] = $f->partido($r, $slot, $bajan[$i] ?? null)[0];
                $llaveP = $nuevos;
                if (count($llaveP) > 1) {
                    $r = $f->ronda('Perdedores · Ronda ' . (2 * $k + 1));
                    $nuevos = [];
                    for ($i = 0; $i < count($llaveP); $i += 2) $nuevos[] = $f->partido($r, $llaveP[$i], $llaveP[$i + 1] ?? null)[0];
                    $llaveP = $nuevos;
                }
            }
        }
        $r = $f->ronda(self::GRAN_FINAL);
        $f->partido($r, $campeonG, $llaveP[0] ?? null);
        $f->rondas = array_values(array_filter($f->rondas, fn($x) => $x['partidos']));
        $nro = 1;
        foreach ($f->rondas as &$r) {
            if (str_starts_with($r['fase'], 'Perdedores')) $r['fase'] = 'Perdedores · Ronda ' . $nro++;
        }
        unset($r);
        return $f->rondas;
    }

    /** Eliminatoria con los dos primeros de cada grupo. */
    public static function eliminatoriaDeGrupos(array $clasificados): array {
        $grupos = array_values($clasificados);
        $g = count($grupos);
        $primeros = array_map(fn($x) => $x[0], $grupos);
        $segundos = array_map(fn($x) => $x[1] ?? null, $grupos);
        $tam = self::potenciaDe2(2 * $g);
        $sembrados = array_fill(0, $tam, null);
        foreach ($primeros as $i => $e) $sembrados[$i] = $e;
        foreach ($segundos as $i => $e) $sembrados[$tam - 1 - (($i + $g - 1) % $g)] = $e;   // contra el 1.º del grupo anterior
        $f = new self();
        $f->llaveDesdeSembrados($sembrados);
        return $f->rondas;
    }

    private function llaveDesdeSembrados(array $sembrados): void {
        $tam = count($sembrados);
        $slots = [];
        foreach (self::ordenSiembra($tam) as $i) $slots[] = $sembrados[$i] !== null ? ['t', $sembrados[$i]] : null;
        $nro = 1;
        while (count($slots) > 1) {
            $r = $this->ronda(self::nombreRonda(count($slots) / 2, $nro++));
            $ganadores = [];
            for ($i = 0; $i < count($slots); $i += 2) $ganadores[] = $this->partido($r, $slots[$i], $slots[$i + 1])[0];
            if (!$this->rondas[$r]['partidos']) array_pop($this->rondas);
            $slots = $ganadores;
        }
    }

    public static function nombreRonda(int $partidos, int $nro): string {
        return [1 => 'Final', 2 => 'Semifinal', 4 => 'Cuartos de final', 8 => 'Octavos de final'][$partidos] ?? "Ronda $nro";
    }

    // ── Grupos ──────────────────────────────────────────────

    /** Reparte los equipos en grupos (en zigzag, por orden de inscripción). @return array<string, int[]> */
    public static function repartirEnGrupos(array $equipos, int $cantidad): array {
        $cantidad = max(1, min($cantidad, intdiv(count($equipos), 2)));
        $grupos = [];
        for ($g = 0; $g < $cantidad; $g++) $grupos[chr(65 + $g)] = [];
        $nombres = array_keys($grupos);
        foreach (array_values($equipos) as $i => $e) {
            $vuelta = intdiv($i, $cantidad);
            $pos = $vuelta % 2 === 0 ? $i % $cantidad : $cantidad - 1 - $i % $cantidad;
            $grupos[$nombres[$pos]][] = $e;
        }
        return $grupos;
    }

    /** Fase de grupos: todos contra todos dentro de cada grupo; la fecha N de todos los grupos va junta. */
    public static function faseDeGrupos(array $grupos): array {
        $porGrupo = array_map(fn($eq) => self::todosContraTodos($eq), $grupos);
        $fechas = max(array_map('count', $porGrupo));
        $plan = [];
        for ($f = 0; $f < $fechas; $f++) {
            foreach ($porGrupo as $nombre => $rondas) {
                if (!isset($rondas[$f])) continue;
                $plan[] = ['fase' => "Grupo $nombre · Fecha " . ($f + 1), 'fecha' => $f,
                           'partidos' => array_map(fn($p) => [['t', $p[0]], ['t', $p[1]]], $rondas[$f])];
            }
        }
        return $plan;
    }

    // ── Por rondas ──────────────────────────────────────────

    /** Sistema suizo: empareja por puntaje sin repetir rivales. */
    public static function rondaSuiza(array $tabla, array $jugados, int $nro): array {
        $libres = array_values($tabla);
        if (count($libres) % 2 === 1) array_pop($libres);              // el último queda libre esta ronda
        $partidos = [];
        while ($libres) {
            $a = array_shift($libres);
            $idx = 0;
            foreach ($libres as $i => $b) {
                if (!isset($jugados[min($a, $b) . '-' . max($a, $b)])) { $idx = $i; break; }
            }
            $b = $libres[$idx];
            array_splice($libres, $idx, 1);
            $partidos[] = [['t', $a], ['t', $b]];
        }
        return [['fase' => "Ronda $nro", 'partidos' => $partidos]];
    }

    /** Vidas: juegan los que tienen vidas, ordenados por vidas; evita repetir el cruce de la ronda anterior. */
    public static function rondaVidas(array $vivos, array $ultimaRonda, int $nro): array {
        $lista = array_values($vivos);
        if (count($lista) % 2 === 1) array_pop($lista);
        $partidos = [];
        for ($i = 0; $i < count($lista); $i += 2) {
            $a = $lista[$i]; $b = $lista[$i + 1];
            if (isset($ultimaRonda[min($a, $b) . '-' . max($a, $b)]) && isset($lista[$i + 2])) {
                [$lista[$i + 1], $lista[$i + 2]] = [$lista[$i + 2], $lista[$i + 1]];
                $b = $lista[$i + 1];
            }
            $partidos[] = [['t', $a], ['t', $b]];
        }
        return [['fase' => "Ronda $nro", 'partidos' => $partidos]];
    }

    /** Copa desafío: el campeón (local) defiende el título contra el siguiente retador. */
    public static function desafio(int $campeon, int $retador, int $nro): array {
        return [['fase' => "Desafío $nro", 'partidos' => [[['t', $campeon], ['t', $retador]]]]];
    }
}
