<?php
require_once __DIR__ . '/../core/autoload.php';

/** Cuenta logueada: datos, correo, contraseña, foto, actividad y honores. */
class PerfilController {
    private UsuarioRepository $usuarios;
    private TorneoRepository $torneos;
    private ActividadRepository $actividad;
    private HonorRepository $honores;
    private Notificador $avisos;

    public function __construct() {
        $this->usuarios  = new UsuarioRepository();
        $this->torneos   = new TorneoRepository();
        $this->actividad = new ActividadRepository();
        $this->honores   = new HonorRepository();
        $this->avisos    = new Notificador(null, null, $this->torneos);
    }

    private function cuenta(string $ci): Usuario {
        $u = $this->usuarios->buscar($ci);
        if ($u === null) throw new ApiException('La cuenta no existe.', 404);
        return $u;
    }

    private function datos(string $ci): array {
        return $this->cuenta($ci)->toArray($this->usuarios->roles($ci)) + ['carne' => $this->usuarios->tieneCarne($ci)];
    }

    public function me(): array {
        return ['success' => true, 'user' => $this->datos(Auth::exigirLogin())];
    }

    public function actualizar(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        $nombre = Validar::obligatorio($d['nombre'] ?? null, 100, 'Completá tu nombre y apellido (máx. 100 caracteres cada uno).');
        $apellido = Validar::obligatorio($d['apellido'] ?? null, 100, 'Completá tu nombre y apellido (máx. 100 caracteres cada uno).');

        $usuario = Validar::texto($d['nombreUsuario'] ?? null, 100);
        if ($usuario !== null) {
            $usuario = mb_strtolower($usuario);
            if (!preg_match('/^[a-z0-9._]{3,30}$/', $usuario)) {
                throw new ApiException('El nombre de usuario debe tener entre 3 y 30 caracteres: letras, números, punto o guion bajo.');
            }
            if ($this->usuarios->nombreUsuarioEnUso($usuario, $ci)) throw new ApiException('Ese nombre de usuario ya está en uso.');
        }
        $telefono = Validar::telefono($d['telefono'] ?? null);
        $bio = Validar::texto($d['biografia'] ?? null, 1000);
        if ($bio !== null && mb_strlen($bio) > 200) throw new ApiException('La biografía admite hasta 200 caracteres.');

        $roles = $this->usuarios->roles($ci);
        $pedidos = is_array($d['roles'] ?? null) ? $d['roles'] : [];
        $quiereOrg  = array_key_exists('organizador', $pedidos)  ? (bool)$pedidos['organizador']  : $roles['organizador'];
        $quierePart = array_key_exists('participante', $pedidos) ? (bool)$pedidos['participante'] : $roles['participante'];
        if ($roles['organizador'] && !$quiereOrg && $this->torneos->cantidadDeTorneosDe($ci) > 0) {
            throw new ApiException('No podés quitar el rol Organizador mientras organices torneos.');
        }
        if ($roles['participante'] && !$quierePart && $this->usuarios->inscripcionesActivas($ci) > 0) {
            throw new ApiException('No podés quitar el rol Participante mientras estés inscripto en torneos.');
        }

        $this->usuarios->transaccion(function () use ($ci, $d, $nombre, $apellido, $usuario, $telefono, $bio, $roles, $quiereOrg, $quierePart) {
            $this->usuarios->actualizarPerfil($ci, $nombre, $apellido, $usuario, $telefono, $bio);
            if ($quiereOrg && !$roles['organizador'])   $this->usuarios->crearOrganizador($ci);
            if (!$quiereOrg && $roles['organizador'])   $this->usuarios->quitarRol($ci, 'organizador');
            if ($quierePart && !$roles['participante']) $this->usuarios->crearParticipante($ci);
            if (!$quierePart && $roles['participante']) $this->usuarios->quitarRol($ci, 'participante');
            if ($quierePart && array_key_exists('carne', $d)) $this->usuarios->actualizarCarne($ci, !empty($d['carne']));
            // rol_usuario (un solo valor en el esquema) refleja el rol principal actual
            if (!$roles['admin'] && !$roles['juez']) {
                $this->usuarios->actualizarRolPrincipal($ci, $quiereOrg ? 'organizador' : ($quierePart ? 'participante' : 'observador'));
            }
        });
        $_SESSION['usuario_nombre'] = $nombre;
        $_SESSION['usuario_apellido'] = $apellido;
        return ['success' => true, 'user' => $this->datos($ci)];
    }

    public function email(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        $email = mb_strtolower(trim((string)($d['email'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) throw new ApiException('Ingresá un correo electrónico válido.');
        if (!$this->usuarios->verificarPassword($ci, (string)($d['password'] ?? ''))) throw ApiException::prohibido('La contraseña actual no es correcta.');
        if ($this->usuarios->emailEnUso($email, $ci)) throw new ApiException('Ya existe una cuenta con ese correo.');
        $this->usuarios->actualizarEmail($ci, $email);
        $_SESSION['usuario_email'] = $email;
        return ['success' => true, 'email' => $email];
    }

    public function password(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        if (!$this->usuarios->verificarPassword($ci, (string)($d['current'] ?? ''))) throw ApiException::prohibido('La contraseña actual no es correcta.');
        $nueva = (string)($d['next'] ?? '');
        Validar::password($nueva);
        $this->usuarios->actualizarPassword($ci, $nueva);
        (new TokenRepository())->borrarRecordadasDe($ci);     // los "Recordarme" de otros dispositivos dejan de valer
        session_regenerate_id(true);
        return ['success' => true];
    }

    public function subirAvatar(): array {
        $ci = Auth::exigirLogin();
        $archivo = Avatar::guardar($_FILES['avatar'] ?? null);
        $anterior = $this->usuarios->fotoPerfil($ci);
        $this->usuarios->actualizarFoto($ci, $archivo);
        Avatar::borrar($anterior);
        return ['success' => true, 'foto' => Formato::fotoUrl($archivo)];
    }

    public function borrarAvatar(): array {
        $ci = Auth::exigirLogin();
        $anterior = $this->usuarios->fotoPerfil($ci);
        $this->usuarios->actualizarFoto($ci, null);
        Avatar::borrar($anterior);
        return ['success' => true, 'foto' => null];
    }

    public function eliminarCuenta(Request $req): array {
        $ci = Auth::exigirLogin();
        $d = $req->json();
        if (strtoupper(trim((string)($d['confirm'] ?? ''))) !== 'ELIMINAR') throw new ApiException('Escribí ELIMINAR para confirmar.');
        if (!$this->usuarios->verificarPassword($ci, (string)($d['password'] ?? ''))) throw ApiException::prohibido('La contraseña no es correcta.');
        if ($this->usuarios->roles($ci)['admin']) throw ApiException::prohibido('Las cuentas de administrador no se pueden eliminar desde acá.');
        if ($this->usuarios->juezConAsignaciones($ci)) {
            throw new ApiException('Tenés partidos o torneos asignados como juez: pedile al organizador que los reasigne antes de borrar tu cuenta.');
        }
        $n = $this->torneos->cantidadDeTorneosDe($ci);
        if ($n > 0) {
            throw new ApiException("Organizás $n torneo(s). Eliminalos desde el Dashboard antes de borrar tu cuenta "
                . "(los torneos con resultados cargados no se pueden borrar: en ese caso pedile a un administrador que los transfiera).");
        }
        $foto = $this->usuarios->fotoPerfil($ci);
        $this->usuarios->eliminarCuenta($ci);
        Avatar::borrar($foto);
        $_SESSION = [];
        session_destroy();
        return ['success' => true];
    }

    // =====================================================
    // Actividad (página Perfil)
    // =====================================================

    public function actividad(): array {
        $ci = Auth::exigirLogin();
        $torneos = array_map(fn($t) => self::torneoFila($t, 'organizador', null), $this->actividad->torneosOrganizados($ci));
        $misEquipos = [];
        foreach ($this->actividad->torneosJugados($ci) as $t) {
            $misEquipos[(int)$t['equipo_id_fk']] = true;
            $torneos[] = self::torneoFila($t, 'participante', $t['estado'] === Torneo::FINALIZADO ? (int)$t['puesto'] : null);
        }

        $filas = $this->actividad->partidosDeEquipos(array_keys($misEquipos));
        $nombres = $this->actividad->nombresDeEquipos(array_values(array_unique(array_filter(
            array_merge(array_column($filas, 'a'), array_column($filas, 'b'))))));
        $partidos = array_map(fn($r) => self::partidoFila($r, $nombres), $filas);

        $jugados = array_values(array_filter($partidos, fn($p) => $p['jugado']));
        $v = count(array_filter($jugados, fn($p) => $p['resultado'] === 'win'));
        $d = count(array_filter($jugados, fn($p) => $p['resultado'] === 'loss'));
        $racha = 0;
        foreach ($jugados as $p) { if ($p['resultado'] === 'win') $racha++; else break; }   // del más reciente al más viejo

        return [
            'success'  => true,
            'torneos'  => $torneos,
            'seguidos' => array_map(fn($t) => self::torneoFila($t, 'seguido', null), $this->actividad->torneosSeguidos($ci)),
            'partidos' => $partidos,
            'honores'  => [
                'dados'     => $this->honores->partidosConHonorDe($ci),
                'recibidos' => $this->honores->recibidosPor(array_keys($misEquipos)),
            ],
            'stats' => [
                'partidos'     => count($jugados),
                'victorias'    => $v,
                'derrotas'     => $d,
                'empates'      => count($jugados) - $v - $d,
                'porcentaje'   => count($jugados) ? (int)round($v * 100 / count($jugados)) : null,
                'racha'        => $racha,
                'titulos'      => count(array_filter($torneos, fn($t) => $t['rol'] === 'participante' && $t['puesto'] === 1)),
                'rivales'      => count(array_unique(array_map(fn($p) => $p['rival'], $jugados))),
                'organizados'  => count(array_filter($torneos, fn($t) => $t['rol'] === 'organizador')),
                'participados' => count(array_filter($torneos, fn($t) => $t['rol'] === 'participante')),
            ],
            'hoy' => date('Y-m-d'),
        ];
    }

    private static function torneoFila(array $t, string $rol, ?int $puesto): array {
        return [
            'id' => (int)$t['torneo_id'], 'nombre' => $t['nombre'], 'deporte' => $t['deporte'],
            'inicio' => $t['fecha_inicio'], 'fin' => $t['fecha_fin'], 'lugar' => $t['direccion'] ?: $t['departamento'],
            'estado' => $t['estado'], 'equipos' => (int)$t['equipos'], 'premios' => $t['premios'], 'rol' => $rol, 'puesto' => $puesto,
        ];
    }

    private static function partidoFila(array $r, array $nombres): array {
        $mio = (int)$r['mio']; $a = (int)$r['a']; $b = $r['b'] === null ? null : (int)$r['b'];
        $rival = $b === null ? null : ($mio === $a ? $b : $a);
        $jugado = in_array($r['res_estado'], [Resultado::FINALIZADO, Resultado::EMPATE], true) && $rival !== null;
        $yo = $jugado ? (float)($mio === $a ? $r['puntaje_a'] : $r['puntaje_b']) : null;
        $el = $jugado ? (float)($mio === $a ? $r['puntaje_b'] : $r['puntaje_a']) : null;
        return [
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
            'resultado' => !$jugado ? null : ($yo > $el ? 'win' : ($yo < $el ? 'loss' : 'draw')),
            'marcador'  => $jugado ? Formato::marcador($yo) . '-' . Formato::marcador($el) : null,
        ];
    }

    /** Dar honor al equipo rival de un partido jugado por uno de mis equipos. */
    public function honor(Request $req): array {
        $ci = Auth::exigirLogin();
        $partidoId = (int)($req->json()['matchId'] ?? 0);
        $p = $this->honores->partidoJugadoPor($ci, $partidoId);
        if ($p === null) throw new ApiException('Solo podés dar honor en partidos que jugaste y ya tienen resultado.', 404);
        [$mio, $rival, $torneoId] = $p;
        if ($this->honores->dar($partidoId, $ci, $rival)) {
            $this->avisos->honor($this->usuarios->nombreCompleto($ci) ?: 'Un rival', $mio, $rival, $torneoId, $partidoId);
        }
        return ['success' => true];
    }
}
