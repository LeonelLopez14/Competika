<?php
require_once __DIR__ . '/../core/autoload.php';

/** Panel de administración: cada acción queda en registro_de_actividad. */
class AdminController {
    private const ROLES = ['admin', 'organizador', 'participante', 'juez', 'observador'];
    private const DESTINOS = ['todos', 'organizador', 'participante', 'juez', 'observador'];

    private AdminRepository $admins;
    private JuezRepository $jueces;
    private UsuarioRepository $usuarios;
    private TorneoRepository $torneos;
    private ContactoRepository $contacto;
    private CatalogoRepository $catalogos;
    private Notificador $avisos;

    public function __construct() {
        $this->admins   = new AdminRepository();
        $this->jueces   = new JuezRepository();
        $this->usuarios = new UsuarioRepository();
        $this->torneos  = new TorneoRepository();
        $this->contacto = new ContactoRepository();
        $this->catalogos = new CatalogoRepository();
        $this->avisos   = new Notificador(null, null, $this->torneos);
    }

    private function adminActual(): int {
        $id = $this->admins->adminId(Auth::exigirLogin());
        if ($id === null) throw ApiException::prohibido('Esta sección es solo para administradores.');
        return $id;
    }

    public function resumen(): array {
        $this->adminActual();
        return ['success' => true, 'totals' => $this->admins->totales()];
    }

    public function actividad(): array {
        $this->adminActual();
        return ['success' => true, 'activity' => $this->admins->actividad()];
    }

    // ── Solicitudes de juez ─────────────────────────────────

    public function solicitudes(Request $req): array {
        $this->adminActual();
        $estado = $req->query('estado');
        if (!in_array($estado, [SolicitudJuez::PENDIENTE, SolicitudJuez::APROBADA, SolicitudJuez::RECHAZADA], true)) $estado = null;
        return ['success' => true, 'requests' => array_map(fn(SolicitudJuez $s) => $s->toArray(), $this->jueces->solicitudes($estado))];
    }

    private function solicitudPendiente(Request $req): SolicitudJuez {
        $s = $this->jueces->buscarSolicitud((int)($req->json()['id'] ?? 0));
        if ($s === null) throw ApiException::noEncontrado('Solicitud');
        if (!$s->estaPendiente()) throw new ApiException('Esa solicitud ya fue revisada.');
        return $s;
    }

    public function aprobar(Request $req): array {
        $admin = $this->adminActual();
        $s = $this->solicitudPendiente($req);
        $this->jueces->aprobar($s, $admin);
        $this->admins->registrar($admin, 'Aprobó solicitud de juez', "Solicitud #{$s->getId()} de {$this->usuarios->nombreCompleto($s->getUsuarioCi())}.");
        $this->avisos->enviar($s->getUsuarioCi(), 'juez', '¡Tu solicitud para ser juez fue aprobada! Ya pueden asignarte partidos.');
        return ['success' => true];
    }

    public function rechazar(Request $req): array {
        $admin = $this->adminActual();
        $s = $this->solicitudPendiente($req);
        $motivo = Validar::texto($req->json()['motivo'] ?? null, 255);
        if ($motivo === null || mb_strlen($motivo) < 5) throw new ApiException('Escribí el motivo del rechazo (la persona lo va a ver).');
        $this->jueces->rechazar($s, $admin, $motivo);
        $this->admins->registrar($admin, 'Rechazó solicitud de juez', "Solicitud #{$s->getId()} de {$this->usuarios->nombreCompleto($s->getUsuarioCi())}. Motivo: {$motivo}");
        $this->avisos->enviar($s->getUsuarioCi(), 'juez', "Tu solicitud para ser juez fue rechazada. Motivo: {$motivo}");
        return ['success' => true];
    }

    // ── Usuarios ────────────────────────────────────────────

    public function listarUsuarios(Request $req): array {
        $this->adminActual();
        return ['success' => true, 'users' => $this->admins->usuarios(Validar::texto($req->query('q'), 100))];
    }

    /** Cuenta indicada por correo (la cédula no viaja al navegador). */
    private function cuenta(array $d): array {
        $email = mb_strtolower(trim((string)($d['email'] ?? '')));
        $ci = $email !== '' ? $this->admins->ciPorEmail($email) : null;
        if ($ci === null) throw ApiException::noEncontrado('Usuario');
        return [$ci, $this->usuarios->nombreCompleto($ci)];
    }

    public function bloquear(Request $req): array {
        $admin = $this->adminActual();
        $d = $req->json();
        [$ci, $nombre] = $this->cuenta($d);
        if ($ci === Auth::ci()) throw new ApiException('No podés suspender tu propia cuenta.');
        $bloquear = !empty($d['block']);
        $motivo = Validar::texto($d['motivo'] ?? null, 255);
        if ($bloquear && $motivo === null) throw new ApiException('Escribí el motivo de la suspensión.');
        if ($bloquear && $this->usuarios->roles($ci)['admin']) throw new ApiException('Primero quitale el rol de administrador.');
        $this->admins->bloquear($ci, $bloquear, $motivo);
        if ($bloquear) (new TokenRepository())->borrarRecordadasDe($ci);
        $this->admins->registrar($admin, $bloquear ? 'Suspendió una cuenta' : 'Reactivó una cuenta', $nombre . ($motivo ? ". Motivo: $motivo" : '.'));
        return ['success' => true];
    }

    public function cambiarRol(Request $req): array {
        $admin = $this->adminActual();
        $d = $req->json();
        [$ci, $nombre] = $this->cuenta($d);
        $rol = (string)($d['role'] ?? '');
        if (!in_array($rol, self::ROLES, true)) throw new ApiException('Rol inválido.');
        $activar = !empty($d['active']);
        $roles = $this->usuarios->roles($ci);
        if ($roles[$rol] === $activar) return ['success' => true];

        if (!$activar) {
            if ($rol === 'admin' && $ci === Auth::ci()) throw new ApiException('No podés quitarte el rol de administrador a vos mismo.');
            if ($rol === 'admin' && $this->admins->cantidadAdmins() <= 1) throw new ApiException('Tiene que quedar al menos un administrador.');
            if ($rol === 'organizador' && $this->torneos->cantidadDeTorneosDe($ci) > 0) throw new ApiException('Organiza torneos: transferilos antes de quitarle el rol.');
            if ($rol === 'participante' && $this->usuarios->inscripcionesActivas($ci) > 0) throw new ApiException('Está inscripto en torneos: no se le puede quitar el rol.');
            if ($rol === 'juez' && $this->usuarios->juezConAsignaciones($ci)) throw new ApiException('Tiene partidos o torneos asignados como juez: reasignalos antes.');
        }
        $this->usuarios->transaccion(function () use ($ci, $rol, $activar) {
            if ($rol === 'admin') { $activar ? $this->admins->darAdmin($ci) : $this->admins->quitarAdmin($ci); return; }
            if ($activar) {
                match ($rol) {
                    'organizador'  => $this->usuarios->crearOrganizador($ci),
                    'participante' => $this->usuarios->crearParticipante($ci),
                    'observador'   => $this->usuarios->crearObservador($ci),
                    'juez'         => $this->jueces->darDeAlta($ci),
                };
            } else {
                $this->usuarios->quitarRol($ci, $rol);
            }
        });
        $this->admins->registrar($admin, ($activar ? 'Dio' : 'Quitó') . " el rol $rol", $nombre . '.');
        $this->avisos->enviar($ci, 'anuncio', ($activar ? 'Un administrador te dio el rol de ' : 'Un administrador te quitó el rol de ') . $rol . '.');
        return ['success' => true];
    }

    public function eliminarUsuario(Request $req): array {
        $admin = $this->adminActual();
        [$ci, $nombre] = $this->cuenta($req->json());
        if ($ci === Auth::ci()) throw new ApiException('Para borrar tu propia cuenta usá Configuración.');
        if ($this->usuarios->roles($ci)['admin']) throw new ApiException('Primero quitale el rol de administrador.');
        if ($this->torneos->cantidadDeTorneosDe($ci) > 0) throw new ApiException('Organiza torneos: transferilos o eliminalos antes.');
        if ($this->usuarios->juezConAsignaciones($ci)) throw new ApiException('Tiene partidos o torneos asignados como juez: reasignalos antes.');
        $foto = $this->usuarios->fotoPerfil($ci);
        $this->usuarios->eliminarCuenta($ci);
        Avatar::borrar($foto);
        $this->admins->registrar($admin, 'Eliminó una cuenta', $nombre . '.');
        return ['success' => true];
    }

    // ── Torneos ─────────────────────────────────────────────

    public function listarTorneos(Request $req): array {
        $this->adminActual();
        return ['success' => true, 'tournaments' => $this->admins->torneos(Validar::texto($req->query('q'), 100))];
    }

    private function torneo(array $d): Torneo {
        $t = $this->torneos->buscar((int)($d['id'] ?? 0));
        if ($t === null) throw ApiException::noEncontrado('Torneo');
        return $t;
    }

    public function estadoTorneo(Request $req): array {
        $admin = $this->adminActual();
        $d = $req->json();
        $t = $this->torneo($d);
        $antes = $t->getEstado();
        $t->setEstadoFront((string)($d['status'] ?? ''));
        $this->torneos->actualizar($t);
        $this->admins->registrar($admin, 'Cambió el estado de un torneo', "«{$t->getNombre()}»: {$antes} → {$t->getEstado()}.");
        if ($t->getEstado() !== $antes && $t->getEstado() !== Torneo::PENDIENTE) $this->avisos->cambioDeEstado($t);
        return ['success' => true];
    }

    public function eliminarTorneo(Request $req): array {
        $admin = $this->adminActual();
        $t = $this->torneo($req->json());
        if ($this->torneos->tieneResultados($t->getId())) {
            throw new ApiException('Tiene resultados registrados (son permanentes): marcalo como finalizado en lugar de eliminarlo.');
        }
        $inscriptos = $this->torneos->usuariosInscriptos($t->getId());
        $organizador = $this->torneos->ciOrganizador($t->getId());
        $this->torneos->eliminar($t->getId());
        $this->admins->registrar($admin, 'Eliminó un torneo', "«{$t->getNombre()}» (#{$t->getId()}).");
        $this->avisos->torneoCancelado($t->getNombre(), $inscriptos);
        if ($organizador) $this->avisos->enviar($organizador, 'torneo_cancelado', "Un administrador eliminó tu torneo «{$t->getNombre()}».");
        return ['success' => true];
    }

    public function transferirTorneo(Request $req): array {
        $admin = $this->adminActual();
        $d = $req->json();
        $t = $this->torneo($d);
        [$ci, $nombre] = $this->cuenta($d);
        if ($this->usuarios->estaBloqueado($ci)) throw new ApiException('Esa cuenta está suspendida.');
        $pid = $this->usuarios->participanteId($ci);
        if ($pid !== null && (new EquipoRepository())->participanteInscripto($t->getId(), $pid)) {
            throw new ApiException('Esa persona juega en el torneo: no puede organizarlo.');
        }
        $juez = $t->getConfiguracion()->getJuezPrincipalId();
        if ($juez !== null && $this->jueces->ciDeJuez($juez) === $ci) throw new ApiException('Esa persona es el juez principal del torneo.');
        $this->admins->transferirTorneo($t->getId(), $this->usuarios->asegurarOrganizador($ci));
        $this->admins->registrar($admin, 'Transfirió un torneo', "«{$t->getNombre()}» ahora lo organiza {$nombre}.");
        $this->avisos->enviar($ci, 'torneo_estado', "Ahora organizás el torneo «{$t->getNombre()}».", $t->getId());
        return ['success' => true];
    }

    // ── Catálogos ───────────────────────────────────────────

    public function catalogos(): array {
        $this->adminActual();
        return [
            'success'    => true,
            'formats'    => array_map(fn(TipoTorneo $x) => $x->toArray(), $this->catalogos->tiposTorneo()),
            'currencies' => array_map(fn(Moneda $m) => $m->toArray(), $this->catalogos->monedas()),
        ];
    }

    public function guardarMoneda(Request $req): array {
        $admin = $this->adminActual();
        $m = Moneda::desdeFormulario($req->json());
        $antes = $this->catalogos->monedaPorCodigo($m->getCodigo());
        if (!$m->estaActiva() && ($antes === null || $antes->estaActiva()) && $this->catalogos->monedasActivas() <= ($antes ? 1 : 0)) {
            throw new ApiException('Tiene que quedar al menos una moneda habilitada.');
        }
        $this->catalogos->guardarMoneda($m);
        $this->admins->registrar($admin, $antes ? 'Editó una moneda' : 'Agregó una moneda',
            "{$m->getCodigo()} — {$m->getNombre()} ({$m->getSimbolo()})" . ($m->estaActiva() ? '.' : ', deshabilitada.'));
        return ['success' => true];
    }

    public function guardarFormato(Request $req): array {
        $admin = $this->adminActual();
        $d = $req->json();
        $tipo = $this->catalogos->tipoPorClave((string)($d['id'] ?? ''));
        if ($tipo === null) throw ApiException::noEncontrado('Formato');
        $etiqueta = Validar::obligatorio($d['label'] ?? null, 100, 'Escribí el nombre del formato (máx. 100 caracteres).');
        $activo = !empty($d['active']);
        if (!$activo && $tipo->estaActivo() && $this->catalogos->tiposActivos() <= 1) {
            throw new ApiException('Tiene que quedar al menos un formato habilitado.');
        }
        $this->catalogos->actualizarTipo((string)$tipo->getClave(), $etiqueta, $activo);
        $this->admins->registrar($admin, 'Editó un formato', "«{$etiqueta}»" . ($activo ? '.' : ', deshabilitado.'));
        return ['success' => true];
    }

    // ── Mensajes de contacto y anuncios ─────────────────────

    public function mensajes(Request $req): array {
        $this->adminActual();
        return ['success' => true, 'messages' => $this->contacto->listar($req->query('unread') === '1')];
    }

    public function leerMensaje(Request $req): array {
        $this->adminActual();
        $d = $req->json();
        $this->contacto->marcarLeido((int)($d['id'] ?? 0), !array_key_exists('read', $d) || !empty($d['read']));
        return ['success' => true];
    }

    public function borrarMensaje(Request $req): array {
        $admin = $this->adminActual();
        $this->contacto->eliminar((int)($req->json()['id'] ?? 0));
        $this->admins->registrar($admin, 'Borró un mensaje de contacto', 'Mensaje #' . (int)($req->json()['id'] ?? 0) . '.');
        return ['success' => true];
    }

    /** Aviso en la campana para todas las cuentas o las de un rol. */
    public function anunciar(Request $req): array {
        $admin = $this->adminActual();
        $d = $req->json();
        $texto = Validar::obligatorio($d['message'] ?? null, 255, 'Escribí el anuncio (máx. 255 caracteres).');
        $para = (string)($d['to'] ?? 'todos');
        if (!in_array($para, self::DESTINOS, true)) throw new ApiException('Destinatarios inválidos.');
        $cis = $this->admins->cisConRol($para);
        foreach ($cis as $ci) $this->avisos->enviar($ci, 'anuncio', $texto);
        $this->admins->registrar($admin, 'Envió un anuncio', "Para: $para (" . count($cis) . " cuentas). «{$texto}»");
        return ['success' => true, 'sent' => count($cis)];
    }
}
