<?php
/**
 * API de perfil — Competika. Todo requiere sesión y actúa SOLO sobre la
 * cuenta logueada (no recibe la cédula por parámetro).
 *
 *   GET  ?action=me               datos de la cuenta (para Configuración)
 *   GET  ?action=activity         torneos, partidos y estadísticas (para Perfil)
 *   POST ?action=update           {nombre, apellido, nombreUsuario, telefono, biografia, roles:{organizador, participante}}
 *   POST ?action=email            {email, password}
 *   POST ?action=password         {current, next}
 *   POST ?action=avatar           multipart/form-data, campo "avatar" (JPG o PNG, máx. 5 MB)
 *   POST ?action=avatar_delete
 *   POST ?action=delete_account   {password, confirm:"ELIMINAR"}
 *   POST ?action=honor            {matchId}  dar honor al rival de un partido jugado
 */

require_once __DIR__ . '/bootstrap.php';

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_SIZE      = 400;          // px: se guarda recortada en cuadrado
const PASSWORD_RULE    = 'La contraseña debe tener al menos 8 caracteres, con letras y números.';

$pdo = db();
$action = $_GET['action'] ?? '';

try {
    $ci = requireLogin();
    switch ($action) {
        case 'me':             respond(['success' => true, 'user' => loadMe($pdo, $ci)]);
        case 'activity':       respond(['success' => true] + activity($pdo, $ci));
        case 'update':         requireMethod('POST'); respond(updateProfile($pdo, $ci, bodyJson()));
        case 'email':          requireMethod('POST'); respond(updateEmail($pdo, $ci, bodyJson()));
        case 'password':       requireMethod('POST'); respond(updatePassword($pdo, $ci, bodyJson()));
        case 'avatar':         requireMethod('POST'); respond(uploadAvatar($pdo, $ci));
        case 'avatar_delete':  requireMethod('POST'); respond(deleteAvatar($pdo, $ci));
        case 'delete_account': requireMethod('POST'); respond(deleteAccount($pdo, $ci, bodyJson()));
        case 'honor':          requireMethod('POST'); respond(giveHonor($pdo, $ci, bodyJson()));
        default:               respond(['success' => false, 'error' => 'Acción no reconocida.'], 400);
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    failInternal($e);
}

// =====================================================
// Utilidades
// =====================================================

function fail(string $msg, int $code = 422): void {
    respond(['success' => false, 'error' => $msg], $code);
}

function str($v, int $max): ?string {
    $s = trim((string)($v ?? ''));
    return $s === '' ? null : $s;
}

function verifyPassword(PDO $pdo, string $ci, string $password): bool {
    $s = $pdo->prepare("SELECT contrasenia FROM usuario WHERE ci = ?");
    $s->execute([$ci]);
    $hash = $s->fetchColumn();
    return is_string($hash) && $password !== '' && password_verify($password, $hash);
}

function avatarsDir(): string {
    return dirname(__DIR__) . '/uploads/avatars';
}

function removeAvatarFile(?string $archivo): void {
    if (fotoUrl($archivo) !== null) {                    // solo nombres generados por el servidor
        $path = avatarsDir() . '/' . $archivo;
        if (is_file($path)) @unlink($path);
    }
}

function loadMe(PDO $pdo, string $ci): array {
    $s = $pdo->prepare("SELECT nombre, apellido, telefono, direccion, fecha_nac, email, rol_usuario,
                               nombre_usuario, biografia, foto_perfil FROM usuario WHERE ci = ?");
    $s->execute([$ci]);
    $u = $s->fetch();
    if (!$u) fail('La cuenta no existe.', 404);
    return [
        'nombre'        => $u['nombre'],
        'apellido'      => $u['apellido'],
        'telefono'      => $u['telefono'],
        'direccion'     => $u['direccion'],
        'fechaNac'      => $u['fecha_nac'],
        'email'         => $u['email'],
        'rol'           => $u['rol_usuario'],
        'nombreUsuario' => $u['nombre_usuario'],
        'biografia'     => $u['biografia'],
        'foto'          => fotoUrl($u['foto_perfil']),
        'roles'         => userRoles($pdo, $ci),
    ];
}

// =====================================================
// Datos de la cuenta
// =====================================================

function updateProfile(PDO $pdo, string $ci, array $d): array {
    $nombre   = str($d['nombre'] ?? null, 100);
    $apellido = str($d['apellido'] ?? null, 100);
    if ($nombre === null || $apellido === null) fail('Completá tu nombre y apellido.');
    if (mb_strlen($nombre) > 100 || mb_strlen($apellido) > 100) fail('El nombre o el apellido son demasiado largos.');

    $usuario = str($d['nombreUsuario'] ?? null, 30);
    if ($usuario !== null) {
        $usuario = mb_strtolower($usuario);
        if (!preg_match('/^[a-z0-9._]{3,30}$/', $usuario)) {
            fail('El nombre de usuario debe tener entre 3 y 30 caracteres: letras, números, punto o guion bajo.');
        }
        $dup = $pdo->prepare("SELECT 1 FROM usuario WHERE nombre_usuario = ? AND ci <> ?");
        $dup->execute([$usuario, $ci]);
        if ($dup->fetch()) fail('Ese nombre de usuario ya está en uso.');
    }

    $telefono = str($d['telefono'] ?? null, 20);
    if ($telefono !== null && !preg_match('/^[0-9+()\s-]{6,20}$/', $telefono)) fail('El teléfono no es válido.');

    $bio = str($d['biografia'] ?? null, 200);
    if ($bio !== null && mb_strlen($bio) > 200) fail('La biografía admite hasta 200 caracteres.');

    $roles = userRoles($pdo, $ci);
    $quiereOrg  = array_key_exists('roles', $d) && is_array($d['roles']) && array_key_exists('organizador', $d['roles'])
        ? (bool)$d['roles']['organizador'] : $roles['organizador'];
    $quierePart = array_key_exists('roles', $d) && is_array($d['roles']) && array_key_exists('participante', $d['roles'])
        ? (bool)$d['roles']['participante'] : $roles['participante'];

    if ($roles['organizador'] && !$quiereOrg) {
        $c = $pdo->prepare("SELECT COUNT(*) FROM torneo t JOIN organizador o ON o.organizador_id = t.organizador_id_fk WHERE o.usuario_ci_fk = ?");
        $c->execute([$ci]);
        if ((int)$c->fetchColumn() > 0) fail('No podés quitar el rol Organizador mientras organices torneos.');
    }
    if ($roles['participante'] && !$quierePart) {
        $c = $pdo->prepare("SELECT
            (SELECT COUNT(*) FROM equipo_participante ep JOIN participante p ON p.participante_id = ep.participante_id_fk WHERE p.usuario_ci_fk = ?) +
            (SELECT COUNT(*) FROM tabla_posiciones tp JOIN participante p ON p.participante_id = tp.participante_id_fk WHERE p.usuario_ci_fk = ?)");
        $c->execute([$ci, $ci]);
        if ((int)$c->fetchColumn() > 0) fail('No podés quitar el rol Participante mientras estés inscripto en torneos.');
    }

    $pdo->beginTransaction();
    $pdo->prepare("UPDATE usuario SET nombre = ?, apellido = ?, nombre_usuario = ?, telefono = ?, biografia = ? WHERE ci = ?")
        ->execute([$nombre, $apellido, $usuario, $telefono, $bio, $ci]);

    if ($quiereOrg && !$roles['organizador'])  $pdo->prepare("INSERT INTO organizador (usuario_ci_fk) VALUES (?)")->execute([$ci]);
    if (!$quiereOrg && $roles['organizador'])  $pdo->prepare("DELETE FROM organizador WHERE usuario_ci_fk = ?")->execute([$ci]);
    if ($quierePart && !$roles['participante']) $pdo->prepare("INSERT INTO participante (usuario_ci_fk, carne_deportista) VALUES (?, 0)")->execute([$ci]);
    if (!$quierePart && $roles['participante']) $pdo->prepare("DELETE FROM participante WHERE usuario_ci_fk = ?")->execute([$ci]);

    // rol_usuario (un solo valor en el esquema) refleja el rol principal actual
    if (!$roles['admin'] && !$roles['juez']) {
        $principal = $quiereOrg ? 'organizador' : ($quierePart ? 'participante' : 'observador');
        $pdo->prepare("UPDATE usuario SET rol_usuario = ? WHERE ci = ?")->execute([$principal, $ci]);
    }
    $pdo->commit();

    $_SESSION['usuario_nombre']   = $nombre;
    $_SESSION['usuario_apellido'] = $apellido;
    return ['success' => true, 'user' => loadMe($pdo, $ci)];
}

function updateEmail(PDO $pdo, string $ci, array $d): array {
    $email = mb_strtolower(trim((string)($d['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) fail('Ingresá un correo electrónico válido.');
    if (!verifyPassword($pdo, $ci, (string)($d['password'] ?? ''))) fail('La contraseña actual no es correcta.', 403);

    $dup = $pdo->prepare("SELECT 1 FROM usuario WHERE email = ? AND ci <> ?");
    $dup->execute([$email, $ci]);
    if ($dup->fetch()) fail('Ya existe una cuenta con ese correo.');

    $pdo->prepare("UPDATE usuario SET email = ? WHERE ci = ?")->execute([$email, $ci]);
    $_SESSION['usuario_email'] = $email;
    return ['success' => true, 'email' => $email];
}

function updatePassword(PDO $pdo, string $ci, array $d): array {
    $next = (string)($d['next'] ?? '');
    if (!verifyPassword($pdo, $ci, (string)($d['current'] ?? ''))) fail('La contraseña actual no es correcta.', 403);
    if (strlen($next) < 8 || !preg_match('/[A-Za-z]/', $next) || !preg_match('/\d/', $next)) fail(PASSWORD_RULE);

    $pdo->prepare("UPDATE usuario SET contrasenia = ? WHERE ci = ?")->execute([password_hash($next, PASSWORD_BCRYPT), $ci]);
    session_regenerate_id(true);
    return ['success' => true];
}

// =====================================================
// Foto de perfil
// =====================================================

function uploadAvatar(PDO $pdo, string $ci): array {
    $f = $_FILES['avatar'] ?? null;
    if (!is_array($f) || is_array($f['error'] ?? null)) fail('No se recibió ninguna imagen.');
    if (in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
        fail('La imagen supera el tamaño máximo que acepta el servidor (revisá upload_max_filesize en php.ini).');
    }
    if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) fail('No se pudo recibir la imagen.');
    if ($f['size'] > AVATAR_MAX_BYTES) fail('La imagen supera los 5 MB permitidos.');

    // El tipo se decide por el contenido real del archivo, nunca por su nombre
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    if (!in_array($mime, ['image/jpeg', 'image/png'], true)) fail('Solo se aceptan imágenes JPG o PNG.');
    $info = @getimagesize($f['tmp_name']);
    if (!$info || $info[0] < 1 || $info[1] < 1) fail('El archivo no es una imagen válida.');
    if ($info[0] * $info[1] > 40000000) fail('La imagen tiene demasiados píxeles.');
    if (!function_exists('imagecreatetruecolor')) {
        error_log('[competika] falta la extensión GD de PHP para procesar avatares');
        fail('El servidor no puede procesar imágenes (falta la extensión GD de PHP).', 500);
    }

    $png = $mime === 'image/png';
    $src = $png ? @imagecreatefrompng($f['tmp_name']) : @imagecreatefromjpeg($f['tmp_name']);
    if (!$src) fail('El archivo no es una imagen válida.');

    // Fotos de celular: aplicar la orientación EXIF antes de descartar los metadatos
    if (!$png && function_exists('exif_read_data')) {
        $exif = @exif_read_data($f['tmp_name']);
        $rot = [3 => 180, 6 => -90, 8 => 90][(int)($exif['Orientation'] ?? 1)] ?? 0;
        if ($rot !== 0 && ($r = imagerotate($src, $rot, 0))) { imagedestroy($src); $src = $r; }
    }

    // Se re-dibuja la imagen (recorte cuadrado centrado): el archivo guardado
    // no conserva metadatos (ubicación GPS, etc.) ni contenido ajeno a la imagen.
    $w = imagesx($src); $h = imagesy($src);
    $side = min($w, $h);
    $size = min(AVATAR_SIZE, $side);
    $dst = imagecreatetruecolor($size, $size);
    if ($png) {
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        imagefill($dst, 0, 0, imagecolorallocatealpha($dst, 0, 0, 0, 127));
    }
    imagecopyresampled($dst, $src, 0, 0, intdiv($w - $side, 2), intdiv($h - $side, 2), $size, $size, $side, $side);
    imagedestroy($src);

    $dir = avatarsDir();
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    if (!is_dir($dir) || !is_writable($dir)) {
        imagedestroy($dst);
        error_log("[competika] sin permiso de escritura en $dir");
        $prod = env('APP_ENV', 'development') === 'production';
        fail($prod ? 'No se pudo guardar la imagen en el servidor.'
                   : 'No se pudo guardar la imagen: la carpeta uploads/avatars no existe o Apache no puede escribir en ella.', 500);
    }

    $archivo = bin2hex(random_bytes(16)) . ($png ? '.png' : '.jpg');
    $ok = $png ? imagepng($dst, "$dir/$archivo", 6) : imagejpeg($dst, "$dir/$archivo", 85);
    imagedestroy($dst);
    if (!$ok) fail('No se pudo guardar la imagen en el servidor.', 500);

    $old = $pdo->prepare("SELECT foto_perfil FROM usuario WHERE ci = ?");
    $old->execute([$ci]);
    $anterior = $old->fetchColumn() ?: null;

    $pdo->prepare("UPDATE usuario SET foto_perfil = ? WHERE ci = ?")->execute([$archivo, $ci]);
    removeAvatarFile($anterior);
    return ['success' => true, 'foto' => fotoUrl($archivo)];
}

function deleteAvatar(PDO $pdo, string $ci): array {
    $s = $pdo->prepare("SELECT foto_perfil FROM usuario WHERE ci = ?");
    $s->execute([$ci]);
    $archivo = $s->fetchColumn() ?: null;
    $pdo->prepare("UPDATE usuario SET foto_perfil = NULL WHERE ci = ?")->execute([$ci]);
    removeAvatarFile($archivo);
    return ['success' => true, 'foto' => null];
}

// =====================================================
// Eliminar cuenta
// =====================================================

function deleteAccount(PDO $pdo, string $ci, array $d): array {
    if (strtoupper(trim((string)($d['confirm'] ?? ''))) !== 'ELIMINAR') fail('Escribí ELIMINAR para confirmar.');
    if (!verifyPassword($pdo, $ci, (string)($d['password'] ?? ''))) fail('La contraseña no es correcta.', 403);

    $roles = userRoles($pdo, $ci);
    if ($roles['admin']) fail('Las cuentas de administrador no se pueden eliminar desde acá.', 403);

    $c = $pdo->prepare("SELECT COUNT(*) FROM torneo t JOIN organizador o ON o.organizador_id = t.organizador_id_fk WHERE o.usuario_ci_fk = ?");
    $c->execute([$ci]);
    $n = (int)$c->fetchColumn();
    if ($n > 0) {
        fail("Organizás $n torneo(s). Eliminalos desde el Dashboard antes de borrar tu cuenta "
           . "(los torneos con resultados cargados no se pueden borrar: en ese caso pedile a un administrador que los transfiera).");
    }

    $foto = $pdo->prepare("SELECT foto_perfil FROM usuario WHERE ci = ?");
    $foto->execute([$ci]);
    $archivo = $foto->fetchColumn() ?: null;

    try {                                   // sus notificaciones (si la tabla existe)
        $pdo->prepare("DELETE FROM notificacion WHERE usuario_ci_fk = ?")->execute([$ci]);
    } catch (Throwable $e) { /* tabla ausente: nada que borrar */ }

    $pdo->beginTransaction();
    // Participaciones: los equipos y resultados de los torneos se conservan,
    // pero se desvinculan de la persona.
    $sub = "SELECT participante_id FROM participante WHERE usuario_ci_fk = ?";
    $pdo->prepare("UPDATE tabla_posiciones SET participante_id_fk = NULL WHERE participante_id_fk IN ($sub)")->execute([$ci]);
    $pdo->prepare("UPDATE resultado SET ganador_participante_fk = NULL WHERE ganador_participante_fk IN ($sub)")->execute([$ci]);
    $pdo->prepare("DELETE FROM enfrentamiento_participante WHERE participante_id_fk IN ($sub)")->execute([$ci]);
    $pdo->prepare("DELETE FROM equipo_participante WHERE participante_id_fk IN ($sub)")->execute([$ci]);
    $pdo->prepare("DELETE FROM enfrentamiento_juez WHERE juez_id_fk IN (SELECT juez_id FROM juez WHERE usuario_ci_fk = ?)")->execute([$ci]);
    foreach (['participante', 'juez', 'organizador', 'observador'] as $tabla) {
        $pdo->prepare("DELETE FROM $tabla WHERE usuario_ci_fk = ?")->execute([$ci]);
    }
    $pdo->prepare("DELETE FROM usuario WHERE ci = ?")->execute([$ci]);
    $pdo->commit();

    removeAvatarFile($archivo);
    $_SESSION = [];
    session_destroy();
    return ['success' => true];
}

// =====================================================
// Actividad (página Perfil)
// =====================================================

function activity(PDO $pdo, string $ci): array {
    $hoy = date('Y-m-d');

    // Torneos que organizo
    $s = $pdo->prepare("
        SELECT t.torneo_id, t.nombre, t.deporte, t.fecha_inicio, t.fecha_fin, t.direccion, t.departamento, t.estado,
               (SELECT COUNT(*) FROM tabla_posiciones tp WHERE tp.torneo_id_fk = t.torneo_id AND tp.equipo_id_fk IS NOT NULL) AS equipos,
               (SELECT premios FROM configuracion_torneo c WHERE c.torneo_id_fk = t.torneo_id ORDER BY configuracion_id LIMIT 1) AS premios
        FROM torneo t JOIN organizador o ON o.organizador_id = t.organizador_id_fk
        WHERE o.usuario_ci_fk = ? ORDER BY t.fecha_inicio IS NULL, t.fecha_inicio DESC, t.torneo_id DESC");
    $s->execute([$ci]);
    $torneos = [];
    foreach ($s->fetchAll() as $t) $torneos[] = torneoRow($t, 'organizador', null);

    // Torneos en los que participo (a través de mi equipo)
    $s = $pdo->prepare("
        SELECT t.torneo_id, t.nombre, t.deporte, t.fecha_inicio, t.fecha_fin, t.direccion, t.departamento, t.estado,
               (SELECT COUNT(*) FROM tabla_posiciones x WHERE x.torneo_id_fk = t.torneo_id AND x.equipo_id_fk IS NOT NULL) AS equipos,
               (SELECT premios FROM configuracion_torneo c WHERE c.torneo_id_fk = t.torneo_id ORDER BY configuracion_id LIMIT 1) AS premios,
               tp.equipo_id_fk, tp.puntos, tp.partidos_ganados,
               (SELECT COUNT(*) + 1 FROM tabla_posiciones y WHERE y.torneo_id_fk = t.torneo_id AND y.equipo_id_fk IS NOT NULL
                  AND (y.puntos > tp.puntos OR (y.puntos = tp.puntos AND y.partidos_ganados > tp.partidos_ganados))) AS puesto
        FROM participante p
        JOIN equipo_participante ep ON ep.participante_id_fk = p.participante_id
        JOIN tabla_posiciones tp ON tp.equipo_id_fk = ep.equipo_id_fk
        JOIN torneo t ON t.torneo_id = tp.torneo_id_fk
        WHERE p.usuario_ci_fk = ? ORDER BY t.fecha_inicio IS NULL, t.fecha_inicio DESC, t.torneo_id DESC");
    $s->execute([$ci]);
    $misEquipos = [];
    foreach ($s->fetchAll() as $t) {
        $misEquipos[(int)$t['equipo_id_fk']] = true;
        $torneos[] = torneoRow($t, 'participante', $t['estado'] === 'finalizado' ? (int)$t['puesto'] : null);
    }

    // Partidos de mis equipos
    $partidos = [];
    if ($misEquipos) {
        $ids = array_keys($misEquipos);
        $in = implode(',', array_fill(0, count($ids), '?'));
        $s = $pdo->prepare("
            SELECT e.enfrentamiento_id, e.fecha, e.ubicacion, t.torneo_id, t.nombre AS torneo, t.deporte, r.nombre AS fase,
                   ee.equipo_id_fk AS mio,
                   (SELECT equipo_id_fk FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = e.enfrentamiento_id ORDER BY es_local DESC, equipo_id_fk LIMIT 1) AS a,
                   (SELECT equipo_id_fk FROM enfrentamiento_equipo WHERE enfrentamiento_id_fk = e.enfrentamiento_id ORDER BY es_local DESC, equipo_id_fk LIMIT 1 OFFSET 1) AS b,
                   res.puntaje_a, res.puntaje_b, res.estado AS res_estado
            FROM enfrentamiento_equipo ee
            JOIN enfrentamiento e ON e.enfrentamiento_id = ee.enfrentamiento_id_fk
            JOIN torneo t ON t.torneo_id = e.torneo_id_fk
            JOIN ronda r ON r.ronda_id = e.ronda_id_fk
            LEFT JOIN resultado res ON res.resultado_id = (SELECT MAX(resultado_id) FROM resultado WHERE enfrentamiento_id_fk = e.enfrentamiento_id)
            WHERE ee.equipo_id_fk IN ($in)
            ORDER BY e.fecha IS NULL, e.fecha DESC");
        $s->execute($ids);
        $rows = $s->fetchAll();

        $nombres = [];
        $allTeams = array_values(array_unique(array_filter(array_merge(array_column($rows, 'a'), array_column($rows, 'b')))));
        if ($allTeams) {
            $in2 = implode(',', array_fill(0, count($allTeams), '?'));
            $n = $pdo->prepare("SELECT equipo_id, nombre FROM equipo WHERE equipo_id IN ($in2)");
            $n->execute(array_values($allTeams));
            foreach ($n->fetchAll() as $x) $nombres[(int)$x['equipo_id']] = $x['nombre'];
        }

        foreach ($rows as $r) {
            $mio = (int)$r['mio']; $a = (int)$r['a']; $b = $r['b'] === null ? null : (int)$r['b'];
            $rival = $b === null ? null : ($mio === $a ? $b : $a);
            $jugado = in_array($r['res_estado'], ['finalizado', 'empate'], true) && $rival !== null;
            $mine = $jugado ? (float)($mio === $a ? $r['puntaje_a'] : $r['puntaje_b']) : null;
            $suyo = $jugado ? (float)($mio === $a ? $r['puntaje_b'] : $r['puntaje_a']) : null;
            $partidos[] = [
                'id'        => (int)$r['enfrentamiento_id'],
                'fecha'     => $r['fecha'] ? substr($r['fecha'], 0, 10) : null,
                'hora'      => $r['fecha'] && substr($r['fecha'], 11, 5) !== '00:00' ? substr($r['fecha'], 11, 5) : null,
                'lugar'     => $r['ubicacion'],
                'torneoId'  => (int)$r['torneo_id'],
                'torneo'    => $r['torneo'],
                'deporte'   => $r['deporte'],
                'fase'      => $r['fase'],
                'rival'     => $rival !== null ? ($nombres[$rival] ?? 'Rival') : null,
                'jugado'    => $jugado,
                'resultado' => !$jugado ? null : ($mine > $suyo ? 'win' : ($mine < $suyo ? 'loss' : 'draw')),
                'marcador'  => $jugado ? fmtNum($mine) . '-' . fmtNum($suyo) : null,
            ];
        }
    }

    // Estadísticas
    $jugados = array_values(array_filter($partidos, fn($p) => $p['jugado']));
    $v = count(array_filter($jugados, fn($p) => $p['resultado'] === 'win'));
    $d = count(array_filter($jugados, fn($p) => $p['resultado'] === 'loss'));
    $e = count($jugados) - $v - $d;
    $racha = 0;
    foreach ($jugados as $p) { if ($p['resultado'] === 'win') $racha++; else break; }   // ya vienen del más reciente al más viejo
    $rivales = count(array_unique(array_map(fn($p) => $p['rival'], $jugados)));
    $titulos = count(array_filter($torneos, fn($t) => $t['rol'] === 'participante' && $t['puesto'] === 1));

    // Honores: partidos en los que ya di honor y cuántos recibieron mis equipos
    $honores = ['dados' => [], 'recibidos' => 0];
    try {
        $h = $pdo->prepare("SELECT enfrentamiento_id_fk FROM honor WHERE de_usuario_ci_fk = ?");
        $h->execute([$ci]);
        $honores['dados'] = array_map('intval', $h->fetchAll(PDO::FETCH_COLUMN));
        if ($misEquipos) {
            $ids = array_keys($misEquipos);
            $h = $pdo->prepare("SELECT COUNT(*) FROM honor WHERE a_equipo_id_fk IN (" . implode(',', array_fill(0, count($ids), '?')) . ")");
            $h->execute($ids);
            $honores['recibidos'] = (int)$h->fetchColumn();
        }
    } catch (Throwable $e) { /* tabla honor todavía no creada */ }

    return [
        'torneos'  => $torneos,
        'partidos' => $partidos,
        'honores'  => $honores,
        'stats'    => [
            'partidos'     => count($jugados),
            'victorias'    => $v,
            'derrotas'     => $d,
            'empates'      => $e,
            'porcentaje'   => count($jugados) ? (int)round($v * 100 / count($jugados)) : null,
            'racha'        => $racha,
            'titulos'      => $titulos,
            'rivales'      => $rivales,
            'organizados'  => count(array_filter($torneos, fn($t) => $t['rol'] === 'organizador')),
            'participados' => count(array_filter($torneos, fn($t) => $t['rol'] === 'participante')),
        ],
        'hoy' => $hoy,
    ];
}

function torneoRow(array $t, string $rol, ?int $puesto): array {
    return [
        'id'       => (int)$t['torneo_id'],
        'nombre'   => $t['nombre'],
        'deporte'  => $t['deporte'],
        'inicio'   => $t['fecha_inicio'],
        'fin'      => $t['fecha_fin'],
        'lugar'    => $t['direccion'] ?: $t['departamento'],
        'estado'   => $t['estado'],
        'equipos'  => (int)$t['equipos'],
        'premios'  => $t['premios'],
        'rol'      => $rol,
        'puesto'   => $puesto,
    ];
}

function fmtNum(float $n): string {
    return floor($n) == $n ? (string)(int)$n : rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.');
}

/** Dar honor al equipo rival de un partido que jugó uno de mis equipos (y que ya tiene resultado). */
function giveHonor(PDO $pdo, string $ci, array $d): array {
    $id = (int)($d['matchId'] ?? 0);
    $s = $pdo->prepare("
        SELECT ee.equipo_id_fk AS mio, e.torneo_id_fk,
               (SELECT x.equipo_id_fk FROM enfrentamiento_equipo x
                 WHERE x.enfrentamiento_id_fk = e.enfrentamiento_id AND x.equipo_id_fk <> ee.equipo_id_fk LIMIT 1) AS rival
        FROM participante p
        JOIN equipo_participante ep ON ep.participante_id_fk = p.participante_id
        JOIN enfrentamiento_equipo ee ON ee.equipo_id_fk = ep.equipo_id_fk
        JOIN enfrentamiento e ON e.enfrentamiento_id = ee.enfrentamiento_id_fk
        WHERE p.usuario_ci_fk = ? AND e.enfrentamiento_id = ?
          AND EXISTS (SELECT 1 FROM resultado r WHERE r.enfrentamiento_id_fk = e.enfrentamiento_id AND r.estado IN ('finalizado','empate'))
        LIMIT 1");
    $s->execute([$ci, $id]);
    $m = $s->fetch();
    if (!$m || $m['rival'] === null) fail('Solo podés dar honor en partidos que jugaste y ya tienen resultado.', 404);

    $ins = $pdo->prepare("INSERT IGNORE INTO honor (enfrentamiento_id_fk, de_usuario_ci_fk, a_equipo_id_fk) VALUES (?, ?, ?)");
    $ins->execute([$id, $ci, (int)$m['rival']]);
    if ($ins->rowCount() > 0) {
        $u = $pdo->prepare("SELECT CONCAT(nombre, ' ', apellido) FROM usuario WHERE ci = ?");
        $u->execute([$ci]);
        $quien = $u->fetchColumn() ?: 'Un rival';
        $equipo = nombreEquipo($pdo, (int)$m['mio']);
        foreach (usuariosDeEquipo($pdo, (int)$m['rival']) as $dest) {
            notificar($pdo, $dest, 'honor', "{$quien} ({$equipo}) le dio honor a tu equipo por el juego limpio.", (int)$m['torneo_id_fk'], $id);
        }
    }
    return ['success' => true];
}
