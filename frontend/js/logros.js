// Catálogo de logros compartido: lo usan el perfil propio (profile.js) y el perfil del solicitante (tournament-view.js).
// Recibe la actividad ({ stats, torneos, seguidos }) y devuelve todos los logros con su valor actual y su meta.
const GRUPOS_LOGROS = [
    ['juez', 'Juez', 'ti-gavel'],
    ['organizador', 'Organizador', 'ti-tournament'],
    ['jugador', 'Jugador', 'ti-run'],
    ['observador', 'Observador', 'ti-eye'],
];

// Todos los logros que existen. "val" es lo que lleva el usuario y "meta" lo que hace falta para desbloquearlo.
function catalogoLogros(data) {
    const s = data.stats;
    const deportes = new Set(data.torneos.map(t => t.deporte).filter(Boolean)).size;
    const seguidos = (data.seguidos || []).length;
    const deportesOrg = new Set(data.torneos.filter(t => t.rol === 'organizador').map(t => t.deporte).filter(Boolean)).size;
    const violeta = 'var(--blue-violet-dark)';
    const L = (grupo, icon, bg, color, title, sub, val, meta, extra = {}) => ({ grupo, icon, bg, color, title, sub, val: val ?? 0, meta, ...extra });
    return [
        // Organizador
        L('organizador', 'ti-tournament',     'rgba(95,31,197,0.1)',   violeta,   'Organizador',         'Primer torneo creado', s.organizados, 1),
        L('organizador', 'ti-medal',          'rgba(67,197,158,0.15)', '#1a9a72', 'Organizador Elite',   '5 torneos creados', s.organizados, 5),
        L('organizador', 'ti-award',          'rgba(59,130,246,0.12)', '#1d4ed8', 'Organizador Pro',     '10 torneos creados', s.organizados, 10),
        L('organizador', 'ti-stars',          'rgba(245,158,11,0.14)', '#b45309', 'Organizador Distinguido', 'Torneos de 3 deportes distintos', deportesOrg, 3),
        L('organizador', 'ti-building-stadium', 'rgba(245,158,11,0.22)', '#b45309', 'Organizador Supremo', '100 torneos creados', s.organizados, 100, { clase: 'supremo' }),
        // Jugador
        L('jugador', 'ti-door-enter',  'rgba(59,130,246,0.12)', '#1d4ed8', 'Debut',            'Primer torneo jugado', s.participados, 1),
        L('jugador', 'ti-flag',        'rgba(59,130,246,0.12)', '#1d4ed8', 'Competidor',       '5 torneos jugados', s.participados, 5),
        L('jugador', 'ti-star',        'rgba(245,158,11,0.14)', '#b45309', 'Primera victoria', 'Ganar un partido', s.victorias, 1),
        L('jugador', 'ti-flame',       'rgba(239,68,68,0.12)',  '#c2410c', 'En racha',         '3 victorias seguidas', s.racha, 3),
        L('jugador', 'ti-bolt',        'rgba(245,158,11,0.14)', '#b45309', 'Imparable',        '10 victorias', s.victorias, 10),
        L('jugador', 'ti-target',      'rgba(224,81,122,0.14)', '#b3315a', 'Veterano',         '50 partidos jugados', s.partidos, 50),
        L('jugador', 'ti-crown',       'rgba(245,158,11,0.14)', '#b45309', 'Campeón',          'Ganar un torneo', s.titulos, 1,
            { subActual: `${s.titulos} título${s.titulos === 1 ? '' : 's'}` }),
        L('jugador', 'ti-trophy',      'rgba(245,158,11,0.14)', '#b45309', 'Leyenda',          '3 títulos', s.titulos, 3),
        L('jugador', 'ti-ball-basketball', 'rgba(67,197,158,0.15)', '#1a9a72', 'Multideporte', '3 deportes distintos', deportes, 3,
            { subActual: `${deportes} deportes distintos` }),
        L('jugador', 'ti-diamond',     'rgba(245,158,11,0.22)', '#b45309', 'Jugador Supremo',  '100 torneos jugados', s.participados, 100, { clase: 'supremo' }),
        // Juez
        L('juez', 'ti-gavel',           'rgba(95,31,197,0.1)',   violeta,   'Árbitro',           'Primer partido arbitrado', s.arbitrados, 1),
        L('juez', 'ti-clipboard-check', 'rgba(67,197,158,0.15)', '#1a9a72', 'Juez de confianza', '50 partidos arbitrados', s.arbitrados, 50),
        L('juez', 'ti-scale',           'rgba(245,158,11,0.14)', '#b45309', 'Juez de élite',     '100 partidos arbitrados', s.arbitrados, 100),
        L('juez', 'ti-certificate',     'rgba(95,31,197,0.1)',   violeta,   'Juez Distinguido',  'Arbitrar en 3 deportes distintos', s.deportesArbitrados, 3),
        L('juez', 'ti-medal-2',         'rgba(239,68,68,0.12)',  '#c2410c', 'Juez de finales',   'Arbitrar 3 finales', s.finalesArbitradas, 3),
        L('juez', 'ti-crown',           'rgba(245,158,11,0.22)', '#b45309', 'Juez Supremo',      '100 torneos arbitrados', s.torneosArbitrados, 100, { clase: 'supremo' }),
        // Observador
        L('observador', 'ti-eye',   'rgba(95,31,197,0.1)',   violeta,   'Hincha',        'Seguir un torneo', seguidos, 1),
        L('observador', 'ti-heart', 'rgba(224,81,122,0.14)', '#b3315a', 'Seguidor fiel', 'Seguir 5 torneos', seguidos, 5),
        L('observador', 'ti-flame', 'rgba(239,68,68,0.12)',  '#c2410c', 'Fanático',      'Seguir 10 torneos', seguidos, 10),
    ];
}

const desbloqueado = a => a.val >= a.meta;
