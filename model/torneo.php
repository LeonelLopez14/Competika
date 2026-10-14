<?php
/** Torneo (tabla torneo) con su configuración, equipos y partidos. */
class Torneo {
    public const PENDIENTE = 'pendiente';     // inscripciones abiertas
    public const ACTIVO = 'activo';
    public const FINALIZADO = 'finalizado';

    /** estado en la base <-> estado que usa el frontend */
    private const ESTADO_FRONT = [self::PENDIENTE => 'pending', self::ACTIVO => 'active', self::FINALIZADO => 'finished'];

    private ConfiguracionTorneo $configuracion;
    /** @var Equipo[] */ private array $equipos = [];
    /** @var Partido[] */ private array $partidos = [];

    // Datos de resumen (listados)
    private int $cantidadEquipos = 0;
    private int $cantidadPartidos = 0;
    private bool $esDelUsuario = false;
    private bool $usuarioInscripto = false;
    private ?int $equipoDelUsuario = null;

    public function __construct(
        private ?int $id,
        private string $nombre,
        private int $organizadorId,
        private ?string $descripcion = null,
        private ?string $deporte = null,
        private ?TipoTorneo $tipo = null,
        private ?string $fechaInicio = null,
        private ?string $fechaFin = null,
        private ?string $direccion = null,
        private ?string $departamento = null,
        private string $estado = self::PENDIENTE,
        private ?Persona $contactoCuenta = null     // nombre, teléfono y correo de la cuenta del organizador
    ) {
        $this->configuracion = new ConfiguracionTorneo();
    }

    public static function desdeFila(array $f): self {
        $t = new self(
            (int)$f['torneo_id'], $f['nombre'], (int)$f['organizador_id_fk'], $f['descripcion'], $f['deporte'],
            null,                                    // el formato lo arma el repositorio (TipoTorneo)
            $f['fecha_inicio'], $f['fecha_fin'], $f['direccion'], $f['departamento'], $f['estado'] ?: self::PENDIENTE,
            isset($f['org_nombre']) ? new Persona(null, trim($f['org_nombre'] . ' ' . $f['org_apellido']), $f['org_telefono'], $f['org_email']) : null
        );
        $t->configuracion = ConfiguracionTorneo::desdeFila($f);
        $t->cantidadEquipos  = (int)($f['team_count'] ?? 0);
        $t->cantidadPartidos = (int)($f['match_count'] ?? 0);
        $t->esDelUsuario     = (bool)($f['is_owner'] ?? false);
        $t->usuarioInscripto = (bool)($f['joined'] ?? false);
        return $t;
    }

    // ── Getters ──────────────────────────────────────────────
    public function getId(): ?int { return $this->id; }
    public function setId(int $id): void { $this->id = $id; }
    public function getNombre(): string { return $this->nombre; }
    public function getOrganizadorId(): int { return $this->organizadorId; }
    public function setOrganizadorId(int $id): void { $this->organizadorId = $id; }
    public function getDescripcion(): ?string { return $this->descripcion; }
    public function getDeporte(): ?string { return $this->deporte; }
    public function getTipo(): ?TipoTorneo { return $this->tipo; }
    public function getFechaInicio(): ?string { return $this->fechaInicio; }
    public function getFechaFin(): ?string { return $this->fechaFin; }
    public function getDireccion(): ?string { return $this->direccion; }
    public function getDepartamento(): ?string { return $this->departamento; }
    public function getEstado(): string { return $this->estado; }
    public function getConfiguracion(): ConfiguracionTorneo { return $this->configuracion; }
    public function getContactoCuenta(): ?Persona { return $this->contactoCuenta; }
    public function aceptaInscripciones(): bool { return $this->estado === self::PENDIENTE; }

    /** Contacto que ven los participantes: el cargado para el torneo o, si no hay, el de la cuenta. */
    public function contactoVisible(): ?Persona {
        return $this->configuracion->getContacto() ?? $this->contactoCuenta;
    }

    // ── Setters con validación ───────────────────────────────
    public function setNombre($v): void {
        $this->nombre = Validar::obligatorio($v, 150, 'El nombre del torneo es obligatorio (máx. 150 caracteres).');
    }
    public function setDescripcion($v): void { $this->descripcion = Validar::texto($v, 2000); }
    public function setDeporte($v): void { $this->deporte = Validar::texto($v, 100); }
    public function setDireccion($v): void { $this->direccion = Validar::texto($v, 150); }
    public function setDepartamento($v): void { $this->departamento = Validar::texto($v, 100); }
    public function setTipo(?TipoTorneo $t): void { $this->tipo = $t; }

    public function setFechas(?string $inicio, ?string $fin): void {
        $inicio = Validar::fecha(Validar::texto($inicio, 10));
        $fin = Validar::fecha(Validar::texto($fin, 10));
        if ($inicio !== null && $fin !== null && $fin < $inicio) {
            throw new ApiException('La fecha de fin no puede ser anterior a la de inicio.');
        }
        $this->fechaInicio = $inicio;
        $this->fechaFin = $fin;
    }

    /** Recibe el estado del frontend (pending | active | finished). */
    public function setEstadoFront(string $estado): void {
        $db = array_search($estado, self::ESTADO_FRONT, true);
        if ($db === false) throw new ApiException('Estado inválido.');
        $this->estado = $db;
    }

    /** @param Equipo[] $equipos  @param Partido[] $partidos */
    public function setEquipos(array $equipos): void { $this->equipos = $equipos; }
    public function setPartidos(array $partidos): void { $this->partidos = $partidos; }
    public function setEsDelUsuario(bool $v): void { $this->esDelUsuario = $v; }
    public function setUsuarioInscripto(bool $v): void { $this->usuarioInscripto = $v; }
    public function setEquipoDelUsuario(?int $id): void { $this->equipoDelUsuario = $id; }

    public function estadoFront(): string { return self::ESTADO_FRONT[$this->estado] ?? 'pending'; }

    // ── Salida JSON (mismo formato que usa el frontend) ──────
    public function toResumen(): array {
        $c = $this->configuracion;
        return [
            'id'             => $this->id,
            'name'           => $this->nombre,
            'description'    => $this->descripcion,
            'sport'          => $this->deporte,
            'formatSubId'    => $this->tipo?->getClave(),
            'formatLabel'    => $this->tipo?->getEtiqueta(),
            'maxTeams'       => $c->getCupo(),
            'startDate'      => $this->fechaInicio,
            'venue'          => $this->direccion,
            'department'     => $this->departamento,
            'status'         => $this->estadoFront(),
            'organizer'      => $this->contactoVisible()?->getNombre(),
            'entryFee'       => Formato::numero($c->getPrecioInscripcion()) ?? 0,
            'currency'       => $c->getMoneda()?->getCodigo(),
            'currencySymbol' => $c->getMoneda()?->getSimbolo() ?? '$',
            'prizesText'     => $c->getPremios(),
            'teamCount'      => $this->cantidadEquipos,
            'matchCount'     => $this->cantidadPartidos,
            'isOwner'        => $this->esDelUsuario,
            'joined'         => $this->usuarioInscripto,
        ];
    }

    public function toDetalle(): array {
        $c = $this->configuracion;
        $contacto = $this->contactoVisible();
        return [
            'id'           => (string)$this->id,
            'name'         => $this->nombre,
            'description'  => $this->descripcion,
            'sport'        => $this->deporte,
            'formatTypeId' => $this->tipo?->getCategoria(),
            'formatSubId'  => $this->tipo?->getClave(),
            'formatLabel'  => $this->tipo?->getEtiqueta(),
            'maxTeams'     => $c->getCupo(),
            'startDate'    => $this->fechaInicio,
            'endDate'      => $this->fechaFin,
            'venue'        => $this->direccion,
            'department'   => $this->departamento,
            'status'       => $this->estadoFront(),
            'costs'        => $c->costosToArray(),
            'referee'      => $c->getArbitro()?->toArray() ?? ['name' => null, 'phone' => null, 'email' => null],
            'prizesText'   => $c->getPremios(),
            'organizer'    => $contacto?->toArray() ?? ['name' => null, 'phone' => null, 'email' => null],
            'customContact'=> $c->getContacto() !== null,
            'isOwner'      => $this->esDelUsuario,
            'joined'       => $this->usuarioInscripto,
            'myTeam'       => $this->equipoDelUsuario !== null ? (string)$this->equipoDelUsuario : null,
            'teams'        => array_map(fn(Equipo $e, int $i) => $e->toArray($i), $this->equipos, array_keys($this->equipos)),
            'matches'      => array_map(fn(Partido $p) => $p->toArray(), $this->partidos),
        ];
    }
}
