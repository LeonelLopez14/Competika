<?php
/**
 * API de torneos — Competika (sobre database/schema.sql)
 *
 * Públicas:
 *   GET  ?action=list                     todos los torneos (búsqueda)
 *   GET  ?action=get&id=5                 un torneo con equipos y partidos
 * Requieren sesión:
 *   GET  ?action=mine                     torneos que organizo
 *   POST ?action=create                   crear torneo (otorga el rol organizador si no lo tiene)
 *   POST ?action=inscribirse              inscribirme en un torneo {torneoId, teamName}
 * Solo el organizador del torneo:
 *   POST ?action=update&id=5      | delete&id=5
 *   POST ?action=add_team&id=5    | update_team&team_id=9 | delete_team&team_id=9
 *   POST ?action=add_match&id=5   | update_match&match_id=3 | delete_match&match_id=3
 *
 * Cómo se usa el esquema:
 *  - Equipos de un torneo  = filas de tabla_posiciones con equipo_id_fk (es el único
 *    vínculo torneo–equipo del esquema). Esa fila también guarda las estadísticas.
 *  - Equipos de un partido = enfrentamiento_equipo; la columna es_local (ajustes.sql)
 *    marca al local. puntaje_a = local, puntaje_b = visitante. Partidos cargados antes
 *    de esa columna toman como local al equipo de menor id.
 *  - La app NO tiene permiso DELETE sobre resultado (usuarios.sql): un resultado
 *    "deshecho" vuelve a estado 'pendiente', y no se pueden borrar partidos ni
 *    torneos que ya tengan resultados registrados.
 *
 * El JSON devuelto mantiene el formato que usa el frontend (name, teams[], matches[]...).
 */

require_once __DIR__ . '/bootstrap.php';

// id del frontend (tournamentTypes en main.js)  =>  nombre en la tabla tipo_torneo
const TIPOS = [
    'liga-simple'        => 'liga_t_vs_t',
    'liga-doble'         => 'liga_doble_vuelta',
    'eliminacion-simple' => 'eliminacion_simple',
    'eliminacion-doble'  => 'doble_eliminacion',
    'sistema-puntos'     => 'sistema_puntos',
    'vidas'              => 'vidas',
    'suizo'              => 'sistema_suizo',
    'grupos'             => 'grupos_eliminacion',
    'blitz'              => 'torneo_relampago',
    'gran-premio'        => 'gran_premio',
    'copa-desafio'       => 'copa_desafio',
];
const TIPO_LABEL = [
    'liga_t_vs_t' => 'Liga todos vs todos', 'liga_doble_vuelta' => 'Liga doble vuelta',
    'eliminacion_simple' => 'Eliminación simple', 'doble_eliminacion' => 'Doble eliminación',
    'sistema_puntos' => 'Sistema de puntos', 'vidas' => 'Vidas / continuaciones',
    'sistema_suizo' => 'Sistema suizo', 'grupos_eliminacion' => 'Grupos + eliminación',
    'torneo_relampago' => 'Torneo relámpago', 'gran_premio' => 'Gran premio', 'copa_desafio' => 'Copa desafío',
];
const TIPO_CATEGORIA = [
    'liga_t_vs_t' => 'liga', 'liga_doble_vuelta' => 'liga', 'eliminacion_simple' => 'eliminacion',
    'doble_eliminacion' => 'eliminacion', 'sistema_puntos' => 'puntos', 'vidas' => 'puntos',
    'sistema_suizo' => 'mixto', 'grupos_eliminacion' => 'mixto', 'torneo_relampago' => 'especial',
    'gran_premio' => 'especial', 'copa_desafio' => 'especial',
];
const EMOJIS = ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🥍','🏒'];
const MONEDAS = ['UYU', 'USD', 'ARS', 'BRL', 'EUR'];

$pdo = db();
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'list':
            respond(['success' => true, 'tournaments' => listTournaments($pdo, '1=1', [])]);

        case 'mine':
            $orgId = organizadorIdOf($pdo, requireLogin());
            respond(['success' => true, 'tournaments' => $orgId ? listTournaments($pdo, 't.organizador_id_fk = :p0', [$orgId]) : []]);

        case 'get':
            $t = getFullTournament($pdo, (int)($_GET['id'] ?? 0));
            if (!$t) respond(['success' => false, 'error' => 'Torneo no encontrado'], 404);
            respond(['success' => true, 'tournament' => $t]);

        case 'create':
            requireMethod('POST');
            respond(createTournament($pdo, bodyJson()));

        case 'inscribirse':
            requireMethod('POST');
            respond(inscribirse($pdo, bodyJson()));

        case 'update':
            requireMethod('POST');
            $id = (int)($_GET['id'] ?? 0);
            requireOwnTournament($pdo, $id);
            respond(updateTournament($pdo, $id, bodyJson()));

        case 'delete':
            requireMethod('POST');
            $id = (int)($_GET['id'] ?? 0);
            requireOwnTournament($pdo, $id);
            respond(deleteTournament($pdo, $id));

        case 'add_team':
            requireMethod('POST');
            $id = (int)($_GET['id'] ?? 0);
            requireOwnTournament($pdo, $id);
            respond(addTeam($pdo, $id, bodyJson()));

        case 'update_team':
            requireMethod('POST');
            respond(updateTeam($pdo, (int)($_GET['team_id'] ?? 0), bodyJson()));

        case 'delete_team':
            requireMethod('POST');
            respond(deleteTeam($pdo, (int)($_GET['team_id'] ?? 0)));

        case 'add_match':
            requireMethod('POST');
            $id = (int)($_GET['id'] ?? 0);
            requireOwnTournament($pdo, $id);
            respond(addMatch($pdo, $id, bodyJson()));

        case 'update_match':
            requireMethod('POST');
            respond(updateMatch($pdo, (int)($_GET['match_id'] ?? 0), bodyJson()));

        case 'delete_match':
            requireMethod('POST');
            respond(deleteMatch($pdo, (int)($_GET['match_id'] ?? 0)));

        default:
            respond(['success' => false, 'error' => 'Acción no reconocida.'], 400);
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    failInternal($e);
}

// =====================================================
// Autorización
// =====================================================

function organizadorIdOf(PDO $pdo, string $ci): ?int {
    $s = $pdo->prepare("SELECT organizador_id FROM organizador WHERE usuario_ci_fk = ? ORDER BY organizador_id LIMIT 1");
    $s->execute([$ci]);
    $v = $s->fetchColumn();
    return $v === false ? null : (int)$v;
}

/** organizador_id del usuario logueado. Solo al crear un torneo ($crear) se le otorga el rol. */
function requireOrganizadorId(PDO $pdo, bool $crear = false): int {
    $ci = requireLogin();
    $id = organizadorIdOf($pdo, $ci);
    if ($id !== null) return $id;
    if (!$crear) respond(['success' => false, 'error' => 'No tenés permiso: no organizás este torneo.'], 403);
    $pdo->prepare("INSERT INTO organizador (usuario_ci_fk) VALUES (?)")->execute([$ci]);
    return (int)$pdo->lastInsertId();
}

function requireOwnTournament(PDO $pdo, int $torneoId): int {
    $orgId = requireOrganizadorId($pdo);
    $s = $pdo->prepare("SELECT organizador_id_fk FROM torneo WHERE torneo_id = ?");
    $s->execute([$torneoId]);
    $owner = $s->fetchColumn();
    if ($owner === false) respond(['success' => false, 'error' => 'Torneo no encontrado'], 404);
    if ((int)$owner !== $orgId) respond(['success' => false, 'error' => 'No tenés permiso sobre este torneo.'], 403);
    return $orgId;
}

/** Torneo (del organizador logueado) en el que está el equipo. */
function requireOwnTeam(PDO $pdo, int $equipoId): int {
    $orgId = requireOrganizadorId($pdo);
    $s = $pdo->prepare("SELECT tp.torneo_id_fk FROM tabla_posiciones tp JOIN torneo t ON t.torneo_id = tp.torneo_id_fk
                        WHERE tp.equipo_id_fk = ? AND t.organizador_id_fk = ? LIMIT 1");
    $s->execute([$equipoId, $orgId]);
    $tid = $s->fetchColumn();
    if ($tid === false) respond(['success' => false, 'error' => 'Equipo no encontrado o sin permiso.'], 404);
    return (int)$tid;
}

/** Torneo (del organizador logueado) al que pertenece el partido. */
function requireOwnMatch(PDO $pdo, int $matchId): int {
    $orgId = requireOrganizadorId($pdo);
    $s = $pdo->prepare("SELECT e.torneo_id_fk, t.organizador_id_fk FROM enfrentamiento e
                        JOIN torneo t ON t.torneo_id = e.torneo_id_fk WHERE e.enfrentamiento_id = ?");
    $s->execute([$matchId]);
    $r = $s->fetch();
    if (!$r) respond(['success' => false, 'error' => 'Partido no encontrado'], 404);
    if ((int)$r['organizador_id_fk'] !== $orgId) respond(['success' => false, 'error' => 'No tenés permiso sobre este partido.'], 403);
    return (int)$r['torneo_id_fk'];
}

// =====================================================
// Utilidades
// =====================================================

function strOrNull($v, int $max): ?string {
    $s = trim((string)($v ?? ''));
    return $s === '' ? null : mb_substr($s, 0, $max);
}
function validDate(?string $s): bool {
    if ($s === null) return false;
    $d = DateTime::createFromFormat('Y-m-d', $s);
    return $d && $d->format('Y-m-d') === $s;
}
function validTime(?string $s): bool {
    return $s !== null && preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $s) === 1;
}
function money($v): float { return max(0, round((float)$v, 2)); }
function num($v) {           // DOUBLE de la BD -> entero si no tiene decimales
    if ($v === null) return null;
    $f = (float)$v;
    return floor($f) == $f ? (int)$f : $f;
}
function estadoToJs(?string $e): string {
    return ['activo' => 'active', 'finalizado' => 'finished'][$e] ?? 'pending';
}
function estadoToDb(string $e): ?string {
    return ['pending' => 'pendiente', 'active' => 'activo', 'finished' => 'finalizado'][$e] ?? null;
}
function tipoToDb(?string $frontId, PDO $pdo): ?string {
    if ($frontId === null || $frontId === '') return null;
    $name = TIPOS[$frontId] ?? null;
    if ($name === null) respond(['success' => false, 'error' => 'Formato de torneo inválido.'], 422);
    $s = $pdo->prepare("SELECT 1 FROM tipo_torneo WHERE nombre = ?");
    $s->execute([$name]);
    if (!$s->fetch()) respond(['success' => false, 'error' => 'Formato de torneo no habilitado en la base de datos.'], 422);
    return $name;
}
function tipoToFront(?string $dbName): ?string {
    $id = array_search($dbName, TIPOS, true);
    return $id === false ? null : $id;
}
function cupo(PDO $pdo, int $torneoId): int {
    $s = $pdo->prepare("SELECT cant_equipos FROM configuracion_torneo WHERE torneo_id_fk = ? ORDER BY configuracion_id LIMIT 1");
    $s->execute([$torneoId]);
    $v = $s->fetchColumn();
    return $v ? (int)$v : 8;
}
function cantEquipos(PDO $pdo, int $torneoId): int {
    $s = $pdo->prepare("SELECT COUNT(*) FROM tabla_posiciones WHERE torneo_id_fk = ? AND equipo_id_fk IS NOT NULL");
    $s->execute([$torneoId]);
    return (int)$s->fetchColumn();
}
function teamInTournament(PDO $pdo, int $torneoId, $raw): ?int {
    if ($raw === null || $raw === '' || $raw === 'tbd') return null;
    $id = (int)$raw;
    $s = $pdo->prepare("SELECT 1 FROM tabla_posiciones WHERE torneo_id_fk = ? AND equipo_id_fk = ?");
    $s->execute([$torneoId, $id]);
    if (!$s->fetch()) respond(['success' => false, 'error' => 'Uno de los equipos no pertenece a este torneo.'], 422);
    return $id;
}
/** Borra el equipo si ya no lo referencia ningún torneo, partido ni resultado. */
function borrarEquipoSiHuerfano(PDO $pdo, int $equipoId): void {
    $s = $pdo->prepare("SELECT
        (SELECT COUNT(*) FROM tabla_posiciones WHERE equipo_id_fk = ?) +
        (SELECT COUNT(*) FROM enfrentamiento_equipo WHERE equipo_id_fk = ?) +
        (SELECT COUNT(*) FROM resultado WHERE ganador_equipo_fk = ?)");
    $s->execute([$equipoId, $equipoId, $equipoId]);
    if ((int)$s->fetchColumn() === 0) {
        $pdo->prepare("DELETE FROM equipo_participante WHERE equipo_id_fk = ?")->execute([$equipoId]);
        $pdo->prepare("DELETE FROM equipo WHERE equipo_id = ?")->execute([$equipoId]);
    }
}

// =====================================================
// Lectura
// =====================================================

function listTournaments(PDO $pdo, string $where, array $params): array {
    $s = $pdo->prepare("
        SELECT t.*, c.cant_equipos, c.precio_participacion, c.premios, c.moneda,
               COALESCE(NULLIF(c.contacto_nombre, ''), CONCAT(u.nombre, ' ', u.apellido)) AS organizador,
               (SELECT COUNT(*) FROM tabla_posiciones tp WHERE tp.torneo_id_fk = t.torneo_id AND tp.equipo_id_fk IS NOT NULL) AS team_count,
               (SELECT COUNT(*) FROM enfrentamiento e WHERE e.torneo_id_fk = t.torneo_id) AS match_count,
               (o.usuario_ci_fk = :me) AS is_owner,
               EXISTS (SELECT 1 FROM tabla_posiciones tp2
                         JOIN equipo_participante ep ON ep.equipo_id_fk = tp2.equipo_id_fk
                         JOIN participante p ON p.participante_id = ep.participante_id_fk
                        WHERE tp2.torneo_id_fk = t.torneo_id AND p.usuario_ci_fk = :me2) AS joined
        FROM torneo t
        LEFT JOIN configuracion_torneo c ON c.configuracion_id =
             (SELECT MIN(configuracion_id) FROM configuracion_torneo WHERE torneo_id_fk = t.torneo_id)
        LEFT JOIN organizador o ON o.organizador_id = t.organizador_id_fk
        LEFT JOIN usuario u ON u.ci = o.usuario_ci_fk
        WHERE $where ORDER BY t.torneo_id DESC");
    $me = currentCi() ?? '';
    $s->bindValue(':me', $me);
    $s->bindValue(':me2', $me);
    foreach (array_values($params) as $i => $v) $s->bindValue(':p' . $i, $v);
    $s->execute();
    return array_map(fn($t) => [
        'id'          => (int)$t['torneo_id'],
        'name'        => $t['nombre'],
        'description' => $t['descripcion'],
        'sport'       => $t['deporte'],
        'formatSubId' => tipoToFront($t['tipo_torneo']),
        'formatLabel' => TIPO_LABEL[$t['tipo_torneo']] ?? null,
        'maxTeams'    => (int)($t['cant_equipos'] ?? 8),
        'startDate'   => $t['fecha_inicio'],
        'venue'       => $t['direccion'],
        'department'  => $t['departamento'],
        'status'      => estadoToJs($t['estado']),
        'organizer'   => $t['organizador'],
        'entryFee'    => num($t['precio_participacion']) ?? 0,
        'currency'    => $t['moneda'],
        'prizesText'  => $t['premios'],
        'teamCount'   => (int)$t['team_count'],
        'matchCount'  => (int)$t['match_count'],
        'isOwner'     => (bool)$t['is_owner'],
        'joined'      => (bool)$t['joined'],
    ], $s->fetchAll());
}

function getFullTournament(PDO $pdo, int $id): ?array {
    $s = $pdo->prepare("
        SELECT t.*, c.cant_equipos, c.precio_participacion, c.alquiler_lugar, c.precio_juez, c.premios, c.moneda,
               c.arbitro_nombre, c.arbitro_telefono, c.arbitro_email, c.contacto_nombre, c.contacto_telefono, c.contacto_email,
               u.nombre AS org_nombre, u.apellido AS org_apellido, u.telefono AS org_tel, u.email AS org_email
        FROM torneo t
        LEFT JOIN configuracion_torneo c ON c.configuracion_id =
             (SELECT MIN(configuracion_id) FROM configuracion_torneo WHERE torneo_id_fk = t.torneo_id)
        LEFT JOIN organizador o ON o.organizador_id = t.organizador_id_fk
        LEFT JOIN usuario u ON u.ci = o.usuario_ci_fk
        WHERE t.torneo_id = ?");
    $s->execute([$id]);
    $t = $s->fetch();
    if (!$t) return null;

    $tm = $pdo->prepare("SELECT e.equipo_id, e.nombre, e.tamanio, tp.puntos, tp.partidos_ganados, tp.partidos_perdidos, tp.partidos_empatados
                         FROM tabla_posiciones tp JOIN equipo e ON e.equipo_id = tp.equipo_id_fk
                         WHERE tp.torneo_id_fk = ? ORDER BY e.equipo_id");
    $tm->execute([$id]);
    $teams = [];
    foreach ($tm->fetchAll() as $i => $r) {
        $teams[] = [
            'id' => (string)$r['equipo_id'], 'name' => $r['nombre'], 'players' => (int)($r['tamanio'] ?? 1),
            'wins' => (int)$r['partidos_ganados'], 'losses' => (int)$r['partidos_perdidos'],
            'draws' => (int)$r['partidos_empatados'], 'points' => (int)$r['puntos'],
            'status' => 'accepted', 'group' => null, 'emoji' => EMOJIS[$i % count(EMOJIS)],
        ];
    }

    $mt = $pdo->prepare("
        SELECT e.enfrentamiento_id, e.ubicacion, e.fecha, r.nombre AS fase,
               (SELECT equipo_id_fk FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = e.enfrentamiento_id ORDER BY es_local DESC, equipo_id_fk LIMIT 1) AS eq_a,
               (SELECT equipo_id_fk FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = e.enfrentamiento_id ORDER BY es_local DESC, equipo_id_fk LIMIT 1 OFFSET 1) AS eq_b,
               res.puntaje_a, res.puntaje_b, res.estado AS res_estado
        FROM enfrentamiento e
        JOIN ronda r ON r.ronda_id = e.ronda_id_fk
        LEFT JOIN resultado res ON res.resultado_id =
             (SELECT MAX(resultado_id) FROM resultado WHERE enfrentamiento_id_fk = e.enfrentamiento_id)
        WHERE e.torneo_id_fk = ? ORDER BY e.fecha IS NULL, e.fecha, e.enfrentamiento_id");
    $mt->execute([$id]);
    $matches = array_map(function ($r) {
        $played = in_array($r['res_estado'], ['finalizado', 'empate'], true);
        return [
            'id'        => (string)$r['enfrentamiento_id'],
            'home'      => $r['eq_a'] !== null ? (string)$r['eq_a'] : null,   // local
            'away'      => $r['eq_b'] !== null ? (string)$r['eq_b'] : null,
            'homeScore' => $played ? num($r['puntaje_a']) : null,
            'awayScore' => $played ? num($r['puntaje_b']) : null,
            'date'      => $r['fecha'] ? substr($r['fecha'], 0, 10) : null,
            'time'      => $r['fecha'] ? substr($r['fecha'], 11, 5) : null,
            'venue'     => $r['ubicacion'],
            'phase'     => $r['fase'] ?: 'Fase de Grupos',
            'played'    => $played,
        ];
    }, $mt->fetchAll());

    return [
        'id'           => (string)$t['torneo_id'],
        'name'         => $t['nombre'],
        'description'  => $t['descripcion'],
        'sport'        => $t['deporte'],
        'formatTypeId' => TIPO_CATEGORIA[$t['tipo_torneo']] ?? null,
        'formatSubId'  => tipoToFront($t['tipo_torneo']),
        'formatLabel'  => TIPO_LABEL[$t['tipo_torneo']] ?? null,
        'maxTeams'     => (int)($t['cant_equipos'] ?? 8),
        'startDate'    => $t['fecha_inicio'],
        'endDate'      => $t['fecha_fin'],
        'venue'        => $t['direccion'],
        'department'   => $t['departamento'],
        'status'       => estadoToJs($t['estado']),
        'costs' => [
            'entryFee'    => num($t['precio_participacion']) ?? 0,
            'fieldCost'   => num($t['alquiler_lugar']) ?? 0,
            'refereeCost' => num($t['precio_juez']) ?? 0,
            'currency'    => $t['moneda'],
        ],
        'referee' => [
            'name'  => $t['arbitro_nombre'],
            'phone' => $t['arbitro_telefono'],
            'email' => $t['arbitro_email'],
        ],
        'prizesText' => $t['premios'],
        // Contacto que ven los participantes: el cargado en el torneo o, si no hay, el de la cuenta
        'organizer'  => [
            'name'  => $t['contacto_nombre'] ?: trim(($t['org_nombre'] ?? '') . ' ' . ($t['org_apellido'] ?? '')),
            'phone' => $t['contacto_telefono'] ?: $t['org_tel'],
            'email' => $t['contacto_email'] ?: $t['org_email'],
        ],
        'isOwner'    => ($ci = currentCi()) !== null && organizadorIdOf($pdo, $ci) === (int)$t['organizador_id_fk'],
        'teams'      => $teams,
        'matches'    => $matches,
    ];
}

// =====================================================
// Torneos
// =====================================================

function readTournamentFields(PDO $pdo, array $d, bool $partial): array {
    $f = [];
    if (!$partial || array_key_exists('name', $d)) {
        $n = trim((string)($d['name'] ?? ''));
        if ($n === '' || mb_strlen($n) > 150) respond(['success' => false, 'error' => 'El nombre del torneo es obligatorio (máx. 150 caracteres).'], 422);
        $f['nombre'] = $n;
    }
    $map = ['description' => ['descripcion', 2000], 'sport' => ['deporte', 100], 'venue' => ['direccion', 150], 'department' => ['departamento', 100]];
    foreach ($map as $key => [$col, $max]) {
        if (!$partial || array_key_exists($key, $d)) $f[$col] = strOrNull($d[$key] ?? null, $max);
    }
    if (!$partial || array_key_exists('formatSubId', $d)) $f['tipo_torneo'] = tipoToDb(strOrNull($d['formatSubId'] ?? null, 50), $pdo);
    foreach (['startDate' => 'fecha_inicio', 'endDate' => 'fecha_fin'] as $key => $col) {
        if (!$partial || array_key_exists($key, $d)) {
            $v = strOrNull($d[$key] ?? null, 10);
            if ($v !== null && !validDate($v)) respond(['success' => false, 'error' => 'Fecha inválida.'], 422);
            $f[$col] = $v;
        }
    }
    if (!empty($f['fecha_inicio']) && !empty($f['fecha_fin']) && $f['fecha_fin'] < $f['fecha_inicio']) {
        respond(['success' => false, 'error' => 'La fecha de fin no puede ser anterior a la de inicio.'], 422);
    }
    if (array_key_exists('status', $d)) {
        $e = estadoToDb((string)$d['status']);
        if ($e === null) respond(['success' => false, 'error' => 'Estado inválido.'], 422);
        $f['estado'] = $e;
    }
    return $f;
}

function readConfigFields(array $d, bool $partial): array {
    $c = [];
    if (!$partial || array_key_exists('maxTeams', $d)) {
        $m = (int)($d['maxTeams'] ?? 8);
        if ($m < 2 || $m > 1024) respond(['success' => false, 'error' => 'La cantidad de participantes debe estar entre 2 y 1024.'], 422);
        $c['cant_equipos'] = $m;
        $c['cant_participante'] = $m;
    }
    if (isset($d['costs']) && is_array($d['costs'])) {
        foreach (['entryFee' => 'precio_participacion', 'fieldCost' => 'alquiler_lugar', 'refereeCost' => 'precio_juez'] as $k => $col) {
            if (array_key_exists($k, $d['costs'])) $c[$col] = money($d['costs'][$k]);
        }
    }
    if (array_key_exists('prizesText', $d)) $c['premios'] = strOrNull($d['prizesText'], 255);
    if (isset($d['costs']) && is_array($d['costs']) && array_key_exists('currency', $d['costs'])) {
        $m = strtoupper(trim((string)$d['costs']['currency']));
        if ($m !== '' && !in_array($m, MONEDAS, true)) respond(['success' => false, 'error' => 'Moneda inválida.'], 422);
        $c['moneda'] = $m === '' ? null : $m;
    }
    foreach (['referee' => ['arbitro', 'del árbitro'], 'contact' => ['contacto', 'de contacto']] as $key => [$pref, $txt]) {
        if (!isset($d[$key]) || !is_array($d[$key])) continue;
        $x = $d[$key];
        if (array_key_exists('name', $x)) {
            $c["{$pref}_nombre"] = strOrNull($x['name'], 150);
        }
        if (array_key_exists('phone', $x)) {
            $tel = strOrNull($x['phone'], 20);
            if ($tel !== null && !preg_match('/^[0-9+()\s-]{6,20}$/', $tel)) respond(['success' => false, 'error' => "El teléfono $txt no es válido."], 422);
            $c["{$pref}_telefono"] = $tel;
        }
        if (array_key_exists('email', $x)) {
            $mail = strOrNull($x['email'], 150);
            if ($mail !== null && !filter_var($mail, FILTER_VALIDATE_EMAIL)) respond(['success' => false, 'error' => "El correo $txt no es válido."], 422);
            $c["{$pref}_email"] = $mail;
        }
    }
    return $c;
}

function createTournament(PDO $pdo, array $d): array {
    $orgId = requireOrganizadorId($pdo, true);
    $t = readTournamentFields($pdo, $d, false);
    $c = readConfigFields($d, false);

    $pdo->beginTransaction();
    $pdo->prepare("INSERT INTO torneo (nombre, descripcion, deporte, tipo_torneo, fecha_inicio, fecha_fin, direccion, departamento, estado, organizador_id_fk)
                   VALUES (?,?,?,?,?,?,?,?,'pendiente',?)")
        ->execute([$t['nombre'], $t['descripcion'], $t['deporte'], $t['tipo_torneo'], $t['fecha_inicio'], $t['fecha_fin'],
                   $t['direccion'], $t['departamento'], $orgId]);
    $id = (int)$pdo->lastInsertId();

    $c += ['precio_participacion' => 0, 'alquiler_lugar' => 0, 'precio_juez' => 0];
    $c['competitivo'] = 1;
    $c['torneo_id_fk'] = $id;
    $cols = implode(', ', array_keys($c));
    $marks = implode(', ', array_fill(0, count($c), '?'));
    $pdo->prepare("INSERT INTO configuracion_torneo ($cols) VALUES ($marks)")->execute(array_values($c));
    $pdo->commit();
    return ['success' => true, 'id' => $id];
}

function updateTournament(PDO $pdo, int $id, array $d): array {
    // El dashboard manda premios por puesto: se guardan como texto en configuracion_torneo.premios.
    if (isset($d['prizes']) && is_array($d['prizes']) && !array_key_exists('prizesText', $d)) {
        $lines = [];
        foreach (array_slice($d['prizes'], 0, 3) as $p) {
            $title = trim((string)($p['title'] ?? ''));
            if ($title !== '') $lines[] = (int)($p['place'] ?? 0) . '° ' . $title . (trim((string)($p['detail'] ?? '')) !== '' ? ': ' . trim($p['detail']) : '');
        }
        $d['prizesText'] = implode("\n", $lines);
    }
    $t = readTournamentFields($pdo, $d, true);
    $c = readConfigFields($d, true);

    if (isset($c['cant_equipos']) && $c['cant_equipos'] < cantEquipos($pdo, $id)) {
        return ['success' => false, 'error' => 'El cupo no puede ser menor que la cantidad de equipos ya inscriptos.'];
    }
    $prev = $pdo->prepare("SELECT estado FROM torneo WHERE torneo_id = ?");
    $prev->execute([$id]);
    $estadoAntes = $prev->fetchColumn();

    $pdo->beginTransaction();
    if ($t) {
        $set = implode(', ', array_map(fn($k) => "$k = ?", array_keys($t)));
        $pdo->prepare("UPDATE torneo SET $set WHERE torneo_id = ?")->execute([...array_values($t), $id]);
    }
    if ($c) {
        $s = $pdo->prepare("SELECT configuracion_id FROM configuracion_torneo WHERE torneo_id_fk = ? ORDER BY configuracion_id LIMIT 1");
        $s->execute([$id]);
        $cid = $s->fetchColumn();
        if ($cid === false) {
            $pdo->prepare("INSERT INTO configuracion_torneo (cant_equipos, cant_participante, competitivo, torneo_id_fk, admin_id_fk) VALUES (8, 8, 1, ?, NULL)")->execute([$id]);
            $cid = $pdo->lastInsertId();
        }
        $set = implode(', ', array_map(fn($k) => "$k = ?", array_keys($c)));
        $pdo->prepare("UPDATE configuracion_torneo SET $set WHERE configuracion_id = ?")->execute([...array_values($c), $cid]);
    }
    $pdo->commit();

    if (isset($t['estado']) && $t['estado'] !== $estadoAntes && in_array($t['estado'], ['activo', 'finalizado'], true)) {
        $nombre = nombreTorneo($pdo, $id);
        $msg = $t['estado'] === 'activo' ? "«{$nombre}» comenzó. ¡Éxitos!" : "«{$nombre}» finalizó. Mirá cómo terminó la tabla en tu perfil.";
        foreach (usuariosDeTorneo($pdo, $id) as $u) notificar($pdo, $u, 'torneo_estado', $msg, $id);
    }
    return ['success' => true];
}

function deleteTournament(PDO $pdo, int $id): array {
    $r = $pdo->prepare("SELECT COUNT(*) FROM resultado r JOIN enfrentamiento e ON e.enfrentamiento_id = r.enfrentamiento_id_fk WHERE e.torneo_id_fk = ?");
    $r->execute([$id]);
    if ((int)$r->fetchColumn() > 0) {
        return ['success' => false, 'error' => 'Este torneo tiene resultados registrados y no se puede eliminar (los resultados son permanentes). Podés marcarlo como Finalizado.'];
    }
    $eq = $pdo->prepare("SELECT equipo_id_fk FROM tabla_posiciones WHERE torneo_id_fk = ? AND equipo_id_fk IS NOT NULL");
    $eq->execute([$id]);
    $equipos = array_map('intval', $eq->fetchAll(PDO::FETCH_COLUMN));
    $avisar = usuariosDeTorneo($pdo, $id);
    $nombre = nombreTorneo($pdo, $id);

    $pdo->beginTransaction();
    $sub = "SELECT enfrentamiento_id FROM enfrentamiento WHERE torneo_id_fk = ?";
    foreach (['enfrentamiento_juez', 'enfrentamiento_equipo', 'enfrentamiento_participante'] as $tbl) {
        $pdo->prepare("DELETE FROM $tbl WHERE enfrentamiento_id_fk IN ($sub)")->execute([$id]);
    }
    foreach (['DELETE FROM enfrentamiento WHERE torneo_id_fk = ?', 'DELETE FROM ronda WHERE torneo_id_fk = ?',
              'DELETE FROM tabla_posiciones WHERE torneo_id_fk = ?', 'DELETE FROM configuracion_torneo WHERE torneo_id_fk = ?',
              'DELETE FROM torneo WHERE torneo_id = ?'] as $sql) {
        $pdo->prepare($sql)->execute([$id]);
    }
    foreach ($equipos as $e) borrarEquipoSiHuerfano($pdo, $e);
    $pdo->commit();
    foreach ($avisar as $u) notificar($pdo, $u, 'torneo_cancelado', "El organizador eliminó el torneo «{$nombre}».");
    return ['success' => true];
}

// =====================================================
// Equipos e inscripción
// =====================================================

function addTeam(PDO $pdo, int $torneoId, array $d): array {
    $name = trim((string)($d['name'] ?? ''));
    if ($name === '' || mb_strlen($name) > 100) return ['success' => false, 'error' => 'El nombre del equipo es obligatorio (máx. 100 caracteres).'];
    $players = max(1, (int)($d['players'] ?? 1));
    if ($players > 500) return ['success' => false, 'error' => 'Cantidad de jugadores inválida.'];
    if (cantEquipos($pdo, $torneoId) >= cupo($pdo, $torneoId)) return ['success' => false, 'error' => 'El torneo alcanzó el máximo de participantes.'];

    $pdo->beginTransaction();
    $pdo->prepare("INSERT INTO equipo (nombre, tamanio) VALUES (?, ?)")->execute([$name, $players]);
    $equipoId = (int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO tabla_posiciones (torneo_id_fk, equipo_id_fk) VALUES (?, ?)")->execute([$torneoId, $equipoId]);
    $pdo->commit();
    return ['success' => true, 'id' => $equipoId];
}

function updateTeam(PDO $pdo, int $equipoId, array $d): array {
    requireOwnTeam($pdo, $equipoId);
    $set = []; $vals = [];
    if (array_key_exists('name', $d)) {
        $n = trim((string)$d['name']);
        if ($n === '' || mb_strlen($n) > 100) return ['success' => false, 'error' => 'Nombre inválido.'];
        $set[] = 'nombre = ?'; $vals[] = $n;
    }
    if (array_key_exists('players', $d)) {
        $p = (int)$d['players'];
        if ($p < 1 || $p > 500) return ['success' => false, 'error' => 'Cantidad de jugadores inválida.'];
        $set[] = 'tamanio = ?'; $vals[] = $p;
    }
    if ($set) $pdo->prepare("UPDATE equipo SET " . implode(', ', $set) . " WHERE equipo_id = ?")->execute([...$vals, $equipoId]);
    return ['success' => true];
}

function deleteTeam(PDO $pdo, int $equipoId): array {
    $torneoId = requireOwnTeam($pdo, $equipoId);
    $r = $pdo->prepare("SELECT COUNT(*) FROM enfrentamiento_equipo ee
                        JOIN enfrentamiento e ON e.enfrentamiento_id = ee.enfrentamiento_id_fk
                        JOIN resultado r ON r.enfrentamiento_id_fk = e.enfrentamiento_id
                        WHERE ee.equipo_id_fk = ? AND e.torneo_id_fk = ?");
    $r->execute([$equipoId, $torneoId]);
    if ((int)$r->fetchColumn() > 0) {
        return ['success' => false, 'error' => 'El equipo tiene partidos con resultado registrado y no se puede eliminar.'];
    }
    $avisar = usuariosDeEquipo($pdo, $equipoId);
    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM enfrentamiento_equipo WHERE equipo_id_fk = ?
                   AND enfrentamiento_id_fk IN (SELECT enfrentamiento_id FROM enfrentamiento WHERE torneo_id_fk = ?)")
        ->execute([$equipoId, $torneoId]);
    $pdo->prepare("DELETE FROM tabla_posiciones WHERE torneo_id_fk = ? AND equipo_id_fk = ?")->execute([$torneoId, $equipoId]);
    borrarEquipoSiHuerfano($pdo, $equipoId);
    $pdo->commit();
    $nombre = nombreTorneo($pdo, $torneoId);
    foreach ($avisar as $u) notificar($pdo, $u, 'baja', "El organizador te quitó del torneo «{$nombre}».", $torneoId);
    return ['success' => true];
}

function inscribirse(PDO $pdo, array $d): array {
    $ci = requireLogin();
    $torneoId = (int)($d['torneoId'] ?? 0);

    $s = $pdo->prepare("SELECT estado FROM torneo WHERE torneo_id = ?");
    $s->execute([$torneoId]);
    $estado = $s->fetchColumn();
    if ($estado === false) return ['success' => false, 'error' => 'Torneo no encontrado.'];
    if ($estado !== 'pendiente') return ['success' => false, 'error' => 'Las inscripciones de este torneo están cerradas.'];
    $p = $pdo->prepare("SELECT participante_id FROM participante WHERE usuario_ci_fk = ? ORDER BY participante_id LIMIT 1");
    $p->execute([$ci]);
    $participanteId = $p->fetchColumn();

    if ($participanteId !== false) {
        $dup = $pdo->prepare("SELECT 1 FROM tabla_posiciones WHERE torneo_id_fk = ? AND participante_id_fk = ?");
        $dup->execute([$torneoId, $participanteId]);
        if ($dup->fetch()) return ['success' => false, 'error' => 'Ya estás inscripto en este torneo.'];
    }
    if (cantEquipos($pdo, $torneoId) >= cupo($pdo, $torneoId)) return ['success' => false, 'error' => 'El torneo está completo.'];

    $teamName = strOrNull($d['teamName'] ?? null, 100);
    if ($teamName === null) {
        $u = $pdo->prepare("SELECT CONCAT(nombre, ' ', apellido) FROM usuario WHERE ci = ?");
        $u->execute([$ci]);
        $teamName = mb_substr((string)$u->fetchColumn(), 0, 100);
    }

    $pdo->beginTransaction();
    if ($participanteId === false) {
        $pdo->prepare("INSERT INTO participante (usuario_ci_fk, carne_deportista) VALUES (?, 0)")->execute([$ci]);
        $participanteId = $pdo->lastInsertId();
    }
    $participanteId = (int)$participanteId;
    $pdo->prepare("INSERT INTO equipo (nombre, tamanio) VALUES (?, 1)")->execute([$teamName]);
    $equipoId = (int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO equipo_participante (equipo_id_fk, participante_id_fk) VALUES (?, ?)")->execute([$equipoId, $participanteId]);
    $pdo->prepare("INSERT INTO tabla_posiciones (torneo_id_fk, equipo_id_fk, participante_id_fk) VALUES (?, ?, ?)")
        ->execute([$torneoId, $equipoId, $participanteId]);
    $pdo->commit();

    $nombre = nombreTorneo($pdo, $torneoId);
    $q = $pdo->prepare("SELECT CONCAT(u.nombre, ' ', u.apellido) AS quien, o.usuario_ci_fk AS org
                        FROM usuario u, torneo t JOIN organizador o ON o.organizador_id = t.organizador_id_fk
                        WHERE u.ci = ? AND t.torneo_id = ?");
    $q->execute([$ci, $torneoId]);
    $x = $q->fetch();
    if ($x && $x['org'] !== $ci) {
        notificar($pdo, $x['org'], 'nuevo_inscripto', "{$x['quien']} se inscribió en «{$nombre}» con el equipo «{$teamName}».", $torneoId);
    }
    notificar($pdo, $ci, 'inscripcion', "Te inscribiste en «{$nombre}». Te avisamos cuando haya partidos.", $torneoId);
    return ['success' => true, 'message' => 'Inscripción realizada.'];
}

// =====================================================
// Partidos y resultados
// =====================================================

function rondaId(PDO $pdo, int $torneoId, string $nombre): int {
    $s = $pdo->prepare("SELECT ronda_id FROM ronda WHERE torneo_id_fk = ? AND nombre = ? LIMIT 1");
    $s->execute([$torneoId, $nombre]);
    $id = $s->fetchColumn();
    if ($id !== false) return (int)$id;
    $pdo->prepare("INSERT INTO ronda (nombre, torneo_id_fk) VALUES (?, ?)")->execute([$nombre, $torneoId]);
    return (int)$pdo->lastInsertId();
}

/** Valida y normaliza los datos de un partido. Devuelve [equipoHome, equipoAway, fechaDatetime, ronda, ubicacion]. */
function matchFields(PDO $pdo, int $torneoId, array $d): array {
    $home = teamInTournament($pdo, $torneoId, $d['home'] ?? null);
    $away = teamInTournament($pdo, $torneoId, $d['away'] ?? null);
    if ($home !== null && $home === $away) respond(['success' => false, 'error' => 'Local y visitante no pueden ser el mismo equipo.'], 422);

    $date = strOrNull($d['date'] ?? null, 10);
    $time = strOrNull($d['time'] ?? null, 8);
    if ($date !== null && !validDate($date)) respond(['success' => false, 'error' => 'Fecha inválida.'], 422);
    if ($time !== null && !validTime($time)) respond(['success' => false, 'error' => 'Hora inválida.'], 422);
    $fecha = $date !== null ? $date . ' ' . ($time !== null ? substr($time . ':00', 0, 8) : '00:00:00') : null;

    $phase = strOrNull($d['phase'] ?? null, 100) ?? 'Fase de Grupos';
    return [$home, $away, $fecha, rondaId($pdo, $torneoId, $phase), strOrNull($d['venue'] ?? null, 150)];
}

function setMatchTeams(PDO $pdo, int $matchId, ?int $home, ?int $away): void {
    $pdo->prepare("DELETE FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = ?")->execute([$matchId]);
    $ins = $pdo->prepare("INSERT INTO enfrentamiento_equipo (enfrentamiento_id_fk, equipo_id_fk, es_local) VALUES (?, ?, ?)");
    if ($home !== null) $ins->execute([$matchId, $home, 1]);
    if ($away !== null) $ins->execute([$matchId, $away, 0]);
}

function addMatch(PDO $pdo, int $torneoId, array $d): array {
    $orgId = requireOrganizadorId($pdo);
    [$home, $away, $fecha, $ronda, $ubicacion] = matchFields($pdo, $torneoId, $d);
    $pdo->beginTransaction();
    $pdo->prepare("INSERT INTO enfrentamiento (ubicacion, fecha, torneo_id_fk, ronda_id_fk, organizador_id_fk) VALUES (?,?,?,?,?)")
        ->execute([$ubicacion, $fecha, $torneoId, $ronda, $orgId]);
    $id = (int)$pdo->lastInsertId();
    setMatchTeams($pdo, $id, $home, $away);
    $pdo->commit();
    avisarPartido($pdo, $torneoId, $id, $home, $away, $fecha, $ubicacion, 'Nuevo partido');
    return ['success' => true, 'id' => $id];
}

function updateMatch(PDO $pdo, int $matchId, array $d): array {
    $torneoId = requireOwnMatch($pdo, $matchId);
    [$home, $away, $fecha, $ronda, $ubicacion] = matchFields($pdo, $torneoId, $d);

    $played = !empty($d['played']);
    $hs = isset($d['homeScore']) && $d['homeScore'] !== '' ? (float)$d['homeScore'] : null;
    $as = isset($d['awayScore']) && $d['awayScore'] !== '' ? (float)$d['awayScore'] : null;
    if ($played) {
        if ($home === null || $away === null) return ['success' => false, 'error' => 'Para cargar un resultado, el partido necesita los dos equipos.'];
        if ($hs === null || $as === null || $hs < 0 || $as < 0) return ['success' => false, 'error' => 'Ingresá el marcador de ambos equipos.'];
    }

    $antes = estadoPartido($pdo, $matchId);
    $pdo->beginTransaction();
    $pdo->prepare("UPDATE enfrentamiento SET ubicacion = ?, fecha = ?, ronda_id_fk = ? WHERE enfrentamiento_id = ?")
        ->execute([$ubicacion, $fecha, $ronda, $matchId]);
    setMatchTeams($pdo, $matchId, $home, $away);

    $s = $pdo->prepare("SELECT resultado_id FROM resultado WHERE enfrentamiento_id_fk = ? ORDER BY resultado_id DESC LIMIT 1");
    $s->execute([$matchId]);
    $resId = $s->fetchColumn();

    if ($played) {
        [$a, $b] = [$hs, $as];                       // puntaje_a = local, puntaje_b = visitante
        $estado = $a == $b ? 'empate' : 'finalizado';
        $ganador = $a == $b ? null : ($hs > $as ? $home : $away);
        if ($resId === false) {
            $pdo->prepare("INSERT INTO resultado (enfrentamiento_id_fk, puntaje_a, puntaje_b, estado, ganador_equipo_fk) VALUES (?,?,?,?,?)")
                ->execute([$matchId, $a, $b, $estado, $ganador]);
        } else {
            $pdo->prepare("UPDATE resultado SET puntaje_a = ?, puntaje_b = ?, estado = ?, ganador_equipo_fk = ? WHERE resultado_id = ?")
                ->execute([$a, $b, $estado, $ganador, $resId]);
        }
    } elseif ($resId !== false) {
        // La app no puede borrar resultados: se deja el registro como pendiente.
        $pdo->prepare("UPDATE resultado SET puntaje_a = NULL, puntaje_b = NULL, estado = 'pendiente', ganador_equipo_fk = NULL, ganador_participante_fk = NULL WHERE resultado_id = ?")
            ->execute([$resId]);
    }
    recalcularPosiciones($pdo, $torneoId);
    $pdo->commit();

    // Avisos: resultado nuevo o corregido, o cambios de fecha/lugar/rival
    $resultadoNuevo = $played && ($antes['a'] === null || (float)$antes['a'] != $hs || (float)$antes['b'] != $as);
    if ($resultadoNuevo) {
        avisarResultado($pdo, $torneoId, $matchId, $home, $away, $hs, $as);
    } elseif (!$played && ($antes['fecha'] !== $fecha || $antes['lugar'] !== $ubicacion || $antes['home'] !== $home || $antes['away'] !== $away)) {
        avisarPartido($pdo, $torneoId, $matchId, $home, $away, $fecha, $ubicacion, 'Partido actualizado');
    }
    return ['success' => true];
}

function deleteMatch(PDO $pdo, int $matchId): array {
    $torneoId = requireOwnMatch($pdo, $matchId);
    $s = $pdo->prepare("SELECT COUNT(*) FROM resultado WHERE enfrentamiento_id_fk = ?");
    $s->execute([$matchId]);
    if ((int)$s->fetchColumn() > 0) {
        return ['success' => false, 'error' => 'Este partido ya tuvo un resultado registrado y no se puede eliminar (los resultados son permanentes).'];
    }
    $antes = estadoPartido($pdo, $matchId);
    $pdo->beginTransaction();
    foreach (['enfrentamiento_juez', 'enfrentamiento_equipo', 'enfrentamiento_participante'] as $tbl) {
        $pdo->prepare("DELETE FROM $tbl WHERE enfrentamiento_id_fk = ?")->execute([$matchId]);
    }
    $pdo->prepare("DELETE FROM enfrentamiento WHERE enfrentamiento_id = ?")->execute([$matchId]);
    recalcularPosiciones($pdo, $torneoId);
    $pdo->commit();
    $nombre = nombreTorneo($pdo, $torneoId);
    foreach ([[$antes['home'], $antes['away']], [$antes['away'], $antes['home']]] as [$mio, $rival]) {
        foreach (usuariosDeEquipo($pdo, $mio) as $u) {
            notificar($pdo, $u, 'partido_cancelado', "Se canceló tu partido vs " . nombreEquipo($pdo, $rival) . " en «{$nombre}».", $torneoId);
        }
    }
    return ['success' => true];
}

/** Recalcula tabla_posiciones del torneo: 3 puntos por victoria, 1 por empate. */
function recalcularPosiciones(PDO $pdo, int $torneoId): void {
    $s = $pdo->prepare("SELECT equipo_id_fk FROM tabla_posiciones WHERE torneo_id_fk = ? AND equipo_id_fk IS NOT NULL");
    $s->execute([$torneoId]);
    $st = [];
    foreach ($s->fetchAll(PDO::FETCH_COLUMN) as $e) $st[(int)$e] = ['pj' => 0, 'pg' => 0, 'pe' => 0, 'pp' => 0, 'pts' => 0];

    $m = $pdo->prepare("
        SELECT (SELECT equipo_id_fk FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = e.enfrentamiento_id ORDER BY es_local DESC, equipo_id_fk LIMIT 1) AS a,
               (SELECT equipo_id_fk FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = e.enfrentamiento_id ORDER BY es_local DESC, equipo_id_fk LIMIT 1 OFFSET 1) AS b,
               r.puntaje_a, r.puntaje_b
        FROM enfrentamiento e
        JOIN resultado r ON r.resultado_id = (SELECT MAX(resultado_id) FROM resultado WHERE enfrentamiento_id_fk = e.enfrentamiento_id)
        WHERE e.torneo_id_fk = ? AND r.estado IN ('finalizado', 'empate')");
    $m->execute([$torneoId]);
    foreach ($m->fetchAll() as $r) {
        $a = (int)$r['a']; $b = (int)$r['b'];
        if ($a === $b || !isset($st[$a], $st[$b])) continue;
        $st[$a]['pj']++; $st[$b]['pj']++;
        if ($r['puntaje_a'] > $r['puntaje_b'])     { $st[$a]['pg']++; $st[$a]['pts'] += 3; $st[$b]['pp']++; }
        elseif ($r['puntaje_a'] < $r['puntaje_b']) { $st[$b]['pg']++; $st[$b]['pts'] += 3; $st[$a]['pp']++; }
        else { $st[$a]['pe']++; $st[$b]['pe']++; $st[$a]['pts']++; $st[$b]['pts']++; }
    }
    $u = $pdo->prepare("UPDATE tabla_posiciones SET puntos = ?, partidos_jugados = ?, partidos_ganados = ?, partidos_empatados = ?, partidos_perdidos = ?
                        WHERE torneo_id_fk = ? AND equipo_id_fk = ?");
    foreach ($st as $e => $x) $u->execute([$x['pts'], $x['pj'], $x['pg'], $x['pe'], $x['pp'], $torneoId, $e]);
}

// =====================================================
// Avisos de partidos
// =====================================================

/** Local, visitante, fecha, lugar y marcador actuales de un partido. */
function estadoPartido(PDO $pdo, int $matchId): array {
    $s = $pdo->prepare("
        SELECT e.fecha, e.ubicacion,
               (SELECT equipo_id_fk FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = e.enfrentamiento_id ORDER BY es_local DESC, equipo_id_fk LIMIT 1) AS home,
               (SELECT equipo_id_fk FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = e.enfrentamiento_id ORDER BY es_local DESC, equipo_id_fk LIMIT 1 OFFSET 1) AS away,
               (SELECT puntaje_a FROM resultado WHERE enfrentamiento_id_fk = e.enfrentamiento_id ORDER BY resultado_id DESC LIMIT 1) AS a,
               (SELECT puntaje_b FROM resultado WHERE enfrentamiento_id_fk = e.enfrentamiento_id ORDER BY resultado_id DESC LIMIT 1) AS b
        FROM enfrentamiento e WHERE e.enfrentamiento_id = ?");
    $s->execute([$matchId]);
    $r = $s->fetch() ?: [];
    return [
        'fecha' => $r['fecha'] ?? null,
        'lugar' => $r['ubicacion'] ?? null,
        'home'  => isset($r['home']) ? (int)$r['home'] : null,
        'away'  => isset($r['away']) ? (int)$r['away'] : null,
        'a'     => $r['a'] ?? null,
        'b'     => $r['b'] ?? null,
    ];
}

function avisarPartido(PDO $pdo, int $torneoId, int $matchId, ?int $home, ?int $away, ?string $fecha, ?string $lugar, string $titulo): void {
    $nombre = nombreTorneo($pdo, $torneoId);
    $cuando = fechaCorta($fecha) . ($lugar ? " · $lugar" : '');
    foreach ([[$home, $away], [$away, $home]] as [$mio, $rival]) {
        foreach (usuariosDeEquipo($pdo, $mio) as $u) {
            notificar($pdo, $u, 'partido', "$titulo en «{$nombre}»: vs " . nombreEquipo($pdo, $rival) . " — $cuando.", $torneoId, $matchId);
        }
    }
}

function avisarResultado(PDO $pdo, int $torneoId, int $matchId, int $home, int $away, float $hs, float $as): void {
    $nombre = nombreTorneo($pdo, $torneoId);
    $fmt = fn(float $n) => floor($n) == $n ? (string)(int)$n : (string)$n;
    foreach ([[$home, $away, $hs, $as], [$away, $home, $as, $hs]] as [$mio, $rival, $yo, $el]) {
        $verbo = $yo > $el ? 'Ganaste' : ($yo < $el ? 'Perdiste' : 'Empataste');
        foreach (usuariosDeEquipo($pdo, $mio) as $u) {
            notificar($pdo, $u, 'resultado', "$verbo {$fmt($yo)}-{$fmt($el)} vs " . nombreEquipo($pdo, $rival) . " en «{$nombre}».", $torneoId, $matchId);
        }
    }
}
