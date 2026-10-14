<?php
require_once __DIR__ . '/base_repository.php';

/** Personas externas (árbitros y contactos). */
class PersonaRepository extends BaseRepository {
    /**
     * Devuelve el id de una persona con exactamente esos datos; si no existe la crea.
     * Así el mismo árbitro en varios torneos es una sola fila.
     */
    public function guardar(Persona $p): int {
        $id = $this->valor("SELECT persona_id FROM persona WHERE nombre = ? AND telefono <=> ? AND email <=> ? LIMIT 1",
            [$p->getNombre(), $p->getTelefono(), $p->getEmail()]);
        if ($id === false) {
            $id = $this->insertar("INSERT INTO persona (nombre, telefono, email) VALUES (?, ?, ?)",
                [$p->getNombre(), $p->getTelefono(), $p->getEmail()]);
        }
        $p->setId((int)$id);
        return (int)$id;
    }

    /** Borra la persona si ningún torneo la usa. */
    public function borrarSiSinUso(?int $id): void {
        if ($id === null) return;
        $usos = (int)$this->valor("SELECT COUNT(*) FROM configuracion_torneo WHERE arbitro_persona_fk = ? OR contacto_persona_fk = ?", [$id, $id]);
        if ($usos === 0) $this->ejecutar("DELETE FROM persona WHERE persona_id = ?", [$id]);
    }
}
