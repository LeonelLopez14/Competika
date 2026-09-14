<?php
/**
 * API de torneos — Competika
 *
 * Endpoints (todos vía /api/tournaments.php?action=...):
 *   GET  ?action=list                  -> lista resumida de torneos
 *   GET  ?action=get&id=5              -> torneo completo (equipos, partidos, premios)
 *   POST ?action=create                -> crea un torneo 
 *   POST ?action=update&id=5           -> actualiza datos generales del torneo
 *   POST ?action=delete&id=5           -> borra un torneo
 *   POST ?action=add_team&id=5         -> agrega un equipo
 *   POST ?action=update_team&team_id=9 -> actualiza/aprueba/rechaza un equipo
 *   POST ?action=delete_team&team_id=9 -> elimina un equipo
 *   POST ?action=add_match&id=5        -> agrega un partido
 *   POST ?action=update_match&match_id=3 -> edita/carga resultado de un partido
 *   POST ?action=delete_match&match_id=3 -> elimina un partido
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/Database.php';

function respond($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function bodyJson(): array {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

try {
    $pdo = Database::getInstance();
} catch (PDOException $e) {
    respond(['success' => false, 'error' => 'No se pudo conectar a la base de datos: ' . $e->getMessage()], 500);
}

$action = $_GET['action'] ?? '';

try {
    switch ($action) {

        case 'list':
            $stmt = $pdo->query("
                SELECT t.*,
                    (SELECT COUNT(*) FROM teams   WHERE tournament_id = t.id AND status='accepted') AS team_count,
                    (SELECT COUNT(*) FROM matches WHERE tournament_id = t.id) AS match_count
                FROM tournaments t
                ORDER BY t.created_at DESC
            ");
            $rows = array_map('formatTournamentSummary', $stmt->fetchAll());
            respond(['success' => true, 'tournaments' => $rows]);
            break;

        case 'get':
            $id = (int)($_GET['id'] ?? 0);
            $tournament = getFullTournament($pdo, $id);
            if (!$tournament) respond(['success' => false, 'error' => 'Torneo no encontrado'], 404);
            respond(['success' => true, 'tournament' => $tournament]);
            break;

        case 'create':
            requireMethod('POST');
            respond(createTournament($pdo, bodyJson()));
            break;

        case 'update':
            requireMethod('POST');
            $id = (int)($_GET['id'] ?? 0);
            respond(updateTournament($pdo, $id, bodyJson()));
            break;

        case 'delete':
            $id = (int)($_GET['id'] ?? 0);
            $pdo->prepare("DELETE FROM tournaments WHERE id = ?")->execute([$id]);
            respond(['success' => true]);
            break;

        case 'add_team':
            requireMethod('POST');
            $id = (int)($_GET['id'] ?? 0);
            respond(addTeam($pdo, $id, bodyJson()));
            break;

        case 'update_team':
            requireMethod('POST');
            $teamId = (int)($_GET['team_id'] ?? 0);
            respond(updateTeam($pdo, $teamId, bodyJson()));
            break;

        case 'delete_team':
            $teamId = (int)($_GET['team_id'] ?? 0);
            $pdo->prepare("DELETE FROM teams WHERE id = ?")->execute([$teamId]);
            respond(['success' => true]);
            break;

        case 'add_match':
            requireMethod('POST');
            $id = (int)($_GET['id'] ?? 0);
            respond(addMatch($pdo, $id, bodyJson()));
            break;

        case 'update_match':
            requireMethod('POST');
            $matchId = (int)($_GET['match_id'] ?? 0);
            respond(updateMatch($pdo, $matchId, bodyJson()));
            break;

        case 'delete_match':
            $matchId = (int)($_GET['match_id'] ?? 0);
            $pdo->prepare("DELETE FROM matches WHERE id = ?")->execute([$matchId]);
            respond(['success' => true]);
            break;

        default:
            respond(['success' => false, 'error' => 'Acción no reconocida: ' . $action], 400);
    }
} catch (PDOException $e) {
    respond(['success' => false, 'error' => 'Error de base de datos: ' . $e->getMessage()], 500);
}

// =====================================================
// Helpers
// =====================================================

function requireMethod(string $method): void {
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        respond(['success' => false, 'error' => "Método no permitido, se esperaba $method"], 405);
    }
}

function formatTournamentSummary(array $t): array {
    return [
        'id'          => (int)$t['id'],
        'name'        => $t['name'],
        'sport'       => $t['sport'],
        'formatLabel' => $t['format_label'],
        'maxTeams'    => (int)$t['max_teams'],
        'startDate'   => $t['start_date'],
        'venue'       => $t['venue'],
        'status'      => $t['status'],
        'teamCount'   => (int)$t['team_count'],
        'matchCount'  => (int)$t['match_count'],
        'createdAt'   => $t['created_at'],
    ];
}

function getFullTournament(PDO $pdo, int $id): ?array {
    $stmt = $pdo->prepare("SELECT * FROM tournaments WHERE id = ?");
    $stmt->execute([$id]);
    $t = $stmt->fetch();
    if (!$t) return null;

    $prizesStmt = $pdo->prepare("SELECT place, title, detail FROM tournament_prizes WHERE tournament_id = ? ORDER BY place");
    $prizesStmt->execute([$id]);
    $prizeRows = $prizesStmt->fetchAll();

    $teamsStmt = $pdo->prepare("SELECT * FROM teams WHERE tournament_id = ? ORDER BY id");
    $teamsStmt->execute([$id]);
    $teams = array_map(function (array $row): array {
        return [
            'id'      => (string)$row['id'],
            'name'    => $row['name'],
            'players' => (int)$row['players'],
            'group'   => $row['group_name'],
            'wins'    => (int)$row['wins'],
            'losses'  => (int)$row['losses'],
            'status'  => $row['status'],
            'emoji'   => $row['emoji'],
        ];
    }, $teamsStmt->fetchAll());

    $matchesStmt = $pdo->prepare("SELECT * FROM matches WHERE tournament_id = ? ORDER BY match_date, match_time");
    $matchesStmt->execute([$id]);
    $matches = array_map(function (array $row): array {
        return [
            'id'         => (string)$row['id'],
            'home'       => $row['home_team_id'] !== null ? (string)$row['home_team_id'] : null,
            'away'       => $row['away_team_id'] !== null ? (string)$row['away_team_id'] : null,
            'homeScore'  => $row['home_score'] !== null ? (int)$row['home_score'] : null,
            'awayScore'  => $row['away_score'] !== null ? (int)$row['away_score'] : null,
            'date'       => $row['match_date'],
            'time'       => $row['match_time'],
            'venue'      => $row['venue'],
            'phase'      => $row['phase'],
            'played'     => (bool)$row['played'],
            'referee'    => $row['referee'],
            'refPhone'   => $row['ref_phone'],
            'refCost'    => (float)$row['ref_cost'],
            'venueCost'  => (float)$row['venue_cost'],
            'notes'      => $row['notes'],
        ];
    }, $matchesStmt->fetchAll());

    return [
        'id'           => (string)$t['id'],
        'name'         => $t['name'],
        'sport'        => $t['sport'],
        'formatTypeId' => $t['format_type_id'],
        'formatSubId'  => $t['format_sub_id'],
        'formatLabel'  => $t['format_label'],
        'maxTeams'     => (int)$t['max_teams'],
        'startDate'    => $t['start_date'],
        'venue'        => $t['venue'],
        'status'       => $t['status'],
        'costs' => [
            'entryFee'    => (float)$t['entry_fee'],
            'currency'    => $t['currency'],
            'fieldCost'   => (float)$t['field_cost'],
            'refereeCost' => (float)$t['referee_cost'],
        ],
        'referee' => [
            'name'  => $t['referee_name'],
            'phone' => $t['referee_phone'],
            'email' => $t['referee_email'],
        ],
        'prizesText' => $t['prizes_text'],
        'prizes'     => array_map(fn($p) => [
            'place'  => (int)$p['place'],
            'title'  => $p['title'],
            'detail' => $p['detail'],
        ], $prizeRows),
        'organizer' => [
            'name'  => $t['organizer_name'],
            'phone' => $t['organizer_phone'],
            'email' => $t['organizer_email'],
        ],
        'teams'     => $teams,
        'matches'   => $matches,
        'createdAt' => $t['created_at'],
    ];
}

function createTournament(PDO $pdo, array $d): array {
    $name = trim($d['name'] ?? '');
    if ($name === '') {
        return ['success' => false, 'error' => 'El nombre del torneo es obligatorio.'];
    }

    $maxTeams = (int)($d['maxTeams'] ?? 8);
    if ($maxTeams < 2) $maxTeams = 8;

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("
            INSERT INTO tournaments
                (name, sport, format_type_id, format_sub_id, format_label, max_teams, start_date, venue, status,
                 entry_fee, currency, field_cost, referee_cost, referee_name, referee_phone, referee_email,
                 prizes_text, organizer_name, organizer_phone, organizer_email)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ");
        $stmt->execute([
            $name,
            $d['sport'] ?? null,
            $d['formatTypeId'] ?? null,
            $d['formatSubId'] ?? null,
            $d['formatLabel'] ?? null,
            $maxTeams,
            !empty($d['startDate']) ? $d['startDate'] : null,
            $d['venue'] ?? null,
            'pending',
            (float)($d['costs']['entryFee'] ?? 0),
            $d['costs']['currency'] ?? null,
            (float)($d['costs']['fieldCost'] ?? 0),
            (float)($d['costs']['refereeCost'] ?? 0),
            $d['referee']['name'] ?? null,
            $d['referee']['phone'] ?? null,
            $d['referee']['email'] ?? null,
            $d['prizesText'] ?? null,
            $d['organizer']['name'] ?? null,
            $d['organizer']['phone'] ?? null,
            $d['organizer']['email'] ?? null,
        ]);

        $id = (int)$pdo->lastInsertId();

        if (!empty($d['prizes']) && is_array($d['prizes'])) {
            $ps = $pdo->prepare("INSERT INTO tournament_prizes (tournament_id, place, title, detail) VALUES (?,?,?,?)");
            foreach ($d['prizes'] as $p) {
                if (!empty($p['title'])) {
                    $ps->execute([$id, (int)($p['place'] ?? 0), $p['title'], $p['detail'] ?? '']);
                }
            }
        }

        $pdo->commit();
        return ['success' => true, 'id' => $id];
    } catch (Exception $e) {
        $pdo->rollBack();
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function updateTournament(PDO $pdo, int $id, array $d): array {
    if ($id <= 0) return ['success' => false, 'error' => 'ID de torneo inválido.'];

    $stmt = $pdo->prepare("
        UPDATE tournaments SET
            name = ?, sport = ?, venue = ?, max_teams = ?,
            format_sub_id = ?, format_label = ?, status = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $d['name']  ?? '',
        $d['sport'] ?? null,
        $d['venue'] ?? null,
        (int)($d['maxTeams'] ?? 8),
        $d['formatSubId'] ?? null,
        $d['formatLabel'] ?? null,
        $d['status'] ?? 'pending',
        $id,
    ]);

    if (array_key_exists('organizer', $d)) {
        $pdo->prepare("UPDATE tournaments SET organizer_name=?, organizer_phone=?, organizer_email=? WHERE id=?")
            ->execute([$d['organizer']['name'] ?? null, $d['organizer']['phone'] ?? null, $d['organizer']['email'] ?? null, $id]);
    }

    if (array_key_exists('prizes', $d) && is_array($d['prizes'])) {
        $pdo->prepare("DELETE FROM tournament_prizes WHERE tournament_id = ?")->execute([$id]);
        $ps = $pdo->prepare("INSERT INTO tournament_prizes (tournament_id, place, title, detail) VALUES (?,?,?,?)");
        foreach ($d['prizes'] as $p) {
            if (!empty($p['title'])) {
                $ps->execute([$id, (int)($p['place'] ?? 0), $p['title'], $p['detail'] ?? '']);
            }
        }
    }

    return ['success' => true];
}

function addTeam(PDO $pdo, int $tournamentId, array $d): array {
    $name = trim($d['name'] ?? '');
    if ($name === '') return ['success' => false, 'error' => 'El nombre del equipo es obligatorio.'];

    $stmt = $pdo->prepare("INSERT INTO teams (tournament_id, name, players, group_name, status, emoji) VALUES (?,?,?,?,?,?)");
    $stmt->execute([
        $tournamentId,
        $name,
        (int)($d['players'] ?? 0),
        $d['group'] ?? null,
        $d['status'] ?? 'accepted',
        $d['emoji'] ?? '⚽',
    ]);
    return ['success' => true, 'id' => (int)$pdo->lastInsertId()];
}

function updateTeam(PDO $pdo, int $teamId, array $d): array {
    if ($teamId <= 0) return ['success' => false, 'error' => 'ID de equipo inválido.'];

    $map = ['name' => 'name', 'players' => 'players', 'group' => 'group_name', 'status' => 'status', 'wins' => 'wins', 'losses' => 'losses', 'emoji' => 'emoji'];
    $fields = []; $values = [];
    foreach ($map as $key => $col) {
        if (array_key_exists($key, $d)) {
            $fields[] = "$col = ?";
            $values[] = $d[$key];
        }
    }
    if (!$fields) return ['success' => true];

    $values[] = $teamId;
    $pdo->prepare("UPDATE teams SET " . implode(', ', $fields) . " WHERE id = ?")->execute($values);
    return ['success' => true];
}

function addMatch(PDO $pdo, int $tournamentId, array $d): array {
    $toId = fn($v) => ($v === '' || $v === null || $v === 'tbd') ? null : (int)$v;

    $stmt = $pdo->prepare("
        INSERT INTO matches (tournament_id, home_team_id, away_team_id, match_date, match_time, venue, phase)
        VALUES (?,?,?,?,?,?,?)
    ");
    $stmt->execute([
        $tournamentId,
        $toId($d['home'] ?? null),
        $toId($d['away'] ?? null),
        $d['date'] ?? null,
        $d['time'] ?? null,
        $d['venue'] ?? null,
        $d['phase'] ?? 'Fase de Grupos',
    ]);
    return ['success' => true, 'id' => (int)$pdo->lastInsertId()];
}

function updateMatch(PDO $pdo, int $matchId, array $d): array {
    if ($matchId <= 0) return ['success' => false, 'error' => 'ID de partido inválido.'];
    $toId = fn($v) => ($v === '' || $v === null) ? null : (int)$v;
    $played = !empty($d['played']);

    $stmt = $pdo->prepare("
        UPDATE matches SET
            home_team_id=?, away_team_id=?, home_score=?, away_score=?,
            match_date=?, match_time=?, venue=?, phase=?, played=?,
            referee=?, ref_phone=?, ref_cost=?, venue_cost=?, notes=?
        WHERE id=?
    ");
    $stmt->execute([
        $toId($d['home'] ?? null),
        $toId($d['away'] ?? null),
        $played ? ($d['homeScore'] ?? null) : null,
        $played ? ($d['awayScore'] ?? null) : null,
        $d['date'] ?? null,
        $d['time'] ?? null,
        $d['venue'] ?? null,
        $d['phase'] ?? 'Fase de Grupos',
        $played ? 1 : 0,
        $d['referee']   ?? null,
        $d['refPhone']  ?? null,
        (float)($d['refCost']   ?? 0),
        (float)($d['venueCost'] ?? 0),
        $d['notes'] ?? null,
        $matchId,
    ]);
    return ['success' => true];
}
