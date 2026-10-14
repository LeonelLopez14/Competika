<?php
require_once __DIR__ . '/base_repository.php';

/** Acceso a datos de torneos y su configuración. */
class TorneoRepository extends BaseRepository {

    /** Columnas comunes: torneo + formato + configuración (con moneda, árbitro y contacto) + cuenta del organizador. */
    private const SELECT = "
        SELECT t.*, tt.tipo_torneo_id, tt.nombre AS tt_nombre, tt.clave, tt.etiqueta, tt.categoria,
               c.configuracion_id, c.cant_equipos, c.precio_participacion, c.alquiler_lugar, c.precio_juez, c.premios,
               m.codigo AS moneda_codigo, m.nombre AS moneda_nombre, m.simbolo AS moneda_simbolo,
               pa.persona_id AS arb_id, pa.nombre AS arb_nombre, pa.telefono AS arb_telefono, pa.email AS arb_email,
               pc.persona_id AS con_id, pc.nombre AS con_nombre, pc.telefono AS con_telefono, pc.email AS con_email,
               u.nombre AS org_nombre, u.apellido AS org_apellido, u.telefono AS org_telefono, u.email AS org_email
        FROM torneo t
        LEFT JOIN tipo_torneo tt ON tt.tipo_torneo_id = t.tipo_torneo_id_fk
        LEFT JOIN configuracion_torneo c ON c.configuracion_id =
             (SELECT MIN(configuracion_id) FROM configuracion_torneo WHERE torneo_id_fk = t.torneo_id)
        LEFT JOIN moneda m   ON m.codigo = c.moneda_codigo_fk
        LEFT JOIN persona pa ON pa.persona_id = c.arbitro_persona_fk
        LEFT JOIN persona pc ON pc.persona_id = c.contacto_persona_fk
        LEFT JOIN organizador o ON o.organizador_id = t.organizador_id_fk
        LEFT JOIN usuario u ON u.ci = o.usuario_ci_fk";

    private static function aTorneo(array $f): Torneo {
        $t = Torneo::desdeFila($f);
        if ($f['tipo_torneo_id'] !== null) {
            $t->setTipo(new TipoTorneo((int)$f['tipo_torneo_id'], $f['tt_nombre'], $f['clave'], $f['etiqueta'], $f['categoria']));
        }
        return $t;
    }

    /**
     * Torneos para los listados, con cantidad de equipos/partidos y si el
     * usuario $ci es el dueño o está inscripto.
     * @return Torneo[]
     */
    public function listar(?string $ci, ?int $soloOrganizador = null): array {
        // Agrega al SELECT común las columnas de resumen
        $sql = str_replace("FROM torneo t", ",
               (SELECT COUNT(*) FROM tabla_posiciones tp WHERE tp.torneo_id_fk = t.torneo_id AND tp.equipo_id_fk IS NOT NULL) AS team_count,
               (SELECT COUNT(*) FROM enfrentamiento e WHERE e.torneo_id_fk = t.torneo_id) AS match_count,
               (o.usuario_ci_fk = ?) AS is_owner,
               EXISTS (SELECT 1 FROM tabla_posiciones tp2
                         JOIN equipo_participante ep ON ep.equipo_id_fk = tp2.equipo_id_fk
                         JOIN participante p ON p.participante_id = ep.participante_id_fk
                        WHERE tp2.torneo_id_fk = t.torneo_id AND p.usuario_ci_fk = ?) AS joined
        FROM torneo t", self::SELECT);
        $params = [$ci ?? '', $ci ?? ''];
        if ($soloOrganizador !== null) { $sql .= " WHERE t.organizador_id_fk = ?"; $params[] = $soloOrganizador; }
        $sql .= " ORDER BY t.torneo_id DESC";
        return array_map([self::class, 'aTorneo'], $this->filas($sql, $params));
    }

    public function buscar(int $id): ?Torneo {
        $f = $this->fila(self::SELECT . " WHERE t.torneo_id = ?", [$id]);
        return $f ? self::aTorneo($f) : null;
    }

    public function organizadorDe(int $torneoId): ?int {
        $v = $this->valor("SELECT organizador_id_fk FROM torneo WHERE torneo_id = ?", [$torneoId]);
        return $v === false ? null : (int)$v;
    }

    public function nombre(int $torneoId): string {
        return (string)($this->valor("SELECT nombre FROM torneo WHERE torneo_id = ?", [$torneoId]) ?: 'el torneo');
    }

    public function crear(Torneo $t): int {
        return $this->transaccion(function () use ($t) {
            $id = $this->insertar(
                "INSERT INTO torneo (nombre, descripcion, deporte, tipo_torneo_id_fk, fecha_inicio, fecha_fin, direccion, departamento, estado, organizador_id_fk)
                 VALUES (?,?,?,?,?,?,?,?,?,?)",
                [$t->getNombre(), $t->getDescripcion(), $t->getDeporte(), $t->getTipo()?->getId(), $t->getFechaInicio(),
                 $t->getFechaFin(), $t->getDireccion(), $t->getDepartamento(), $t->getEstado(), $t->getOrganizadorId()]);
            $t->setId($id);
            $this->guardarConfiguracion($t);
            return $id;
        });
    }

    public function actualizar(Torneo $t): void {
        $this->transaccion(function () use ($t) {
            $this->ejecutar(
                "UPDATE torneo SET nombre = ?, descripcion = ?, deporte = ?, tipo_torneo_id_fk = ?, fecha_inicio = ?, fecha_fin = ?,
                        direccion = ?, departamento = ?, estado = ? WHERE torneo_id = ?",
                [$t->getNombre(), $t->getDescripcion(), $t->getDeporte(), $t->getTipo()?->getId(), $t->getFechaInicio(),
                 $t->getFechaFin(), $t->getDireccion(), $t->getDepartamento(), $t->getEstado(), $t->getId()]);
            $this->guardarConfiguracion($t);
        });
    }

    /** Inserta o actualiza la configuración; árbitro y contacto se guardan como personas (FK). */
    private function guardarConfiguracion(Torneo $t): void {
        $c = $t->getConfiguracion();
        $personas = new PersonaRepository($this->db);
        $anterior = $this->fila("SELECT configuracion_id, arbitro_persona_fk, contacto_persona_fk FROM configuracion_torneo
                                 WHERE torneo_id_fk = ? ORDER BY configuracion_id LIMIT 1", [$t->getId()]);
        $arbitroId  = $c->getArbitro()  ? $personas->guardar($c->getArbitro())  : null;
        $contactoId = $c->getContacto() ? $personas->guardar($c->getContacto()) : null;
        $valores = [$c->getCupo(), $c->getCupo(), $c->getPrecioInscripcion(), $c->getAlquilerLugar(), $c->getPrecioJuez(),
                    $c->getPremios(), $c->getMoneda()?->getCodigo(), $arbitroId, $contactoId];
        if ($anterior === null) {
            $this->insertar("INSERT INTO configuracion_torneo (cant_equipos, cant_participante, precio_participacion, alquiler_lugar,
                                 precio_juez, premios, moneda_codigo_fk, arbitro_persona_fk, contacto_persona_fk, competitivo, torneo_id_fk)
                             VALUES (?,?,?,?,?,?,?,?,?,1,?)", [...$valores, $t->getId()]);
            return;
        }
        $this->ejecutar("UPDATE configuracion_torneo SET cant_equipos = ?, cant_participante = ?, precio_participacion = ?, alquiler_lugar = ?,
                             precio_juez = ?, premios = ?, moneda_codigo_fk = ?, arbitro_persona_fk = ?, contacto_persona_fk = ?
                         WHERE configuracion_id = ?", [...$valores, $anterior['configuracion_id']]);
        foreach (['arbitro_persona_fk', 'contacto_persona_fk'] as $col) {      // personas que quedaron sin uso
            if ($anterior[$col] !== null) $personas->borrarSiSinUso((int)$anterior[$col]);
        }
    }

    public function tieneResultados(int $torneoId): bool {
        return (int)$this->valor("SELECT COUNT(*) FROM resultado r JOIN enfrentamiento e ON e.enfrentamiento_id = r.enfrentamiento_id_fk
                                  WHERE e.torneo_id_fk = ?", [$torneoId]) > 0;
    }

    /** Borra el torneo con sus partidos, rondas, equipos y configuración (sin resultados: ver tieneResultados). */
    public function eliminar(int $torneoId): void {
        $this->transaccion(function () use ($torneoId) {
            $equipos = $this->columna("SELECT equipo_id_fk FROM tabla_posiciones WHERE torneo_id_fk = ? AND equipo_id_fk IS NOT NULL", [$torneoId]);
            $personas = $this->fila("SELECT arbitro_persona_fk, contacto_persona_fk FROM configuracion_torneo WHERE torneo_id_fk = ? LIMIT 1", [$torneoId]);
            $sub = "SELECT enfrentamiento_id FROM enfrentamiento WHERE torneo_id_fk = ?";
            foreach (['enfrentamiento_juez', 'enfrentamiento_equipo', 'enfrentamiento_participante'] as $tbl) {
                $this->ejecutar("DELETE FROM $tbl WHERE enfrentamiento_id_fk IN ($sub)", [$torneoId]);
            }
            foreach (['DELETE FROM enfrentamiento WHERE torneo_id_fk = ?', 'DELETE FROM ronda WHERE torneo_id_fk = ?',
                      'DELETE FROM tabla_posiciones WHERE torneo_id_fk = ?', 'DELETE FROM configuracion_torneo WHERE torneo_id_fk = ?',
                      'DELETE FROM torneo WHERE torneo_id = ?'] as $sql) {
                $this->ejecutar($sql, [$torneoId]);
            }
            $equiposRepo = new EquipoRepository($this->db);
            foreach ($equipos as $e) $equiposRepo->borrarSiHuerfano((int)$e);
            $p = new PersonaRepository($this->db);
            foreach ((array)$personas as $id) if ($id !== null) $p->borrarSiSinUso((int)$id);
        });
    }

    /** Cédulas de todas las personas inscriptas en el torneo. */
    public function usuariosInscriptos(int $torneoId): array {
        return $this->columna("SELECT DISTINCT p.usuario_ci_fk FROM tabla_posiciones tp
                               JOIN equipo_participante ep ON ep.equipo_id_fk = tp.equipo_id_fk
                               JOIN participante p ON p.participante_id = ep.participante_id_fk
                               WHERE tp.torneo_id_fk = ?", [$torneoId]);
    }

    /** Cédula de la cuenta que organiza el torneo. */
    public function ciOrganizador(int $torneoId): ?string {
        $v = $this->valor("SELECT o.usuario_ci_fk FROM torneo t JOIN organizador o ON o.organizador_id = t.organizador_id_fk
                           WHERE t.torneo_id = ?", [$torneoId]);
        return $v === false ? null : (string)$v;
    }

    public function cantidadDeTorneosDe(string $ci): int {
        return (int)$this->valor("SELECT COUNT(*) FROM torneo t JOIN organizador o ON o.organizador_id = t.organizador_id_fk
                                  WHERE o.usuario_ci_fk = ?", [$ci]);
    }
}
