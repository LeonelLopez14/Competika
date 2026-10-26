<?php
/**
 * Deja coherentes los partidos de los datos de prueba, usando el mismo generador de fixture de la app:
 *  - finalizado: se juega todo (cada equipo tiene una fuerza fija) hasta que haya campeón.
 *  - activo: se genera el fixture y se juega una parte de los partidos.
 *  - pendiente, en revisión o rechazado: sin partidos (todavía no empezó).
 *
 * Uso (Docker):  docker compose exec web php database/simular_finalizados.php
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once __DIR__ . '/../core/autoload.php';

// El usuario de la app no puede borrar resultados: este script usa root (clave en .env, DB_ROOT_PASS).
$env = is_file(__DIR__ . '/../.env') ? (array)parse_ini_file(__DIR__ . '/../.env', false, INI_SCANNER_RAW) : [];
$root = getenv('DB_ROOT_PASS') ?: ($env['DB_ROOT_PASS'] ?? '');
if ($root === '') { fwrite(STDERR, "Falta DB_ROOT_PASS en el .env de la raíz del proyecto.\n"); exit(1); }
putenv('DB_USER=root');
putenv('DB_PASS=' . trim($root, "\"' "));

mt_srand(2026);
$db = Database::getInstance();
$torneos = new TorneoRepository();
$partidos = new PartidoRepository();
$equipos = new EquipoRepository();
$gestor = new GestorPartidos($partidos, $equipos, $torneos);
$generador = new GeneradorFixture($partidos, $equipos);

$avanzar = new ReflectionMethod(GestorPartidos::class, 'avanzar');
$desempate = new ReflectionMethod(GestorPartidos::class, 'desempate');

/** Marcador según el deporte; $fuerzaA/$fuerzaB entre 0 y 1. */
function marcador(string $deporte, float $fa, float $fb, bool $permiteEmpate): array {
    $d = mb_strtolower($deporte);
    $gana = (mt_rand() / mt_getrandmax()) < ($fa / ($fa + $fb));
    $tipo = match (true) {
        str_contains($d, 'basket')                                                  => 'alto',
        str_contains($d, 'rugby')                                                   => 'medio',
        str_contains($d, 'base')                                                    => 'bajo',
        str_contains($d, 'tenis') || str_contains($d, 'vole') || str_contains($d, 'padel') || str_contains($d, 'pádel')
        || str_contains($d, 'carta') || str_contains($d, 'video') || str_contains($d, 'marcial') || str_contains($d, 'boxeo') => 'sets',
        default                                                                     => 'futbol',
    };
    switch ($tipo) {
        case 'alto':  $g = mt_rand(78, 112); $p = $g - mt_rand(2, 18); break;
        case 'medio': $g = mt_rand(17, 42);  $p = max(0, $g - mt_rand(2, 15)); break;
        case 'bajo':  $g = mt_rand(3, 10);   $p = max(0, $g - mt_rand(1, 5)); break;
        case 'sets':  $g = 3; $p = mt_rand(0, 2); break;
        default:
            $g = mt_rand(1, 4); $p = mt_rand(0, $g);
            if ($p === $g && !$permiteEmpate) $g++;
            if ($p === $g && mt_rand(0, 1) === 0) return [$g, $g];
    }
    return $gana ? [$g, $p] : [$p, $g];
}

$torneosDb = $db->query("SELECT torneo_id, estado FROM torneo ORDER BY torneo_id")->fetchAll();
echo count($torneosDb) . " torneos.\n";

/** Juega los partidos que se pueden jugar (en orden) hasta llegar a $limite jugados; null = todos. */
function jugar(int $id, ?int $limite, array $fuerza, string $formato, Torneo $t, PartidoRepository $partidos, GestorPartidos $gestor, ReflectionMethod $avanzar, ReflectionMethod $desempate): void {
    do {
        $jugo = false;
        $hechos = count(array_filter($partidos->delTorneo($id), fn($p) => $p->estaJugado()));
        foreach ($partidos->delTorneo($id) as $p) {
            if ($limite !== null && $hechos >= $limite) return;
            if ($p->estaJugado() || $p->getLocalId() === null || $p->getVisitanteId() === null) continue;
            $eliminatorio = $partidos->avancesDesde((int)$p->getId()) || $partidos->tieneOrigenes((int)$p->getId())
                || in_array($p->getFase(), [Fixture::GRAN_FINAL, Fixture::DESEMPATE], true);
            $sinEmpate = $eliminatorio || in_array($formato, ['vidas', 'copa-desafio'], true);
            [$a, $b] = marcador((string)$t->getDeporte(), $fuerza[$p->getLocalId()] ?? 1, $fuerza[$p->getVisitanteId()] ?? 1, !$sinEmpate);
            if ($a == $b && $sinEmpate) $a++;
            $p->setResultado(Resultado::jugado($p->getLocalId(), $p->getVisitanteId(), $a, $b));
            $partidos->actualizar($p);
            $avanzar->invoke($gestor, $p);
            $desempate->invoke($gestor, $p);
            $gestor->recalcular($id);
            $hechos++;
            $jugo = true;
        }
    } while ($jugo);
}

foreach ($torneosDb as ['torneo_id' => $id, 'estado' => $estado]) {
    $id = (int)$id;
    $t = $torneos->buscar($id);
    $formato = $t->getTipo()?->getClave();
    $n = count($equipos->idsDelTorneo($id));
    $quedaSinPartidos = !in_array($estado, ['finalizado', 'activo'], true);
    if (!$quedaSinPartidos && (!Fixture::soporta($formato) || $n < 2)) { echo "  #$id {$t->getNombre()}: se omite (formato sin fixture o menos de 2 equipos)\n"; continue; }

    // Limpiar lo anterior
    $sub = "SELECT enfrentamiento_id FROM enfrentamiento WHERE torneo_id_fk = ?";
    $db->beginTransaction();
    foreach (['resultado', 'enfrentamiento_juez', 'enfrentamiento_equipo', 'enfrentamiento_participante'] as $tbl) {
        $db->prepare("DELETE FROM $tbl WHERE enfrentamiento_id_fk IN ($sub)")->execute([$id]);
    }
    $db->prepare("DELETE FROM avance_llave WHERE origen_fk IN ($sub) OR destino_fk IN ($sub)")->execute([$id, $id]);
    $db->prepare("DELETE FROM enfrentamiento WHERE torneo_id_fk = ?")->execute([$id]);
    $db->prepare("DELETE FROM ronda WHERE torneo_id_fk = ?")->execute([$id]);
    $db->prepare("UPDATE tabla_posiciones SET grupo_id_fk = NULL WHERE torneo_id_fk = ?")->execute([$id]);
    $db->prepare("DELETE FROM grupo WHERE torneo_id_fk = ?")->execute([$id]);
    $db->commit();
    $gestor->recalcular($id);
    if ($quedaSinPartidos) { echo "  #$id {$t->getNombre()} [$estado]: sin partidos\n"; continue; }

    $db->prepare("UPDATE torneo SET estado = 'activo' WHERE torneo_id = ?")->execute([$id]);   // se restaura al terminar

    // Fuerza fija por equipo
    $fuerza = [];
    foreach ($equipos->idsDelTorneo($id) as $e) $fuerza[$e] = 0.5 + mt_rand(0, 100) / 100;

    $opc = ['inicio' => $t->getFechaInicio() ?: date('Y-m-d'), 'hora' => '18:00', 'dias' => 1, 'minutos' => 30,
            'lugar' => $t->getDireccion() ?: 'Cancha principal', 'etapas' => 3, 'grupos' => 0];

    if ($estado === 'activo') {
        $generador->generar($t, $opc);
        $total = count($partidos->delTorneo($id));
        $limite = max(1, (int)round($total * (0.3 + mt_rand(0, 50) / 100)));
        jugar($id, $limite, $fuerza, (string)$formato, $t, $partidos, $gestor, $avanzar, $desempate);
    } else {
        for ($vuelta = 0; $vuelta < 80; $vuelta++) {
            $t = $torneos->buscar($id);
            if ($vuelta > 0 && $generador->campeon($t) !== null) break;
            if ($generador->proximoPaso($t)['accion'] === null) break;
            $generador->generar($t, $opc);
            jugar($id, null, $fuerza, (string)$formato, $t, $partidos, $gestor, $avanzar, $desempate);
        }
    }

    // Fechas: lo jugado antes de hoy y lo pendiente desde hoy; en los finalizados, todo entre el inicio y el fin del torneo
    $todos = $partidos->delTorneo($id);
    usort($todos, fn($x, $y) => $x->getId() <=> $y->getId());
    $upd = $db->prepare("UPDATE enfrentamiento SET fecha = ? WHERE enfrentamiento_id = ?");
    $ini = strtotime($t->getFechaInicio() ?: 'today');
    if ($estado === 'finalizado') {
        $fin = max($ini, strtotime($t->getFechaFin() ?: '+0 days', $ini));
        foreach ($todos as $i => $p) {
            $dia = $ini + (int)floor($i * ($fin - $ini) / max(1, count($todos)));
            $upd->execute([date('Y-m-d', $dia) . ' ' . sprintf('%02d:00:00', 16 + ($i % 4) * 2), $p->getId()]);
        }
    } else {
        $hoy = strtotime(date('Y-m-d'));
        $ayer = $hoy - 86400;
        $ini = min($ini, $ayer);
        $jug = array_values(array_filter($todos, fn($p) => $p->estaJugado()));
        $pend = array_values(array_filter($todos, fn($p) => !$p->estaJugado()));
        foreach ($jug as $i => $p) {
            $dia = $ini + (int)floor($i * ($ayer - $ini) / max(1, count($jug)));
            $upd->execute([date('Y-m-d', $dia) . ' ' . sprintf('%02d:00:00', 16 + ($i % 4) * 2), $p->getId()]);
        }
        foreach ($pend as $i => $p) {
            $dia = $hoy + (int)floor($i * 14 * 86400 / max(1, count($pend)));
            $upd->execute([date('Y-m-d', $dia) . ' ' . sprintf('%02d:00:00', 16 + ($i % 4) * 2), $p->getId()]);
        }
    }

    $db->prepare("UPDATE torneo SET estado = ? WHERE torneo_id = ?")->execute([$estado, $id]);
    $t = $torneos->buscar($id);
    $camp = $estado === 'finalizado' ? $generador->campeon($t) : null;
    $pend = count(array_filter($partidos->delTorneo($id), fn($p) => !$p->estaJugado()));
    echo sprintf("  #%d %s [%s, %s]: %d partidos, %d sin jugar%s\n", $id, $t->getNombre(), $estado, $formato, count($todos), $pend,
        $estado === 'finalizado' ? ', campeón: ' . ($camp !== null ? (string)$db->query("SELECT nombre FROM equipo WHERE equipo_id = " . (int)$camp)->fetchColumn() : 'NINGUNO') : '');
}
echo "Listo.\n";
