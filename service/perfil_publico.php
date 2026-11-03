<?php
/** Arma el perfil público de un jugador: nombre, foto, biografía, números, títulos por deporte y datos para sus logros.
 *  Solo datos deportivos: nunca correo, teléfono, cédula ni dirección. Lo usan "Ver perfil" (solicitudes) y el perfil de cualquier jugador. */
class PerfilPublico {
    private UsuarioRepository $usuarios;
    private ActividadRepository $actividad;

    public function __construct(?UsuarioRepository $u = null, ?ActividadRepository $a = null) {
        $this->usuarios = $u ?? new UsuarioRepository();
        $this->actividad = $a ?? new ActividadRepository();
    }

    public function armar(string $ci): array {
        $perfil = $this->usuarios->datosParaCapitan($ci) ?? [];
        $torneos = $this->actividad->torneosJugados($ci);
        $equipos = array_map('intval', array_column($torneos, 'equipo_id_fk'));
        $ganados = $jugados = $racha = 0;
        $rachaViva = true;   // la racha cuenta victorias seguidas desde el partido más reciente
        foreach ($this->actividad->partidosDeEquipos($equipos) as $p) {
            if (!in_array($p['res_estado'], ['finalizado', 'empate'], true)) continue;
            $jugados++;
            $local = (int)$p['mio'] === (int)$p['a'];
            $gano = (int)($local ? $p['puntaje_a'] : $p['puntaje_b']) > (int)($local ? $p['puntaje_b'] : $p['puntaje_a']);
            if ($gano) $ganados++;
            if ($rachaViva && $gano) $racha++; else $rachaViva = false;
        }
        $ganados_t = array_values(array_filter($torneos, fn($t) => $t['estado'] === Torneo::FINALIZADO && (int)$t['puesto'] === 1));
        $titulos = count($ganados_t);
        $perfil['stats'] = [
            'tournaments' => count($torneos),
            'titles' => $titulos,
            'matches' => $jugados,
            'wins' => $ganados,
        ];
        // Títulos agrupados por deporte, de más a menos (ej.: Fútbol 4, Tenis 3)
        $porDeporte = [];
        foreach ($ganados_t as $t) { $d = $t['deporte'] ?: 'Sin deporte'; $porDeporte[$d] = ($porDeporte[$d] ?? 0) + 1; }
        arsort($porDeporte);
        $perfil['titlesBySport'] = array_map(fn($d, $n) => ['sport' => $d, 'count' => $n], array_keys($porDeporte), $porDeporte);
        // Misma forma que la actividad del perfil propio, para calcular los logros con el catálogo de logros.js
        $organizados = $this->actividad->torneosOrganizados($ci);
        $perfil['activity'] = [
            'torneos' => array_merge(
                array_map(fn($t) => ['rol' => 'organizador', 'deporte' => $t['deporte']], $organizados),
                array_map(fn($t) => ['rol' => 'participante', 'deporte' => $t['deporte']], $torneos)),
            'seguidos' => array_map(fn($t) => ['id' => (int)$t['torneo_id']], $this->actividad->torneosSeguidos($ci)),
            'stats' => [
                'partidos' => $jugados, 'victorias' => $ganados, 'racha' => $racha, 'titulos' => $titulos,
                'organizados' => count($organizados), 'participados' => count($torneos),
                'arbitrados' => $this->actividad->partidosArbitrados($ci),
                'torneosArbitrados' => $this->actividad->torneosArbitrados($ci),
                'deportesArbitrados' => $this->actividad->deportesArbitrados($ci),
                'finalesArbitradas' => $this->actividad->finalesArbitradas($ci),
            ],
        ];
        return $perfil;
    }
}
