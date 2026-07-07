/* =====================================================
   COMPETIKA — main.js
   ===================================================== */

// ── Hamburger / drawer ──────────────────────────────────────────────────────
const hamburger    = document.getElementById('hamburger');
const mobileMenu   = document.getElementById('mobile-menu');
const mobileClose  = document.getElementById('mobile-close');
const mobileBack   = document.getElementById('mobile-backdrop');

function openMenu() {
    mobileMenu.classList.add('open');
    mobileBack.classList.add('open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}

function closeMenu() {
    mobileMenu.classList.remove('open');
    mobileBack.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}

hamburger?.addEventListener('click', () => {
    mobileMenu.classList.contains('open') ? closeMenu() : openMenu();
});

mobileClose?.addEventListener('click', closeMenu);
mobileBack?.addEventListener('click', closeMenu);

// Cerrar con Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu?.classList.contains('open')) closeMenu();
});

// Cerrar al clickear un link del drawer
mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

// ── Typewriter paragraph ────────────────────────────────────────────────────
const paragraph = document.querySelector('.info-paragraph');

if (paragraph) {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                paragraph.classList.add('animate');
                obs.unobserve(paragraph);
            }
        });
    }, { threshold: 0.1 });
    obs.observe(paragraph);
}

// ── Título principal ──────────────────────────────
const competika = document.querySelector('.info-h1');

if (competika) {
    const obsH1 = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('show');
            else entry.target.classList.remove('show');
        });
    }, { threshold: 0.1 });
    obsH1.observe(competika);
}

// ── Info left: podio + líneas de descripción ────────────────────────────────
const infoLeft = document.getElementById('info-left');

if (infoLeft) {
    const obsLeft = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                document.querySelectorAll('.podium-block').forEach(b => b.classList.add('animated'));
                document.querySelectorAll('.info-desc-line').forEach(l => l.classList.add('show'));
                obsLeft.unobserve(entry.target);
            }
        });
    }, { threshold: 0.25 });
    obsLeft.observe(infoLeft);
}

// ── Sports carousel ─────────────────────────────────────────────────────────
const cardData = [
    { title: "Fútbol",           icon: "ti-ball-football",          paragraph: "Organizá ligas, grupos o eliminación directa para cualquier cantidad de equipos." },
    { title: "Basketball",       icon: "ti-ball-basketball",        paragraph: "Seguí estadísticas y brackets en tiempo real con marcadores por cuarto." },
    { title: "Tenis",            icon: "ti-ball-tennis",            paragraph: "Gestión de cuadros y resultados set por set, con empates y desempates." },
    { title: "Ajedrez",          icon: "ti-chess",                  paragraph: "Torneos suizos o round-robin con sistema de puntuación ELO integrado." },
    { title: "Juegos de cartas", icon: "ti-cards",                  paragraph: "Manejá mesas, rondas y desempates de forma automática para tus torneos." },
    { title: "Videojuegos",      icon: "ti-device-gamepad-2",       paragraph: "Brackets para cualquier título competitivo, con formatos BO3 o BO5." },
    { title: "Volleyball",       icon: "ti-ball-volleyball",        paragraph: "Fases de grupos y eliminación con marcadores por set y partido." },
    { title: "Natación",         icon: "ti-swimming",               paragraph: "Gestión de series, tiempos cronometrados y clasificaciones por categoría." },
    { title: "Rugby",            icon: "ti-ball-american-football",             paragraph: "Ligas con bonus y diferencia de puntos, formatos de copa incluidos." },
    { title: "Baseball",         icon: "ti-ball-baseball",          paragraph: "Innings, eliminatorias y tablas de posición actualizadas en tiempo real." },
    { title: "Running",          icon: "ti-run",                    paragraph: "Carreras cronometradas con clasificación por edad, género y categoría." },
    { title: "Artes marciales",  icon: "ti-karate",           paragraph: "Brackets por categoría de peso y modalidad de combate personalizados." },
    { title: "Boxeo",            icon: "ti-bell-school",                 paragraph: "Organizá veladas completas con combates, resultados y rankings." },
    { title: "Gimnasia",         icon: "ti-gymnastics",             paragraph: "Tablas de puntuación por ejercicio y sesión con múltiples jueces." },
    { title: "Otros",            icon: "ti-dots-circle-horizontal", paragraph: "¿Tu deporte no está en la lista? Igual podés crear y gestionar tu torneo." },
];

const TOTAL = cardData.length;
let current = 0;
let isAnimating = false;

const stage  = document.getElementById('stage');
const dotsEl = document.getElementById('dots');

if (stage && dotsEl) {

    const cards = cardData.map((d, i) => {
        const el = document.createElement('div');
        el.className = 'sport-card';
        el.innerHTML = `
            <i class="ti ${d.icon} card-icon" aria-hidden="true"></i>
            <h3 class="sport-h3">${d.title}</h3>
            <p class="sport-paragraph">${d.paragraph}</p>
        `;
        el.addEventListener('click', () => {
            const pos = getPos(i);
            if      (pos ===  1) navigate(1);
            else if (pos === -1) navigate(-1);
            else if (pos ===  2) { navigate(1); setTimeout(() => navigate(1), 520); }
            else if (pos === -2) { navigate(-1); setTimeout(() => navigate(-1), 520); }
        });
        stage.appendChild(el);
        return el;
    });

    const dots = cardData.map((_, i) => {
        const d = document.createElement('div');
        d.className = 'dot' + (i === 0 ? ' active' : '');
        d.addEventListener('click', () => { if (i !== current && !isAnimating) goTo(i); });
        dotsEl.appendChild(d);
        return d;
    });

    function getPos(cardIndex) {
        let diff = cardIndex - current;
        if (diff >  TOTAL / 2) diff -= TOTAL;
        if (diff < -TOTAL / 2) diff += TOTAL;
        return diff;
    }

    function posAttr(diff) {
        if (diff ===  0) return '0';
        if (diff ===  1) return '1';
        if (diff === -1) return '-1';
        if (diff ===  2) return '2';
        if (diff === -2) return '-2';
        return diff > 0 ? 'hidden-right' : 'hidden-left';
    }

    function render() {
        cards.forEach((el, i) => el.setAttribute('data-pos', posAttr(getPos(i))));
        dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    function navigate(dir) {
        if (isAnimating) return;
        isAnimating = true;
        current = (current + dir + TOTAL) % TOTAL;
        render();
        setTimeout(() => { isAnimating = false; }, 520);
    }

    function goTo(target) {
        if (isAnimating) return;
        let diff = target - current;
        if (diff >  TOTAL / 2) diff -= TOTAL;
        if (diff < -TOTAL / 2) diff += TOTAL;
        const step  = diff > 0 ? 1 : -1;
        let   steps = Math.abs(diff);
        function doStep() {
            if (steps === 0) return;
            navigate(step);
            steps--;
            if (steps > 0) setTimeout(doStep, 530);
        }
        doStep();
    }

    document.getElementById('prev')?.addEventListener('click', () => navigate(-1));
    document.getElementById('next')?.addEventListener('click', () => navigate(1));
    // Swipe con flechas del teclado
    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft')  navigate(-1);
        if (e.key === 'ArrowRight') navigate(1);
    });

    // Swipe táctil
    let touchStartX = 0;
    stage.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend',   e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 40) navigate(dx < 0 ? 1 : -1);
    }, { passive: true });

    render();
}

// ── Sports title: letra por letra ──────────────────────────────────────────
const sportsH1 = document.querySelector('.sports-h1');

if (sportsH1) {
    const texto = sportsH1.textContent;
    sportsH1.textContent = '';
    texto.split('').forEach((char, i) => {
        const span = document.createElement('span');
        span.className = 'letra';
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.animationDelay = `${i * 0.05}s`;
        sportsH1.appendChild(span);
    });

    const obsTitle = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                sportsH1.classList.add('animate');
                obsTitle.disconnect();
            }
        });
    }, { threshold: 0.5 });
    obsTitle.observe(sportsH1);
}

// ── Banner ──────────────────────────────────────────────────────────
const bannerContainer = document.querySelector('.banner-container');

if (bannerContainer) {
    bannerContainer.style.cssText += 'opacity:0;transform:translateY(36px);transition:opacity 0.8s ease,transform 0.8s ease;';

    const obsBanner = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                bannerContainer.style.opacity   = '1';
                bannerContainer.style.transform = 'translateY(0)';
                obsBanner.disconnect();
            }
        });
    }, { threshold: 0.15 });
    obsBanner.observe(bannerContainer);
}

// ── TOURNAMENT TYPES — datos y lógica ───────────────────────────────────────

const tournamentTypes = [
    {
        id: 'liga',
        title: 'Liga',
        description: 'Todos contra todos, por puntos acumulados a lo largo de varias fechas.',
        icon: 'ti-list-details',
        subtipos: [
            {
                id: 'liga-simple',
                diagram: 'roundrobin',
                title: 'LIGA TODOS VS TODOS',
                subtitle: 'Round Robin Simple',
                description: 'Cada participante enfrenta a todos los demás exactamente una vez. El campeón se determina por puntos acumulados al finalizar todas las fechas. Ideal para torneos donde se busca el rendimiento constante a lo largo del tiempo.',
                attributes: ['Todos juegan contra todos', 'Clasificación por puntos acumulados', 'Sin eliminación directa', 'Alta cantidad de partidos garantizados'],
                sports: ['ti-ball-football', 'ti-ball-basketball', 'ti-ball-volleyball', 'ti-swimming', 'ti-run'],
            },
            {
                id: 'liga-doble',
                diagram: 'roundrobin',
                title: 'LIGA DOBLE VUELTA',
                subtitle: 'Round Robin Doble',
                description: 'Cada participante enfrenta a todos los demás dos veces: una como local y otra como visitante. Formato muy usado en ligas profesionales para mayor equidad y emoción a lo largo de la temporada.',
                attributes: ['Dos rondas completas por equipo', 'Local y visitante por turno', 'Doble cantidad de partidos', 'Formato estándar de ligas profesionales'],
                sports: ['ti-ball-football', 'ti-ball-basketball', 'ti-ball-volleyball', 'ti-ball-american-football', 'ti-ball-baseball'],
            },
        ],
    },
    {
        id: 'eliminacion',
        title: 'Eliminación',
        description: 'Bracket directo: el que pierde queda afuera y el ganador avanza de ronda.',
        icon: 'ti-x',
        badge: 'Popular',
        subtipos: [
            {
                id: 'eliminacion-simple',
                diagram: 'bracket',
                title: 'ELIMINACIÓN SIMPLE',
                subtitle: 'Single Elimination',
                description: 'El perdedor queda fuera y el ganador avanza. Un único partido decide el destino de cada equipo. Formato veloz, tenso y muy popular en competiciones de todos los niveles.',
                attributes: ['Rondas sucesivas de eliminación', 'Perdedor queda eliminado', 'Ganador avanza a siguiente ronda', 'Máxima emoción por partido'],
                sports: ['ti-ball-volleyball', 'ti-ball-american-football', 'ti-ball-basketball', 'ti-ball-tennis', 'ti-chess'],
            },
            {
                id: 'eliminacion-doble',
                diagram: 'doublebracket',
                title: 'DOBLE ELIMINACIÓN',
                subtitle: 'Double Elimination',
                description: 'Cada participante puede perder una vez y seguir en competencia a través del bracket de perdedores. Solo la segunda derrota significa la eliminación definitiva.',
                attributes: ['Bracket ganadores y perdedores', 'Segunda oportunidad tras una derrota', 'Mayor cantidad de partidos', 'Popular en esports y ajedrez'],
                sports: ['ti-device-gamepad-2', 'ti-chess', 'ti-cards', 'ti-ball-tennis', 'ti-karate'],
            },
        ],
    },
    {
        id: 'puntos',
        title: 'Puntos y vidas',
        description: 'Los participantes acumulan puntos o vidas; no hay eliminación por un único resultado.',
        icon: 'ti-exposure-plus-1',
        subtipos: [
            {
                id: 'sistema-puntos',
                diagram: 'leaderboard',
                title: 'SISTEMA DE PUNTOS',
                subtitle: 'Points System',
                description: 'Los participantes acumulan puntos a lo largo de varias pruebas o fechas. La clasificación final refleja el desempeño global, no un único resultado. Muy usado en deportes individuales y competencias por etapas.',
                attributes: ['Acumulación de puntos por fecha', 'Ranking global actualizable', 'Sin eliminación por resultado único', 'Ideal para deportes individuales'],
                sports: ['ti-run', 'ti-swimming', 'ti-gymnastics', 'ti-ball-tennis', 'ti-bell-school'],
            },
            {
                id: 'vidas',
                diagram: 'leaderboard',
                title: 'VIDAS / CONTINUACIONES',
                subtitle: 'Lives System',
                description: 'Cada participante comienza con un número fijo de vidas o intentos. Al agotar sus vidas, queda eliminado. Muy popular en torneos de videojuegos y competencias arcade.',
                attributes: ['Número fijo de vidas por jugador', 'Eliminación al agotar vidas', 'Alta interacción entre participantes', 'Popular en esports y gaming'],
                sports: ['ti-device-gamepad-2', 'ti-cards', 'ti-chess', 'ti-ball-tennis', 'ti-karate'],
            },
        ],
    },
    {
        id: 'mixto',
        title: 'Sistema mixto',
        description: 'Combina cruces equilibrados por puntaje con fases de grupos y eliminación.',
        icon: 'ti-arrows-shuffle',
        subtipos: [
            {
                id: 'suizo',
                diagram: 'swiss',
                title: 'SISTEMA SUIZO',
                subtitle: 'Swiss System',
                description: 'Los participantes se enfrentan a rivales con puntaje similar en cada ronda, sin que nadie quede eliminado temprano. Equilibra el nivel de los cruces automáticamente a lo largo del torneo.',
                attributes: ['Cruces por puntaje similar', 'Nadie es eliminado prematuramente', 'Número fijo de rondas', 'Muy usado en ajedrez y TCG'],
                sports: ['ti-chess', 'ti-cards', 'ti-device-gamepad-2', 'ti-ball-tennis', 'ti-karate'],
            },
            {
                id: 'grupos',
                diagram: 'groups',
                title: 'GRUPOS + ELIMINACIÓN',
                subtitle: 'Group Stage + Knockout',
                description: 'Fase de grupos donde todos compiten entre sí, seguida de una eliminación directa entre los clasificados. El estándar de grandes torneos internacionales.',
                attributes: ['Fase de grupos inicial', 'Clasificados pasan a eliminatoria', 'Alta cantidad de partidos garantizados', 'Formato de Mundiales y Olimpiadas'],
                sports: ['ti-ball-football', 'ti-ball-basketball', 'ti-ball-volleyball', 'ti-ball-american-football', 'ti-swimming'],
            },
        ],
    },
    {
        id: 'especial',
        title: 'Formatos especiales',
        description: 'Estructuras alternativas: relámpago, por temporada o de defensa de título.',
        icon: 'ti-trophy',
        subtipos: [
            {
                id: 'blitz',
                diagram: 'blitz',
                title: 'TORNEO RELÁMPAGO',
                subtitle: 'Blitz / Flash Tournament',
                description: 'Todas las fases se juegan en un solo día o jornada. Ideal para eventos presenciales, torneos sociales o cuando el tiempo disponible es limitado.',
                attributes: ['Todo en una sola jornada', 'Rondas más cortas', 'Alta energía y ritmo rápido', 'Ideal para eventos sociales'],
                sports: ['ti-chess', 'ti-cards', 'ti-device-gamepad-2', 'ti-bell-school', 'ti-ball-tennis'],
            },
            {
                id: 'gran-premio',
                diagram: 'timeline',
                title: 'GRAN PREMIO',
                subtitle: 'Grand Prix / Season',
                description: 'Serie de torneos a lo largo de una temporada donde los puntos se acumulan. Al final, el participante con más puntos totales es coronado campeón.',
                attributes: ['Serie de torneos en temporada', 'Puntos acumulativos por evento', 'Clasificación anual o semestral', 'Formato de F1 y grandes ligas'],
                sports: ['ti-run', 'ti-swimming', 'ti-ball-tennis', 'ti-gymnastics', 'ti-ball-baseball'],
            },
            {
                id: 'copa-desafio',
                diagram: 'cup',
                title: 'COPA DESAFÍO',
                subtitle: 'Challenge Cup',
                description: 'El campeón defiende el título frente a retadores en sucesivos enfrentamientos. El primero en perder cede la corona. Formato clásico en boxeo, snooker y juegos de tablero.',
                attributes: ['Campeón defiende el título', 'Retadores en orden de ranking', 'El perdedor cede la posición', 'Popular en deportes de combate'],
                sports: ['ti-bell-school', 'ti-karate', 'ti-chess', 'ti-ball-tennis', 'ti-cards'],
            },
        ],
    },
];

// ── Estado ────────────────────────────────────────────────────────────────────
let ttCurrentType = 0;
let ttCurrentSub  = 0;

// ── Referencias DOM ───────────────────────────────────────────────────────────
const ttNavItems       = document.querySelectorAll('.navigation-list[data-type]');
const ttInfo           = document.getElementById('tt-info');
const ttTitle          = document.getElementById('tt-title');
const ttSubtitleEl     = document.getElementById('tt-subtitle');
const ttDescriptionEl  = document.getElementById('tt-description');
const ttAttrList       = document.getElementById('tt-attributes');
const ttSportsIcons    = document.getElementById('tt-sports-icons');
const ttImage          = document.getElementById('tt-image');
const ttSubPrev        = document.getElementById('tt-sub-prev');
const ttSubNext        = document.getElementById('tt-sub-next');
const ttSubIndicatorEl = document.getElementById('tt-sub-indicator');

// ── Actualiza el contenido ────────────────────────────

const sportNames = {
    'ti-ball-football':          'Fútbol',
    'ti-ball-basketball':        'Basketball',
    'ti-ball-volleyball':        'Volleyball',
    'ti-ball-tennis':            'Tenis',
    'ti-ball-american-football': 'Fútbol americano',
    'ti-ball-baseball':          'Baseball',
    'ti-chess':                  'Ajedrez',
    'ti-cards':                  'Cartas',
    'ti-device-gamepad-2':       'Videojuegos',
    'ti-swimming':               'Natación',
    'ti-run':                    'Running',
    'ti-karate':                 'Artes marciales',
    'ti-bell-school':            'Boxeo',
    'ti-gymnastics':             'Gimnasia',
};

function ttUpdateContent(sub) {
    if (ttTitle)        ttTitle.textContent       = sub.title;
    if (ttSubtitleEl)   ttSubtitleEl.textContent  = sub.subtitle;
    if (ttDescriptionEl) ttDescriptionEl.textContent = sub.description;
    if (ttAttrList) {
        ttAttrList.innerHTML = sub.attributes
            .map(a => `<li class="attribute-item"><i class="ti ti-chevron-right"></i>${a}</li>`)
            .join('');
    }
    if (ttSportsIcons) {
        ttSportsIcons.classList.remove('tt-sports-anim');
        void ttSportsIcons.offsetWidth;
        ttSportsIcons.innerHTML = sub.sports.slice(0, 5)
            .map(icon => {
                const nombre = sportNames[icon] || icon;
                return `<span class="sport-icon-wrap">
                    <i class="icon-sports-supported ti ${icon}"></i>
                    <span class="sport-tooltip">${nombre}</span>
                </span>`;
            })
            .join('');
        ttSportsIcons.classList.add('tt-sports-anim');
    }
}

// ── Render completo ───────────────────────────────────────
function ttRender(animate = true) {
    const tipo = tournamentTypes[ttCurrentType];
    const sub  = tipo.subtipos[ttCurrentSub];
    if (animate && ttInfo) {
        // Salida
        ttInfo.classList.remove('tt-text-in', 'ttInitIn');
        void ttInfo.offsetWidth;
        ttInfo.classList.add('tt-text-out');
        setTimeout(() => {
            ttUpdateContent(sub);
            ttInfo.classList.remove('tt-text-out');
            void ttInfo.offsetWidth;
            ttInfo.classList.add('tt-text-in');
        }, 230);
    } else {
        ttUpdateContent(sub);
    }
    // Flechas subtipos
    if (ttSubPrev && ttSubNext) {
        const show = tipo.subtipos.length > 1;
        ttSubPrev.classList.toggle('hidden', !show);
        ttSubNext.classList.toggle('hidden', !show);
    }
    // Puntos indicadores subtipos
    if (ttSubIndicatorEl) {
        ttSubIndicatorEl.innerHTML = '';
        tipo.subtipos.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = 'tt-sub-dot' + (i === ttCurrentSub ? ' active' : '');
            dot.addEventListener('click', () => { if (i !== ttCurrentSub) { ttCurrentSub = i; ttRender(); } });
            ttSubIndicatorEl.appendChild(dot);
        });
    }
    // Nav principal — active
    ttNavItems.forEach((item, idx) => item.classList.toggle('active', idx === ttCurrentType));
}
// ── Eventos nav principal ─────────────────────────────────────────────────────
ttNavItems.forEach((item) => {
    item.addEventListener('click', () => {
        const newType = parseInt(item.dataset.type, 10);
        if (newType === ttCurrentType) return;
        ttCurrentType = newType;
        ttCurrentSub  = 0;
        ttRender();
    });
});
// ── Flechas subtipos ──────────────────────────────────────────────────────────
if (ttSubPrev) {
    ttSubPrev.addEventListener('click', () => {
        const len = tournamentTypes[ttCurrentType].subtipos.length;
        ttCurrentSub = (ttCurrentSub - 1 + len) % len;
        if (ttImage) { ttImage.classList.add('tt-fade'); setTimeout(() => ttImage.classList.remove('tt-fade'), 350); }
        ttRender();
    });
}
if (ttSubNext) {
    ttSubNext.addEventListener('click', () => {
        const len = tournamentTypes[ttCurrentType].subtipos.length;
        ttCurrentSub = (ttCurrentSub + 1) % len;
        if (ttImage) { ttImage.classList.add('tt-fade'); setTimeout(() => ttImage.classList.remove('tt-fade'), 350); }
        ttRender();
    });
}
// ── Init ──────────────────────────────────────────────────────────────────────
if (ttTitle) {
    ttRender(false); // carga inicial sin animación de salida
}
const typesTitle = document.querySelector('.tournament-types-presentation');
if (typesTitle) {
    requestAnimationFrame(() => {
        setTimeout(() => typesTitle.classList.add('showTitle'), 80);
    });
}

const imgTypes = document.querySelector('.tournament-types-image');
if (imgTypes) {
    const obsImg = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                imgTypes.classList.add('showImg');
                obsImg.unobserve(imgTypes);
            }
        });
    }, { threshold: 0.15 });
    obsImg.observe(imgTypes);
}

const navTypes = document.querySelector('.tournament-types-navigation');
if (navTypes) {
    const obsNav = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navTypes.classList.add('showTypesNav');
                obsNav.unobserve(navTypes);
            }
        });
    }, { threshold: 0.15 });
    obsNav.observe(navTypes);
}

const subArrows = document.querySelectorAll('.tt-sub-arrow');
if (subArrows.length > 0) {
    const obsSubArrows = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                subArrows.forEach(arrow => arrow.classList.add('showSubArrows'));
                obsSubArrows.disconnect();
            } 
        });
    }, { threshold: 0.15 });
    subArrows.forEach(arrow => obsSubArrows.observe(arrow));
}

// =====================================================================
// TOURNAMENT FORM — wizard de creación de torneo (tournament_form.html)
// -----------------------------------------------------------------------
// Usa el array `tournamentTypes` (definido más arriba, compartido con
// tournament_details.html) como única fuente de verdad. Para agregar,
// quitar o renombrar un formato de torneo alcanza con editar ese array:
// este bloque genera las tarjetas del Paso 1, los chips de subtipo del
// Paso 2 y el diagrama de estructura automáticamente a partir de él.
// =====================================================================
 
const tfForm = document.getElementById('tf-form');
 
if (tfForm) {
 
    // ── Diagramas de estructura (uno por cada "diagram" de subtipo) ──────
    const tfDiagrams = {
        roundrobin: `
            <svg viewBox="0 0 240 140" class="h-full w-full">
                <g class="stroke-blue-violet/25" stroke-width="1.5">
                    <line x1="50" y1="28" x2="190" y2="28"></line>
                    <line x1="50" y1="28" x2="50" y2="112"></line>
                    <line x1="190" y1="28" x2="190" y2="112"></line>
                    <line x1="50" y1="112" x2="190" y2="112"></line>
                    <line x1="50" y1="28" x2="190" y2="112"></line>
                    <line x1="190" y1="28" x2="50" y2="112"></line>
                </g>
                <circle cx="50" cy="28" r="9" class="fill-blue-violet"></circle>
                <circle cx="190" cy="28" r="9" class="fill-blue-violet"></circle>
                <circle cx="50" cy="112" r="9" class="fill-blue-violet"></circle>
                <circle cx="190" cy="112" r="9" class="fill-sun-glare-dark"></circle>
            </svg>`,
        bracket: `
            <svg viewBox="0 0 240 140" class="h-full w-full">
                <g class="stroke-blue-violet/30" stroke-width="1.5">
                    <line x1="20" y1="18" x2="80" y2="18"></line>
                    <line x1="20" y1="52" x2="80" y2="52"></line>
                    <line x1="80" y1="18" x2="80" y2="52"></line>
                    <line x1="80" y1="35" x2="140" y2="35"></line>
                    <line x1="20" y1="88" x2="80" y2="88"></line>
                    <line x1="20" y1="122" x2="80" y2="122"></line>
                    <line x1="80" y1="88" x2="80" y2="122"></line>
                    <line x1="80" y1="105" x2="140" y2="105"></line>
                    <line x1="140" y1="35" x2="140" y2="105"></line>
                    <line x1="140" y1="70" x2="205" y2="70"></line>
                </g>
                <circle cx="14" cy="18" r="6" class="fill-blue-violet/70"></circle>
                <circle cx="14" cy="52" r="6" class="fill-blue-violet/70"></circle>
                <circle cx="14" cy="88" r="6" class="fill-blue-violet/70"></circle>
                <circle cx="14" cy="122" r="6" class="fill-blue-violet/70"></circle>
                <circle cx="211" cy="70" r="10" class="fill-sun-glare-dark"></circle>
            </svg>`,
        doublebracket: `
            <svg viewBox="0 0 240 140" class="h-full w-full">
                <g class="stroke-blue-violet/30" stroke-width="1.4">
                    <line x1="20" y1="14" x2="70" y2="14"></line>
                    <line x1="20" y1="40" x2="70" y2="40"></line>
                    <line x1="70" y1="14" x2="70" y2="40"></line>
                    <line x1="70" y1="27" x2="130" y2="27"></line>
                    <line x1="20" y1="100" x2="70" y2="100"></line>
                    <line x1="20" y1="126" x2="70" y2="126"></line>
                    <line x1="70" y1="100" x2="70" y2="126"></line>
                    <line x1="70" y1="113" x2="130" y2="113"></line>
                    <line x1="130" y1="27" x2="130" y2="113"></line>
                    <line x1="130" y1="70" x2="195" y2="70"></line>
                </g>
                <line x1="70" y1="40" x2="70" y2="100" class="stroke-blue-violet/35" stroke-width="1.4" stroke-dasharray="3 4"></line>
                <circle cx="14" cy="14" r="5.5" class="fill-blue-violet/70"></circle>
                <circle cx="14" cy="40" r="5.5" class="fill-blue-violet/70"></circle>
                <circle cx="14" cy="100" r="5.5" class="fill-blue-violet/40"></circle>
                <circle cx="14" cy="126" r="5.5" class="fill-blue-violet/40"></circle>
                <circle cx="201" cy="70" r="10" class="fill-sun-glare-dark"></circle>
            </svg>`,
        leaderboard: `
            <svg viewBox="0 0 240 140" class="h-full w-full">
                <circle cx="22" cy="24" r="11" class="fill-sun-glare-dark"></circle>
                <text x="22" y="28" text-anchor="middle" class="fill-darkest-hour font-mono text-[10px] font-bold">1</text>
                <rect x="42" y="16" width="172" height="16" rx="8" class="fill-sun-glare-dark"></rect>
                <circle cx="22" cy="62" r="11" class="fill-blue-violet"></circle>
                <text x="22" y="66" text-anchor="middle" class="fill-cloud-dancer font-mono text-[10px] font-bold">2</text>
                <rect x="42" y="54" width="130" height="16" rx="8" class="fill-blue-violet"></rect>
                <circle cx="22" cy="100" r="11" class="fill-blue-violet/35"></circle>
                <text x="22" y="104" text-anchor="middle" class="fill-darkest-hour font-mono text-[10px] font-bold">3</text>
                <rect x="42" y="92" width="95" height="16" rx="8" class="fill-blue-violet/35"></rect>
            </svg>`,
        swiss: `
            <svg viewBox="0 0 240 140" class="h-full w-full">
                <g class="fill-blue-violet/10 stroke-blue-violet/45" stroke-width="1.3">
                    <rect x="14" y="24" width="46" height="18" rx="9"></rect>
                    <rect x="14" y="96" width="46" height="18" rx="9"></rect>
                    <rect x="97" y="24" width="46" height="18" rx="9"></rect>
                    <rect x="97" y="96" width="46" height="18" rx="9"></rect>
                    <rect x="180" y="24" width="46" height="18" rx="9"></rect>
                    <rect x="180" y="96" width="46" height="18" rx="9"></rect>
                </g>
                <g class="stroke-sun-glare-dark" stroke-width="1.6" stroke-dasharray="3 4" fill="none">
                    <path d="M60 33 C 75 33, 82 60, 97 33"></path>
                    <path d="M60 105 C 75 105, 82 78, 97 105"></path>
                    <path d="M143 33 C 158 33, 165 60, 180 33"></path>
                    <path d="M143 105 C 158 105, 165 78, 180 105"></path>
                </g>
            </svg>`,
        groups: `
            <svg viewBox="0 0 240 140" class="h-full w-full">
                <g class="stroke-blue-violet/25" stroke-width="1.4">
                    <line x1="26" y1="18" x2="26" y2="54"></line>
                    <line x1="26" y1="18" x2="60" y2="36"></line>
                    <line x1="26" y1="54" x2="60" y2="36"></line>
                    <line x1="26" y1="86" x2="26" y2="122"></line>
                    <line x1="26" y1="86" x2="60" y2="104"></line>
                    <line x1="26" y1="122" x2="60" y2="104"></line>
                    <line x1="60" y1="36" x2="130" y2="36"></line>
                    <line x1="60" y1="104" x2="130" y2="104"></line>
                    <line x1="130" y1="36" x2="130" y2="104"></line>
                    <line x1="130" y1="70" x2="200" y2="70"></line>
                </g>
                <circle cx="26" cy="18" r="6" class="fill-blue-violet/55"></circle>
                <circle cx="26" cy="54" r="6" class="fill-blue-violet/55"></circle>
                <circle cx="60" cy="36" r="7" class="fill-blue-violet"></circle>
                <circle cx="26" cy="86" r="6" class="fill-blue-violet/55"></circle>
                <circle cx="26" cy="122" r="6" class="fill-blue-violet/55"></circle>
                <circle cx="60" cy="104" r="7" class="fill-blue-violet"></circle>
                <circle cx="206" cy="70" r="10" class="fill-sun-glare-dark"></circle>
            </svg>`,
        blitz: `
            <svg viewBox="0 0 240 140" class="h-full w-full">
                <rect x="16" y="10" width="208" height="120" rx="14" class="fill-blue-violet/[0.05] stroke-blue-violet/25" stroke-width="1.4"></rect>
                <g class="stroke-blue-violet" stroke-width="2" fill="none">
                    <circle cx="40" cy="34" r="11"></circle>
                    <path d="M40 27 V34 L46 38"></path>
                </g>
                <rect x="64" y="24" width="60" height="14" rx="7" class="fill-blue-violet/10 stroke-blue-violet/30" stroke-width="1.1"></rect>
                <rect x="140" y="24" width="60" height="14" rx="7" class="fill-blue-violet/10 stroke-blue-violet/30" stroke-width="1.1"></rect>
                <rect x="40" y="60" width="160" height="14" rx="7" class="fill-blue-violet/10 stroke-blue-violet/30" stroke-width="1.1"></rect>
                <rect x="40" y="94" width="160" height="14" rx="7" class="fill-sun-glare-dark/15 stroke-sun-glare-dark" stroke-width="1.1"></rect>
            </svg>`,
        timeline: `
            <svg viewBox="0 0 240 140" class="h-full w-full">
                <line x1="30" y1="68" x2="195" y2="68" class="stroke-blue-violet/25" stroke-width="2"></line>
                <circle cx="30" cy="68" r="8" class="fill-blue-violet"></circle>
                <circle cx="85" cy="68" r="8" class="fill-blue-violet"></circle>
                <circle cx="140" cy="68" r="8" class="fill-blue-violet"></circle>
                <circle cx="195" cy="68" r="12" class="fill-sun-glare-dark"></circle>
                <text x="30" y="98" text-anchor="middle" class="fill-darkest-hour/45 font-mono text-[9px] font-bold">E1</text>
                <text x="85" y="98" text-anchor="middle" class="fill-darkest-hour/45 font-mono text-[9px] font-bold">E2</text>
                <text x="140" y="98" text-anchor="middle" class="fill-darkest-hour/45 font-mono text-[9px] font-bold">E3</text>
                <text x="195" y="98" text-anchor="middle" class="fill-darkest-hour/70 font-mono text-[9px] font-bold">FINAL</text>
            </svg>`,
        cup: `
            <svg viewBox="0 0 240 140" class="h-full w-full">
                <circle cx="120" cy="34" r="16" class="fill-sun-glare-dark"></circle>
                <path d="M112 30 L120 20 L128 30 L124 40 L116 40 Z" class="fill-darkest-hour/55"></path>
                <g class="stroke-blue-violet/40" stroke-width="1.8">
                    <line x1="60" y1="118" x2="106" y2="52"></line>
                    <line x1="120" y1="122" x2="120" y2="58"></line>
                    <line x1="180" y1="118" x2="134" y2="52"></line>
                </g>
                <circle cx="60" cy="118" r="7" class="fill-blue-violet/55"></circle>
                <circle cx="120" cy="122" r="7" class="fill-blue-violet/55"></circle>
                <circle cx="180" cy="118" r="7" class="fill-blue-violet/55"></circle>
            </svg>`,
    };
 
    function tfDiagramFor(key) {
        return tfDiagrams[key] || tfDiagrams.bracket;
    }
 
    // ── Referencias DOM ───────────────────────────────────────────────────
    const tfTitleEl          = document.getElementById('tf-title');
    const tfSubtitleEl       = document.getElementById('tf-subtitle');
    const tfWizard           = document.getElementById('tf-wizard');
    const tfStep1Pill        = document.getElementById('tf-step1-pill');
    const tfStep2Pill        = document.getElementById('tf-step2-pill');
    const tfStep1            = document.getElementById('tf-step1');
    const tfStep2            = document.getElementById('tf-step2');
    const tfFormatGrid       = document.getElementById('tf-format-grid');
    const tfContinueBtn      = document.getElementById('tf-continue-btn');
    const tfBackBtn          = document.getElementById('tf-back-btn');
    const tfSubtypeGrid      = document.getElementById('tf-subtype-grid');
    const tfStructurePreview = document.getElementById('tf-structure-preview');
    const tfSubtypeDetail    = document.getElementById('tf-subtype-detail');
    const tfStartDate        = document.getElementById('tf-start-date');
    const tfSuccess          = document.getElementById('tf-success');
    const tfNameInput        = document.getElementById('tf-name');
 
    const tfCopy = {
        1: { title: 'Elige el formato',     subtitle: 'Selecciona el tipo de torneo que mejor se adapte a tu competencia.' },
        2: { title: 'Configura tu torneo',  subtitle: 'Elegí la variante exacta e ingresá los datos para comenzar.' },
    };
 
    let tfSelectedTypeId = null;
 
    // ── Paso 1: tarjetas de formato (data-driven desde tournamentTypes) ───
    function tfRenderFormatCards() {
        if (!tfFormatGrid) return;
        tfFormatGrid.innerHTML = tournamentTypes.map(type => `
            <label class="tf-card group relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-blue-violet/15 bg-cloud-dancer p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-violet/40 hover:shadow-[0_18px_40px_rgba(95,31,197,0.12)] has-[:checked]:border-sun-glare-dark has-[:checked]:bg-sun-glare/10 has-[:checked]:shadow-[0_18px_40px_rgba(67,197,158,0.18)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-violet-dark has-[:focus-visible]:ring-offset-2">
                <input type="radio" name="tf-format" id="tf-format-${type.id}" value="${type.id}" class="peer sr-only" required>
                ${type.badge ? `<span class="absolute right-5 top-5 rounded-full bg-blue-violet-dark px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-cloud-dancer">${type.badge}</span>` : ''}
                <span class="flex h-10 w-12 items-center justify-center rounded-xl bg-blue-violet/10 text-2xl text-blue-violet-dark transition-colors duration-300 peer-checked:bg-sun-glare-dark peer-checked:text-darkest-hour">
                    <i class="ti ${type.icon}"></i>
                </span>
                <h3 class="font-display text-lg font-bold tracking-wide text-darkest-hour">${type.title}</h3>
                <p class="text-sm leading-relaxed text-darkest-hour/60">${type.description}</p>
                <span class="pointer-events-none absolute -right-2 -top-2 flex h-7 w-7 scale-0 items-center justify-center rounded-full bg-sun-glare-dark text-darkest-hour opacity-0 transition-all duration-300 peer-checked:scale-100 peer-checked:opacity-100">
                    <i class="ti ti-check text-base"></i>
                </span>
            </label>
        `).join('');
 
        tfFormatGrid.querySelectorAll('input[name="tf-format"]').forEach(radio => {
            radio.addEventListener('change', () => {
                tfSelectedTypeId = radio.value;
                if (tfContinueBtn) tfContinueBtn.disabled = false;
            });
        });
    }
 
    // ── Paso 2: chips de subtipo + ficha + diagrama de estructura ─────────
    function tfRenderSubtypeChips(typeId) {
        if (!tfSubtypeGrid) return;
        const type = tournamentTypes.find(t => t.id === typeId);
        if (!type) return;
 
        tfSubtypeGrid.innerHTML = type.subtipos.map((sub, i) => `
            <label class="group relative flex cursor-pointer flex-col gap-1 rounded-xl border border-blue-violet/15 bg-cloud-dancer px-5 py-4 transition-all duration-300 hover:border-blue-violet/40 has-[:checked]:border-sun-glare-dark has-[:checked]:bg-sun-glare/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-violet-dark has-[:focus-visible]:ring-offset-2">
                <input type="radio" name="tf-subtype" id="tf-subtype-${sub.id}" value="${sub.id}" class="peer sr-only" ${i === 0 ? 'checked' : ''} required>
                <span class="font-display text-sm font-bold tracking-wide text-darkest-hour">${sub.title}</span>
                <span class="font-mono text-[11px] font-semibold uppercase tracking-widest text-blue-violet-dark/70">${sub.subtitle}</span>
            </label>
        `).join('');
 
        tfSubtypeGrid.querySelectorAll('input[name="tf-subtype"]').forEach(radio => {
            radio.addEventListener('change', () => tfUpdateSubtypeDetail(radio.value));
        });
 
        tfUpdateSubtypeDetail(type.subtipos[0].id);
    }
 
    function tfUpdateSubtypeDetail(subId) {
        const type = tournamentTypes.find(t => t.id === tfSelectedTypeId);
        if (!type) return;
        const sub = type.subtipos.find(s => s.id === subId);
        if (!sub) return;
 
        if (tfStructurePreview) {
            tfStructurePreview.innerHTML = tfDiagramFor(sub.diagram);
            tfStructurePreview.classList.remove('tf-diagram-pop');
            void tfStructurePreview.offsetWidth;
            tfStructurePreview.classList.add('tf-diagram-pop');
        }
        if (tfSubtypeDetail) {
            tfSubtypeDetail.innerHTML = `
                <p class="text-sm leading-relaxed text-darkest-hour/70">${sub.description}</p>
                <ul class="mt-3 flex flex-col gap-2">
                    ${sub.attributes.slice(0, 3).map(a => `<li class="flex items-start gap-2 text-xs font-semibold text-darkest-hour/55"><i class="ti ti-chevron-right mt-0.5 text-blue-violet-dark"></i>${a}</li>`).join('')}
                </ul>
            `;
        }
    }
 
    // ── Transición entre pasos ─────────────────────────────────────────────
    function tfShowStep(step) {
        const panels = { 1: tfStep1, 2: tfStep2 };
        Object.entries(panels).forEach(([num, el]) => {
            if (!el) return;
            if (Number(num) === step) {
                el.classList.remove('hidden', 'tf-step-anim');
                void el.offsetWidth;
                el.classList.add('tf-step-anim');
            } else {
                el.classList.add('hidden');
            }
        });
        if (tfTitleEl)    tfTitleEl.textContent    = tfCopy[step].title;
        if (tfSubtitleEl) tfSubtitleEl.textContent = tfCopy[step].subtitle;
        [[tfStep1Pill, 1], [tfStep2Pill, 2]].forEach(([pill, num]) => {
            if (!pill) return;
            pill.classList.toggle('tf-pill-active', num <= step);
        });
        tfWizard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
 
    tfContinueBtn?.addEventListener('click', () => {
        if (!tfSelectedTypeId) return;
        tfRenderSubtypeChips(tfSelectedTypeId);
        tfShowStep(2);
    });
 
    tfBackBtn?.addEventListener('click', () => tfShowStep(1));
 
    // ── Fecha mínima = hoy ──────────────────────────────────────────────────
    if (tfStartDate) {
        tfStartDate.min = new Date().toISOString().split('T')[0];
    }
 
    // ── Envío del formulario ───────────────────────────────────────────────
    tfForm.addEventListener('submit', (e) => {
        e.preventDefault();
 
        // Validación mínima: solo que haya nombre de torneo
        const name = document.getElementById('tf-name')?.value.trim();
        if (!name) {
            document.getElementById('tf-name')?.focus();
            return;
        }
 
        const subChecked = document.querySelector('input[name="tf-subtype"]:checked');
        const typeObj    = tournamentTypes.find(t => t.id === tfSelectedTypeId);
        const subObj     = typeObj?.subtipos.find(s => s.id === subChecked?.value);
 
        const val = id => document.getElementById(id)?.value.trim() || '';
 
        const tournament = {
            id:           Date.now().toString(),
            name,
            formatTypeId: tfSelectedTypeId  || '',
            formatSubId:  subChecked?.value || '',
            formatLabel:  subObj?.title || typeObj?.title || '',
            maxTeams:     parseInt(val('tf-max-participants')) || 0,
            startDate:    val('tf-start-date'),
            status:       'pending',
            costs: {
                entryFee:    parseFloat(val('tf-entry-fee'))    || 0,
                currency:    val('tf-currency'),
                fieldCost:   parseFloat(val('tf-field-cost'))   || 0,
                refereeCost: parseFloat(val('tf-referee-cost')) || 0,
            },
            referee: {
                name:  val('tf-referee-name'),
                phone: val('tf-referee-phone'),
                email: val('tf-referee-email'),
            },
            prizesText: val('tf-prizes'),
            prizes:     [],
            organizer: {
                name:  val('tf-organizer-name'),
                phone: val('tf-organizer-phone'),
                email: val('tf-organizer-email'),
            },
            teams:     [],
            matches:   [],
            createdAt: new Date().toISOString(),
        };
 
        // Guardar en localStorage
        try {
            const saved = JSON.parse(localStorage.getItem('competika_tournaments') || '[]');
            saved.push(tournament);
            localStorage.setItem('competika_tournaments', JSON.stringify(saved));
        } catch (err) {
            console.error('Error guardando torneo:', err);
        }
 
        // Actualizar el panel de éxito via JS (sin tocar el HTML)
        // — nombre del torneo en el texto
        const successNameEl = tfSuccess?.querySelector('[data-tf-success-name]');
        if (successNameEl) successNameEl.textContent = name;
 
        // — cambiar el link "Ver torneos" para que apunte al dashboard con el ID
        const dashLink = tfSuccess?.querySelector('a');
        if (dashLink) {
            dashLink.href = `tournament_dashboard.html?t=${tournament.id}`;
            dashLink.innerHTML = `<i class="ti ti-layout-dashboard"></i> Ir al Dashboard`;
        }
 
        // Ocultar wizard y mostrar panel de éxito
        if (tfWizard) tfWizard.classList.add('hidden');
        if (tfSuccess) {
            tfSuccess.classList.remove('hidden', 'tf-step-anim');
            void tfSuccess.offsetWidth;
            tfSuccess.classList.add('tf-step-anim');
            tfSuccess.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
 
    // ── Crear otro torneo (reset) ──────────────────────────────────────────
    document.getElementById('tf-reset-btn')?.addEventListener('click', () => {
        tfForm.reset();
        tfSelectedTypeId = null;
        if (tfContinueBtn) tfContinueBtn.disabled = true;
        if (tfSuccess) tfSuccess.classList.add('hidden');
        if (tfWizard)  tfWizard.classList.remove('hidden');
        tfRenderFormatCards();
        tfShowStep(1);
        tfWizard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
 
    // ── Init ─────────────────────────────────────────────────────────────
    tfRenderFormatCards();
    requestAnimationFrame(() => { tfWizard?.classList.add('tf-ready'); });
}

/* =====================================================
   TOURNAMENTS SEARCH 
===================================================== */

// Estado actual de los filtros
let selectedSport  = cardData[0].title;
let selectedStatus = "all";
let searchText     = "";

// Torneos de prueba
const tournaments = [
    {
        nombre: "Copa Apertura",
        deporte: "Fútbol",
        ciudad: "Montevideo",
        organizador: "Liga Uruguaya",
        estado: "open",
        nivel: "Pro",
        formato: "Liga",
        participantes: 10,
        maxParticipantes: 16,
        premio: "$80.000",
        inscripcion: "$1200"
    },
    {
        nombre: "Copa Apertura",
        deporte: "Fútbol",
        ciudad: "Montevideo",
        organizador: "Liga Uruguaya",
        estado: "open",
        nivel: "Pro",
        formato: "Liga",
        participantes: 5,
        maxParticipantes: 16,
        premio: "$80.000",
        inscripcion: "$1200"
    },
    {
        nombre: "Copa Apertura",
        deporte: "Fútbol",
        ciudad: "Montevideo",
        organizador: "Liga Uruguaya",
        estado: "open",
        nivel: "Pro",
        formato: "Liga",
        participantes: 1,
        maxParticipantes: 16,
        premio: "$80.000",
        inscripcion: "$1200"
    },
    {
        nombre: "Copa del Este",
        deporte: "Fútbol",
        ciudad: "Maldonado",
        organizador: "Campus FC",
        estado: "closing",
        nivel: "Semi-Pro",
        formato: "Eliminación",
        participantes: 14,
        maxParticipantes: 16,
        premio: "$50.000",
        inscripcion: "$1000"
    },
    {
        nombre: "Basket Cup",
        deporte: "Basketball",
        ciudad: "Montevideo",
        organizador: "FUBB",
        estado: "open",
        nivel: "Pro",
        formato: "Liga",
        participantes: 8,
        maxParticipantes: 12,
        premio: "$120.000",
        inscripcion: "$1500"
    },
    {
        nombre: "Volleyball Summer",
        deporte: "Volleyball",
        ciudad: "Canelones",
        organizador: "Liga Costa",
        estado: "closing",
        nivel: "Amateur",
        formato: "Grupos",
        participantes: 14,
        maxParticipantes: 16,
        premio: "$18.000",
        inscripcion: "$700"
    },
    {
        nombre: "Copa Playa Norte",
        deporte: "Volleyball",
        ciudad: "Rocha",
        organizador: "Club Atlántico",
        estado: "full",
        nivel: "Amateur",
        formato: "Eliminación",
        participantes: 16,
        maxParticipantes: 16,
        premio: "$12.000",
        inscripcion: "$500"
    }
];

/* --------------------------------------------------
   1. DIBUJAR LAS CARDS DE DEPORTES
-------------------------------------------------- */
function renderSports() {
    const grilla = document.getElementById("deportes-grilla");
    grilla.innerHTML = "";

    cardData.forEach(sport => {
        const cantidad = tournaments.filter(t => t.deporte === sport.title).length;

        const card = document.createElement("div");
        card.className = "deporte-card" + (sport.title === selectedSport ? " active" : "");

        card.style.setProperty("--ts-sport-color",  sport.color);
        card.style.setProperty("--ts-sport-bg",     sport.bg);
        card.style.setProperty("--ts-sport-shadow", sport.shadow);

        card.innerHTML = `
            <span class="deporte-badge">${cantidad}</span>
            <div class="deporte-icono-box">
                <i class="ti ${sport.icon}"></i>
            </div>
            <span class="deporte-etiqueta">${sport.title}</span>
        `;

        card.addEventListener("click", () => {
            selectedSport = sport.title;
            renderSports();
            filterAndRender();
            const elemento = document.getElementById("deporte-nombre");
            const offset = elemento.getBoundingClientRect().top + window.scrollY - 200;
            window.scrollTo({ top: offset, behavior: "smooth" });
        });

        grilla.appendChild(card);
    });
}

/* --------------------------------------------------
   2. DIBUJAR LAS CARDS DE TORNEOS
-------------------------------------------------- */
function renderTournaments(lista) {
    const grilla     = document.getElementById("torneos-grilla");
    const sinResult  = document.getElementById("sin-resultados");
    grilla.innerHTML = "";

    const sport = cardData.find(s => s.title === selectedSport);

    // Actualizar encabezado siempre, haya o no torneos
    document.getElementById("deporte-nombre").textContent  = sport.title;
    document.getElementById("deporte-cantidad").textContent = `${lista.length} torneo${lista.length !== 1 ? "s" : ""} disponible${lista.length !== 1 ? "s" : ""}`;
    document.getElementById("deporte-icono").className     = `ti ${sport.icon}`;
    document.getElementById("deporte-icono-wrap").style.background = sport.bg;
    document.getElementById("deporte-icono-wrap").style.color      = sport.color;

    if (lista.length === 0) {
        sinResult.classList.remove("hidden");
        return;
    }
    sinResult.classList.add("hidden");

    lista.forEach(t => {
        const pct    = Math.round((t.participantes / t.maxParticipantes) * 100);
        const isFull = t.estado === "full" || pct >= 100;

        const barColor = isFull ? "#6b7280" : pct >= 85 ? "#f59e0b" : sport.color;

        const estadoLabel = { open: "Abierto", closing: "Cierra pronto", full: "Completo" };
        const estadoClase = { open: "estado-abierto", closing: "estado-cierra", full: "estado-completo" };

        const nivelClase = {
            "Amateur":  "nivel-amateur",
            "Semi-Pro": "nivel-semipro",
            "Pro":      "nivel-pro"
        }[t.nivel] || "";

        const card = document.createElement("div");
        card.className = "torneo-card";

        card.innerHTML = `
            <div class="torneo-encabezado">
                <div class="torneo-nombre-fila">
                    <div class="torneo-deporte-icono">
                        <i class="ti ${sport.icon}"></i>
                    </div>
                    <span class="torneo-nombre">${t.nombre}</span>
                </div>
                <span class="estado-badge ${estadoClase[t.estado]}">
                    ${estadoLabel[t.estado]}
                </span>
            </div>

            <div class="torneo-pills">
                <span class="pill ${nivelClase}">${t.nivel}</span>
                <span class="pill formato-pill">${t.formato}</span>
            </div>

            <div class="torneo-info">
                <div class="torneo-info-fila">
                    <i class="ti ti-map-pin"></i> ${t.ciudad}
                </div>
                <div class="torneo-info-fila">
                    <i class="ti ti-user"></i> ${t.organizador}
                </div>
                <div class="torneo-info-fila torneo-premio">
                    <i class="ti ti-trophy"></i> ${t.premio} en premios
                </div>
            </div>

            <div class="torneo-participantes">
                <div class="participantes-fila">
                    <span class="participantes-label">Participantes</span>
                    <span class="participantes-numero">
                        ${t.participantes} / ${t.maxParticipantes}
                    </span>
                </div>
                <div class="barra-fondo">
                    <div class="barra-relleno" style="width:0%;" data-pct="${pct}"></div>
                </div>
            </div>

            <div class="torneo-pie">
                <div class="torneo-inscripcion">
                    <i class="ti ti-ticket"></i> Inscripción: ${t.inscripcion}
                </div>
                ${isFull
                    ? `<button class="btn-completo" disabled><i class="ti ti-lock"></i> Completo</button>
                    <button class="btn-seguir"><i class="ti ti-eye"></i> Seguir</button>`
                    : `<button class="btn-inscribirse"><i class="ti ti-door-enter"></i> Inscribirme</button>`
                }
            </div>
        `;

        grilla.appendChild(card);

        card.querySelectorAll(".barra-relleno").forEach(barra => {
            barra.offsetWidth;
            const pct = parseInt(barra.dataset.pct);
            barra.style.width = pct + "%";
            if (pct >= 85) barra.classList.add("llena");
            else if (pct >= 50) barra.classList.add("media");
        });
});


    // Actualizar encabezado
    document.getElementById("deporte-nombre").textContent  = sport.title;
    document.getElementById("deporte-cantidad").textContent = `${lista.length} torneo${lista.length !== 1 ? "s" : ""} disponible${lista.length !== 1 ? "s" : ""}`;
    document.getElementById("deporte-icono").className     = `ti ${sport.icon}`;
    document.getElementById("deporte-icono-wrap").style.background = sport.bg;
    document.getElementById("deporte-icono-wrap").style.color      = sport.color;
}

/* --------------------------------------------------
   3. FILTRAR Y LLAMAR A renderTournaments
-------------------------------------------------- */
function filterAndRender() {
    const query = searchText.toLowerCase();

    const filtrados = tournaments.filter(t => {
        if (t.deporte !== selectedSport) return false;
        if (selectedStatus !== "all" && t.estado !== selectedStatus) return false;
        if (query && !`${t.nombre} ${t.ciudad} ${t.organizador}`.toLowerCase().includes(query)) return false;
        return true;
    });

    renderTournaments(filtrados);
}

/* --------------------------------------------------
   4. EVENTOS
-------------------------------------------------- */
document.getElementById("buscador").addEventListener("input", e => {
    searchText = e.target.value;
    filterAndRender();
});

document.querySelectorAll(".btn-estado").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".btn-estado").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedStatus = btn.dataset.status;
        filterAndRender();
    });
});

/* --------------------------------------------------
   5. ARRANQUE
-------------------------------------------------- */
renderSports();
filterAndRender();

// ====================================================================
// TOURNAMENT DASHBOARD  (tournament_dashboard.html)
// Fuente de datos: localStorage bajo la clave 'competika_tournaments'.
// Para conectar al backend: reemplazar tdLS* por fetch() equivalentes.
// ====================================================================
const tdDashboard = document.getElementById('td-dashboard');
 
if (tdDashboard) {
 
// ── localStorage helpers ──────────────────────────────────────────────
const TD_KEY = 'competika_tournaments';
 
function tdLoadAll() {
    try { return JSON.parse(localStorage.getItem(TD_KEY) || '[]'); }
    catch { return []; }
}
function tdSaveAll(arr) {
    localStorage.setItem(TD_KEY, JSON.stringify(arr));
}
function tdSaveCurrent() {
    if (!tdData) return;
    const all = tdLoadAll();
    const idx = all.findIndex(x => x.id === tdData.id);
    if (idx >= 0) all[idx] = tdData; else all.push(tdData);
    tdSaveAll(all);
}
function tdDeleteTournament(id) {
    tdSaveAll(tdLoadAll().filter(t => t.id !== id));
}
 
// ── Torneo activo en memoria ──────────────────────────────────────────
let tdData = null;
let tdCurrentSection = 'overview';
let tdCurrentEditId  = null;
 
// ── Helpers ───────────────────────────────────────────────────────────
const tdTeam     = id => tdData?.teams?.find(t => t.id === id);
const tdTeamName = id => tdTeam(id)?.name ?? 'Por definir';
const tdEmoji    = id => tdTeam(id)?.emoji ?? '🏆';
 
function tdFormatDate(str) {
    if (!str) return '';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('es-UY', { weekday:'long', day:'numeric', month:'long' });
}
function tdShortDate(str) {
    if (!str) return '—';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('es-UY', { day:'numeric', month:'short', year:'numeric' });
}
function tdStatusLabel(s) {
    return { pending:'Sin iniciar', active:'En curso', finished:'Finalizado' }[s] ?? s;
}
function tdStatusColor(s) {
    return { pending:'rgba(245,158,11,0.9)', active:'var(--sun-glare-dark)', finished:'rgba(33,33,33,0.4)' }[s] ?? 'var(--sun-glare-dark)';
}
const tdPhaseColor = phase => ({
    'Fase de Grupos':'bg-blue-violet/10 text-blue-violet-dark',
    'Semifinal':     'bg-sun-glare/20 text-sun-glare-dark',
    'Gran Final':    'bg-blue-violet text-cloud-dancer',
})[phase] ?? 'bg-darkest-hour/10 text-darkest-hour/60';
 
function tdGroupByDate(matches) {
    return matches.reduce((acc, m) => {
        (acc[m.date] = acc[m.date] || []).push(m); return acc;
    }, {});
}
 
// ── Toast ─────────────────────────────────────────────────────────────
const tdToast = document.getElementById('td-toast');
let tdToastTimer;
function tdShowToast(msg, type = 'ok') {
    clearTimeout(tdToastTimer);
    if (!tdToast) return;
    tdToast.textContent = msg;
    tdToast.className = `td-toast td-toast--${type} td-toast--show`;
    tdToastTimer = setTimeout(() => tdToast.classList.remove('td-toast--show'), 3200);
}
 
// ── Sidebar ───────────────────────────────────────────────────────────
const tdSidebar  = document.getElementById('td-sidebar');
const tdSideBack = document.getElementById('td-sidebar-backdrop');
const tdToggle   = document.getElementById('td-sidebar-toggle');
const tdSideInfo = document.getElementById('td-sidebar-info');
const tdNavList  = document.getElementById('td-nav-list');
 
tdToggle?.addEventListener('click', () => {
    tdSidebar.classList.toggle('open');
    tdSideBack.classList.toggle('open');
});
tdSideBack?.addEventListener('click', () => {
    tdSidebar.classList.remove('open');
    tdSideBack.classList.remove('open');
});
 
function tdUpdateSidebar() {
    if (!tdData) {
        if (tdSideInfo) tdSideInfo.innerHTML = `<p class="td-tournament-name" style="opacity:.4">Ningún torneo activo</p>`;
        return;
    }
    if (tdSideInfo) tdSideInfo.innerHTML = `
        <p class="td-tournament-name">${tdData.name}</p>
        <span class="td-status-dot" style="background:${tdStatusColor(tdData.status)}"></span>
        <span class="td-status-text" style="color:${tdStatusColor(tdData.status)}">${tdStatusLabel(tdData.status)}</span>
    `;
}
 
// ── Nav ───────────────────────────────────────────────────────────────
const tdContent   = document.getElementById('td-section-content');
const tdPageTitle = document.getElementById('td-page-title');
const tdBreadcrumb= document.getElementById('td-breadcrumb');
 
const tdSectionMeta = {
    selector:      { label:'Mis Torneos',               breadcrumb:'Torneos' },
    overview:      { label:'Visión General del Torneo', breadcrumb:'Overview' },
    participantes: { label:'Equipos Participantes',     breadcrumb:'Participantes' },
    resultados:    { label:'Resultados de Partidos',    breadcrumb:'Resultados' },
    configuracion: { label:'Configuración del Torneo',  breadcrumb:'Configuración' },
    calendario:    { label:'Calendario de Partidos',    breadcrumb:'Calendario' },
};
 
function tdShowSection(id) {
    tdCurrentSection = id;
    tdCurrentEditId  = null;
    const meta = tdSectionMeta[id] || {};
    if (tdPageTitle)  tdPageTitle.textContent  = meta.label      || id;
    if (tdBreadcrumb) tdBreadcrumb.textContent = meta.breadcrumb || id;
 
    tdNavList?.querySelectorAll('.td-nav-item').forEach(li =>
        li.classList.toggle('active', li.dataset.section === id)
    );
 
    if (tdContent) {
        tdContent.innerHTML = '';
        tdContent.classList.remove('td-section-anim');
        void tdContent.offsetWidth;
        tdContent.classList.add('td-section-anim');
    }
 
    ({
        selector:      tdRenderSelector,
        overview:      tdRenderOverview,
        participantes: tdRenderParticipantes,
        resultados:    tdRenderResultados,
        configuracion: tdRenderConfig,
        calendario:    tdRenderCalendario,
    })[id]?.();
 
    tdSidebar.classList.remove('open');
    tdSideBack.classList.remove('open');
}
 
tdNavList?.querySelectorAll('.td-nav-item').forEach(li =>
    li.addEventListener('click', () => {
        if (li.dataset.section === 'selector') { tdData = null; tdUpdateSidebar(); }
        tdShowSection(li.dataset.section);
    })
);
 
['td-share-sidebar','td-share-top'].forEach(bid => {
    document.getElementById(bid)?.addEventListener('click', () => {
        if (navigator.clipboard) navigator.clipboard.writeText(location.href);
        tdShowToast('¡Link copiado al portapapeles!');
    });
});
 
// ═══════════════════════════════════════════════════════════════════════
// SELECTOR DE TORNEOS
// ═══════════════════════════════════════════════════════════════════════
function tdRenderSelector() {
    const all = tdLoadAll();
 
    if (!all.length) {
        tdContent.innerHTML = `
        <div class="td-empty-state">
            <span class="td-empty-icon"><i class="ti ti-tournament"></i></span>
            <h2 class="td-empty-title">Todavía no creaste ningún torneo</h2>
            <p class="td-empty-sub">Creá tu primer torneo y volvé acá para gestionarlo.</p>
            <a href="tournament_form.html" class="td-btn-primary">
                <i class="ti ti-plus"></i> Crear torneo
            </a>
        </div>`;
        return;
    }
 
    tdContent.innerHTML = `
    <div class="td-selector-header">
        <a href="tournament_form.html" class="td-btn-primary">
            <i class="ti ti-plus"></i> Nuevo torneo
        </a>
    </div>
    <div class="td-selector-grid" id="td-selector-grid">
        ${all.map(t => `
        <div class="td-selector-card" data-tid="${t.id}">
            <div class="td-sc-header">
                <div>
                    <p class="td-sc-sport">${t.sport || t.formatLabel || '—'}</p>
                    <h3 class="td-sc-name">${t.name}</h3>
                </div>
                <span class="td-sc-status" style="background:${tdStatusColor(t.status)}20;color:${tdStatusColor(t.status)}">${tdStatusLabel(t.status)}</span>
            </div>
            <div class="td-sc-meta">
                <span><i class="ti ti-calendar"></i>${tdShortDate(t.startDate)}</span>
                <span><i class="ti ti-list-details"></i>${t.formatLabel || '—'}</span>
                <span><i class="ti ti-users"></i>${t.teams?.length || 0} / ${t.maxTeams} equipos</span>
                ${t.venue ? `<span><i class="ti ti-map-pin"></i>${t.venue}</span>` : ''}
            </div>
            <div class="td-sc-footer">
                <button class="td-btn-primary td-sc-enter" data-tid="${t.id}">
                    <i class="ti ti-arrow-right"></i> Gestionar
                </button>
                <button class="td-sc-delete" data-tid="${t.id}" title="Eliminar torneo">
                    <i class="ti ti-trash"></i>
                </button>
            </div>
        </div>`).join('')}
    </div>`;
 
    // Entrar al torneo
    tdContent.querySelectorAll('.td-sc-enter').forEach(btn => {
        btn.addEventListener('click', () => tdSelectTournament(btn.dataset.tid));
    });
    // Eliminar torneo
    tdContent.querySelectorAll('.td-sc-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!confirm('¿Eliminar este torneo? Esta acción no se puede deshacer.')) return;
            tdDeleteTournament(btn.dataset.tid);
            tdRenderSelector();
            tdShowToast('Torneo eliminado', 'warn');
        });
    });
}
 
// ── Seleccionar un torneo y entrar al dashboard ───────────────────────
function tdSelectTournament(id) {
    const all = tdLoadAll();
    tdData = all.find(t => t.id === id) || null;
    if (!tdData) { tdShowToast('Torneo no encontrado', 'warn'); return; }
    tdUpdateSidebar();
    tdShowSection('overview');
    // Actualizar URL sin recargar
    history.replaceState(null, '', `?t=${id}`);
}
 
// ═══════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════
function tdRenderOverview() {
    if (!tdData) { tdShowSection('selector'); return; }
    const played  = tdData.matches.filter(m => m.played).length;
    const pending = tdData.matches.filter(m => !m.played).length;
    const groups  = [...new Set(tdData.teams.map(t => t.group).filter(Boolean))].sort();
    const next    = tdData.matches.find(m => !m.played);
    const accepted= tdData.teams.filter(t => t.status === 'accepted');
 
    tdContent.innerHTML = `
    <div class="td-overview-grid">
      <div class="td-stats-row">
        ${[
            { icon:'ti-users',    label:'Equipos',             val: accepted.length },
            { icon:'ti-sword',    label:'Partidos Jugados',    val: played  },
            { icon:'ti-clock',    label:'Partidos Pendientes', val: pending },
            { icon:'ti-grid-dots',label:'Grupos',              val: groups.length || '—' },
        ].map(s => `
          <div class="td-stat-card">
            <i class="ti ${s.icon} td-stat-icon"></i>
            <div><p class="td-stat-label">${s.label}</p><p class="td-stat-val">${s.val}</p></div>
          </div>`).join('')}
      </div>
 
      <div class="td-two-col">
        ${next ? `
        <div class="td-card">
          <p class="td-card-label">PRÓXIMO PARTIDO</p>
          <span class="td-phase-badge ${tdPhaseColor(next.phase)}">${next.phase}</span>
          <div class="td-match-vs-big">
            <div class="td-match-team"><span class="td-team-emoji">${tdEmoji(next.home)}</span><span>${tdTeamName(next.home)}</span></div>
            <span class="td-vs-sep">VS</span>
            <div class="td-match-team"><span class="td-team-emoji">${tdEmoji(next.away)}</span><span>${tdTeamName(next.away)}</span></div>
          </div>
          <p class="td-match-meta"><i class="ti ti-calendar"></i>${tdShortDate(next.date)} · ${next.time || ''} · <i class="ti ti-map-pin"></i>${next.venue || '—'}</p>
        </div>` : `
        <div class="td-card td-card--muted">
          <p class="td-stat-label">Sin partidos próximos</p>
          <p style="font-size:13px;margin-top:8px;color:rgba(33,33,33,0.4)">Agregá partidos desde la sección Calendario.</p>
        </div>`}
 
        <div class="td-card">
          <div class="td-card-header-row">
            <p class="td-card-label">FORMATO</p>
            <span class="td-phase-badge bg-blue-violet text-cloud-dancer">${tdData.formatLabel || '—'}</span>
          </div>
          ${groups.length ? `
          <div class="td-groups-mini-grid">
            ${groups.map(g => {
              const gTeams = accepted.filter(t => t.group === g);
              return `<div class="td-group-mini">
                <p class="td-group-mini-title">GRUPO ${g}</p>
                ${gTeams.length ? gTeams.map(t => `
                  <div class="td-group-mini-row">
                    <span>${t.emoji || '⚽'} ${t.name}</span>
                    <span class="td-group-mini-rec">${t.wins || 0}V ${t.losses || 0}D</span>
                  </div>`).join('') : '<p class="td-no-data">Sin equipos</p>'}
              </div>`;
            }).join('')}
          </div>` : `<p class="td-no-data" style="margin-top:12px">Aún no hay grupos definidos. Agregá equipos desde Participantes.</p>`}
        </div>
      </div>
 
      ${(tdData.prizes?.length || tdData.prizesText) ? `
      <div class="td-card">
        <p class="td-card-label"><i class="ti ti-medal"></i> Premios</p>
        ${tdData.prizesText ? `<p style="margin-top:10px;font-size:14px;line-height:1.7;white-space:pre-wrap;color:var(--darkest-hour)">${tdData.prizesText}</p>` : ''}
        ${tdData.prizes?.length ? `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px">
          ${tdData.prizes.map(p => `
          <div style="flex:1;min-width:140px;background:rgba(95,31,197,0.04);border-radius:10px;padding:12px 14px;border:1px solid rgba(95,31,197,0.1)">
            <p style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--blue-violet-dark);margin-bottom:6px">${['🥇','🥈','🥉'][p.place-1]||''} ${p.place}° LUGAR</p>
            <p style="font-weight:700;font-size:14px">${p.title}</p>
            <p style="font-size:12px;color:rgba(33,33,33,0.5);margin-top:2px">${p.detail}</p>
          </div>`).join('')}
        </div>` : ''}
      </div>` : ''}
 
      ${tdData.organizer?.name ? `
      <div class="td-card">
        <p class="td-card-label"><i class="ti ti-user-circle"></i> Contacto del organizador</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px">
          <span style="font-size:14px;font-weight:700">${tdData.organizer.name}</span>
          ${tdData.organizer.phone ? `<span class="td-match-meta"><i class="ti ti-phone"></i>${tdData.organizer.phone}</span>` : ''}
          ${tdData.organizer.email ? `<span class="td-match-meta"><i class="ti ti-mail"></i>${tdData.organizer.email}</span>` : ''}
        </div>
      </div>` : ''}
    </div>`;
}
 
// ═══════════════════════════════════════════════════════════════════════
// PARTICIPANTES
// ═══════════════════════════════════════════════════════════════════════
function tdRenderParticipantes() {
    if (!tdData) { tdShowSection('selector'); return; }
    const accepted = tdData.teams.filter(t => t.status === 'accepted');
    const pending  = tdData.teams.filter(t => t.status === 'pending');
    const rejected = tdData.teams.filter(t => t.status === 'rejected');
    const groups   = [...new Set(tdData.teams.map(t => t.group).filter(Boolean))].sort();
 
    const EMOJIS = ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏒','🥍'];
    const randomEmoji = () => EMOJIS[Math.floor(Math.random()*EMOJIS.length)];
 
    const teamRow = (t, showActions=false) => `
      <div class="td-team-row">
        <span class="td-team-row-emoji">${t.emoji || '⚽'}</span>
        <div class="td-team-row-info">
          <p class="td-team-row-name">${t.name}</p>
          <p class="td-team-row-sub">${t.players || 0} jugadores${t.group ? ' · Grupo '+t.group : ''}</p>
        </div>
        <span class="td-team-rec">${t.wins||0}V&nbsp;&nbsp;${t.losses||0}D</span>
        ${showActions ? `
          <button class="td-action-btn td-action-ok" title="Aceptar" onclick="tdApproveTeam('${t.id}',true)"><i class="ti ti-check"></i></button>
          <button class="td-action-btn td-action-no" title="Rechazar" onclick="tdApproveTeam('${t.id}',false)"><i class="ti ti-x"></i></button>` : ''}
        <button class="td-action-btn td-action-no" title="Eliminar" onclick="tdRemoveTeam('${t.id}')"><i class="ti ti-trash" style="font-size:12px"></i></button>
        <span class="td-dot td-dot--${t.status}"></span>
      </div>`;
 
    tdContent.innerHTML = `
    <div class="td-part-layout">
      <div class="td-part-list">
        ${!tdData.teams.length ? `<div class="td-empty-state td-empty-state--sm"><span class="td-empty-icon" style="font-size:2rem"><i class="ti ti-users"></i></span><p class="td-empty-sub">Todavía no hay equipos. Usá el panel de la derecha para agregar.</p></div>` : ''}
        ${accepted.length ? `<p class="td-list-section-title"><i class="ti ti-check"></i> ACEPTADOS (${accepted.length})</p>${accepted.map(t=>teamRow(t)).join('')}` : ''}
        ${pending.length  ? `<p class="td-list-section-title td-list-section-title--warn"><i class="ti ti-clock"></i> PENDIENTES (${pending.length})</p>${pending.map(t=>teamRow(t,true)).join('')}` : ''}
        ${rejected.length ? `<p class="td-list-section-title td-list-section-title--err"><i class="ti ti-x"></i> RECHAZADOS (${rejected.length})</p>${rejected.map(t=>teamRow(t)).join('')}` : ''}
      </div>
 
      <div class="td-card td-part-add">
        <p class="td-card-label"><i class="ti ti-plus"></i> Agregar Equipo</p>
        <div class="input-group mt-4">
          <input type="text" id="td-add-name" class="input-field" placeholder=" ">
          <label for="td-add-name" class="floating-label">Nombre del equipo</label>
        </div>
        <div class="input-group">
          <input type="number" id="td-add-players" class="input-field" placeholder=" " min="1">
          <label for="td-add-players" class="floating-label">N° de jugadores</label>
        </div>
        <div class="input-group">
          <input type="text" id="td-add-group" class="input-field" placeholder=" " list="td-groups-datalist" value="${groups[0]||''}">
          <label for="td-add-group" class="floating-label">Grupo</label>
          <datalist id="td-groups-datalist">${groups.map(g=>`<option value="${g}">`).join('')}</datalist>
        </div>
        <button class="td-btn-primary" style="width:100%" onclick="tdAddTeam()">
          <i class="ti ti-plus"></i> Agregar Equipo
        </button>
        <div class="td-resumen">
          <p class="td-card-label" style="margin-top:16px">RESUMEN</p>
          <div class="td-resumen-row"><span>Total equipos</span><span>${tdData.teams.length} / ${tdData.maxTeams}</span></div>
          <div class="td-resumen-row"><span style="color:var(--sun-glare-dark)">Aceptados</span><span style="color:var(--sun-glare-dark)">${accepted.length}</span></div>
          ${pending.length ? `<div class="td-resumen-row"><span style="color:#d97706">Pendientes</span><span style="color:#d97706">${pending.length}</span></div>` : ''}
        </div>
      </div>
    </div>`;
}
 
window.tdApproveTeam = function(id, approve) {
    if (!tdData) return;
    const t = tdData.teams.find(t => t.id === id);
    if (!t) return;
    t.status = approve ? 'accepted' : 'rejected';
    tdSaveCurrent();
    tdRenderParticipantes();
    tdShowToast(approve ? `${t.name} aceptado ✓` : `${t.name} rechazado`, approve ? 'ok' : 'warn');
};
 
window.tdRemoveTeam = function(id) {
    if (!tdData) return;
    const t = tdData.teams.find(t => t.id === id);
    if (!t || !confirm(`¿Eliminar "${t.name}"?`)) return;
    tdData.teams = tdData.teams.filter(t => t.id !== id);
    tdSaveCurrent();
    tdRenderParticipantes();
    tdShowToast(`${t.name} eliminado`, 'warn');
};
 
window.tdAddTeam = function() {
    if (!tdData) return;
    const name    = document.getElementById('td-add-name')?.value.trim();
    const players = parseInt(document.getElementById('td-add-players')?.value) || 0;
    const group   = document.getElementById('td-add-group')?.value.trim() || '';
    if (!name) { tdShowToast('Ingresá el nombre del equipo', 'warn'); return; }
    if (tdData.teams.filter(t => t.status !== 'rejected').length >= tdData.maxTeams) {
        tdShowToast(`Límite de ${tdData.maxTeams} equipos alcanzado`, 'warn'); return;
    }
    const EMOJIS = ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🥍','🏒'];
    tdData.teams.push({ id: Date.now().toString(), name, players, group, wins:0, losses:0, status:'accepted', emoji: EMOJIS[tdData.teams.length % EMOJIS.length] });
    tdSaveCurrent();
    tdRenderParticipantes();
    tdShowToast(`${name} agregado ✓`);
};
 
// ═══════════════════════════════════════════════════════════════════════
// RESULTADOS
// ═══════════════════════════════════════════════════════════════════════
function tdRenderResultados() {
    if (!tdData) { tdShowSection('selector'); return; }
    const played   = tdData.matches.filter(m => m.played);
    const upcoming = tdData.matches.filter(m => !m.played);
 
    const playedRow = m => `
      <div class="td-result-card">
        <div class="td-result-header">
          <span class="td-phase-badge ${tdPhaseColor(m.phase)}">${m.phase}</span>
          <span class="td-result-date">${m.date} · ${m.time || ''}</span>
        </div>
        <div class="td-result-score-row">
          <span class="td-result-team">${m.home ? tdEmoji(m.home)+' '+tdTeamName(m.home) : 'Por definir'}</span>
          <span class="td-result-score">${m.homeScore} <span class="td-result-dash">—</span> ${m.awayScore}</span>
          <span class="td-result-team">${m.away ? tdEmoji(m.away)+' '+tdTeamName(m.away) : 'Por definir'}</span>
        </div>
        ${m.venue ? `<p class="td-match-meta"><i class="ti ti-map-pin"></i>${m.venue}</p>` : ''}
      </div>`;
 
    const upcomingRow = m => `
      <div class="td-result-card td-result-card--upcoming">
        <div class="td-result-header">
          <span class="td-phase-badge ${tdPhaseColor(m.phase)}">${m.phase}</span>
          <span class="td-result-date">${m.date} · ${m.time || ''}</span>
        </div>
        <div class="td-result-score-row">
          <span class="td-result-team">${m.home ? tdEmoji(m.home)+' '+tdTeamName(m.home) : 'Por definir'}</span>
          <span class="td-result-vs">VS</span>
          <span class="td-result-team">${m.away ? tdEmoji(m.away)+' '+tdTeamName(m.away) : 'Por definir'}</span>
        </div>
        ${m.venue ? `<p class="td-match-meta"><i class="ti ti-map-pin"></i>${m.venue}</p>` : ''}
      </div>`;
 
    if (!tdData.matches.length) {
        tdContent.innerHTML = `<div class="td-empty-state td-empty-state--sm"><span class="td-empty-icon" style="font-size:2rem"><i class="ti ti-chart-bar"></i></span><p class="td-empty-sub">Todavía no hay partidos. Agregá partidos desde Calendario.</p></div>`;
        return;
    }
 
    tdContent.innerHTML = `
      ${played.length  ? `<p class="td-section-label"><i class="ti ti-check-circle"></i> PARTIDOS JUGADOS</p><div class="td-results-list">${played.map(playedRow).join('')}</div>` : ''}
      ${upcoming.length? `<p class="td-section-label" style="margin-top:32px"><i class="ti ti-clock"></i> PRÓXIMOS PARTIDOS</p><div class="td-results-list">${upcoming.map(upcomingRow).join('')}</div>` : ''}`;
}
 
// ═══════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════
function tdRenderConfig() {
    if (!tdData) { tdShowSection('selector'); return; }
    const t = tdData;
    const formats = tournamentTypes.flatMap(tt => tt.subtipos.map(s => ({ id: s.id, label: s.title })));
 
    tdContent.innerHTML = `
    <div class="td-config-layout">
      <div class="td-config-main">
 
        <div class="td-card">
          <p class="td-card-label"><i class="ti ti-clipboard-text"></i> Datos del Torneo</p>
          <div class="input-group mt-4">
            <input type="text" id="cfg-name" class="input-field" value="${t.name}" placeholder=" ">
            <label for="cfg-name" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Nombre del Torneo</label>
          </div>
          <div class="input-group">
            <input type="text" id="cfg-sport" class="input-field" value="${t.sport||''}" placeholder=" ">
            <label for="cfg-sport" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Deporte</label>
          </div>
          <div class="input-group">
            <input type="text" id="cfg-venue" class="input-field" value="${t.venue||''}" placeholder=" ">
            <label for="cfg-venue" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Sede / Ubicación</label>
          </div>
          <div class="input-group">
            <input type="number" id="cfg-max" class="input-field" value="${t.maxTeams||8}" min="2" placeholder=" ">
            <label for="cfg-max" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Máximo de Equipos</label>
          </div>
          <div class="input-group">
            <select id="cfg-format" class="input-field" style="color:var(--darkest-hour)">
              ${formats.map(f=>`<option value="${f.id}"${f.id===t.formatSubId?' selected':''}>${f.label}</option>`).join('')}
            </select>
            <label for="cfg-format" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Formato</label>
          </div>
          <div class="input-group">
            <select id="cfg-status" class="input-field" style="color:var(--darkest-hour)">
              <option value="pending"${t.status==='pending'?' selected':''}>Sin iniciar</option>
              <option value="active"${t.status==='active'?' selected':''}>En curso</option>
              <option value="finished"${t.status==='finished'?' selected':''}>Finalizado</option>
            </select>
            <label for="cfg-status" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Estado</label>
          </div>
          <button class="td-btn-primary" onclick="tdSaveConfig()"><i class="ti ti-device-floppy"></i> Guardar Cambios</button>
        </div>
 
        <div class="td-card">
          <p class="td-card-label"><i class="ti ti-user-circle"></i> Contacto del Organizador</p>
          <div class="input-group mt-4">
            <input type="text" id="cfg-org-name" class="input-field" value="${t.organizer?.name||''}" placeholder=" ">
            <label for="cfg-org-name" class="floating-label" style="${t.organizer?.name?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Nombre</label>
          </div>
          <div class="input-group">
            <input type="tel" id="cfg-org-phone" class="input-field" value="${t.organizer?.phone||''}" placeholder=" ">
            <label for="cfg-org-phone" class="floating-label" style="${t.organizer?.phone?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Teléfono</label>
          </div>
          <div class="input-group">
            <input type="email" id="cfg-org-email" class="input-field" value="${t.organizer?.email||''}" placeholder=" ">
            <label for="cfg-org-email" class="floating-label" style="${t.organizer?.email?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Correo electrónico</label>
          </div>
          <button class="td-btn-primary" onclick="tdSaveOrganizer()"><i class="ti ti-device-floppy"></i> Guardar Contacto</button>
        </div>
 
        <div class="td-card">
          <p class="td-card-label"><i class="ti ti-medal"></i> Premios</p>
          ${[1,2,3].map(n => {
            const p = (t.prizes||[]).find(x=>x.place===n) || {place:n,title:'',detail:''};
            const labels = ['🥇 1° Lugar','🥈 2° Lugar','🥉 3° Lugar'];
            return `<div class="td-prize-block">
              <p class="td-prize-place">${labels[n-1]}</p>
              <div class="input-group">
                <input type="text" id="cfg-p${n}-title" class="input-field" value="${p.title}" placeholder=" ">
                <label class="floating-label" style="${p.title?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Título</label>
              </div>
              <div class="input-group">
                <input type="text" id="cfg-p${n}-detail" class="input-field" value="${p.detail}" placeholder=" ">
                <label class="floating-label" style="${p.detail?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Premio</label>
              </div>
            </div>`;
          }).join('')}
          <button class="td-btn-primary" onclick="tdSavePrizes()"><i class="ti ti-device-floppy"></i> Guardar Premios</button>
        </div>
      </div>
 
      <div class="td-config-side">
        <div class="td-card td-card--danger">
          <p class="td-card-label"><i class="ti ti-alert-triangle"></i> Zona de Peligro</p>
          <button class="td-btn-ghost-warn" onclick="tdShowToast('Inscripciones pausadas','warn')">Pausar Inscripciones</button>
          <button class="td-btn-danger" onclick="tdConfirmDelete()">Eliminar Torneo</button>
        </div>
      </div>
    </div>`;
}
 
window.tdSaveConfig = function() {
    if (!tdData) return;
    tdData.name      = document.getElementById('cfg-name')?.value.trim()    || tdData.name;
    tdData.sport     = document.getElementById('cfg-sport')?.value.trim()   || tdData.sport;
    tdData.venue     = document.getElementById('cfg-venue')?.value.trim()   || '';
    tdData.maxTeams  = parseInt(document.getElementById('cfg-max')?.value)  || tdData.maxTeams;
    tdData.formatSubId = document.getElementById('cfg-format')?.value       || tdData.formatSubId;
    tdData.status    = document.getElementById('cfg-status')?.value         || tdData.status;
    const sub = tournamentTypes.flatMap(t=>t.subtipos).find(s=>s.id===tdData.formatSubId);
    if (sub) tdData.formatLabel = sub.title;
    tdSaveCurrent();
    tdUpdateSidebar();
    tdShowToast('Cambios guardados ✓');
};
window.tdSaveOrganizer = function() {
    if (!tdData) return;
    tdData.organizer = {
        name:  document.getElementById('cfg-org-name')?.value.trim()  || '',
        phone: document.getElementById('cfg-org-phone')?.value.trim() || '',
        email: document.getElementById('cfg-org-email')?.value.trim() || '',
    };
    tdSaveCurrent(); tdShowToast('Contacto guardado ✓');
};
window.tdSavePrizes = function() {
    if (!tdData) return;
    tdData.prizes = [1,2,3].map(n => ({
        place:  n,
        title:  document.getElementById(`cfg-p${n}-title`)?.value.trim()  || '',
        detail: document.getElementById(`cfg-p${n}-detail`)?.value.trim() || '',
    })).filter(p => p.title);
    tdSaveCurrent(); tdShowToast('Premios guardados ✓');
};
window.tdConfirmDelete = function() {
    if (!tdData) return;
    if (!confirm(`¿Eliminar "${tdData.name}"? Esta acción no se puede deshacer.`)) return;
    tdDeleteTournament(tdData.id);
    tdData = null;
    tdUpdateSidebar();
    history.replaceState(null, '', 'tournament_dashboard.html');
    tdShowSection('selector');
    tdShowToast('Torneo eliminado', 'warn');
};
 
// ═══════════════════════════════════════════════════════════════════════
// CALENDARIO + EDICIÓN DE PARTIDOS
// ═══════════════════════════════════════════════════════════════════════
function tdRenderCalendario() {
    if (!tdData) { tdShowSection('selector'); return; }
    const byDate  = tdGroupByDate(tdData.matches);
    const played  = tdData.matches.filter(m => m.played).length;
    const pending = tdData.matches.filter(m => !m.played).length;
    const accepted= tdData.teams.filter(t => t.status === 'accepted');
 
    const matchRow = m => `
      <div class="td-cal-row" data-match-id="${m.id}" role="button" tabindex="0">
        <div class="td-cal-time">
          <span class="td-cal-hour">${m.time || '—'}</span>
          <span class="td-cal-dot td-cal-dot--${m.played?'played':'upcoming'}"></span>
        </div>
        <div class="td-cal-match-info">
          <div class="td-cal-teams">
            <span>${m.home ? tdEmoji(m.home)+' '+tdTeamName(m.home) : '🏆 Por definir'}</span>
            <span class="td-cal-sep">${m.played ? `<strong>${m.homeScore} — ${m.awayScore}</strong>` : 'VS'}</span>
            <span>${m.away ? tdEmoji(m.away)+' '+tdTeamName(m.away) : '🏆 Por definir'}</span>
          </div>
          ${m.venue ? `<span class="td-cal-venue"><i class="ti ti-map-pin"></i>${m.venue}</span>` : ''}
        </div>
        <div class="td-cal-right">
          <span class="td-phase-badge ${tdPhaseColor(m.phase)}">${m.phase}</span>
          <i class="ti ti-pencil td-cal-edit-icon"></i>
        </div>
      </div>`;
 
    tdContent.innerHTML = `
    <div class="td-cal-layout" id="td-cal-layout">
 
      <div class="td-stats-row td-stats-row--sm">
        ${[
          { label:'Total Fechas',       val: Object.keys(byDate).length, color:'color:var(--blue-violet-dark)' },
          { label:'Partidos Jugados',   val: played,  color:'color:var(--sun-glare-dark)' },
          { label:'Partidos Restantes', val: pending, color:'color:var(--blue-violet-dark)' },
        ].map(s=>`<div class="td-stat-card"><p class="td-stat-val" style="${s.color}">${s.val}</p><p class="td-stat-label">${s.label}</p></div>`).join('')}
      </div>
 
      <div id="td-cal-list">
        ${!tdData.matches.length ? `<div class="td-empty-state td-empty-state--sm"><span class="td-empty-icon" style="font-size:2rem"><i class="ti ti-calendar"></i></span><p class="td-empty-sub">Todavía no hay partidos. Usá el botón de abajo para agregar el primero.</p></div>` : ''}
        ${Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b)).map(([date, matches]) => `
          <div class="td-date-group">
            <div class="td-date-header"><i class="ti ti-calendar-event"></i>${tdFormatDate(date).toUpperCase()}</div>
            ${matches.map(matchRow).join('')}
          </div>`).join('')}
        <p class="td-cal-tip"><i class="ti ti-info-circle"></i> Hacé clic en un partido para editar su información</p>
      </div>
 
      <!-- Agregar partido -->
      <div class="td-card" id="td-add-match-form" style="margin-top:8px">
        <p class="td-card-label"><i class="ti ti-plus"></i> Agregar Partido</p>
        <div class="td-ep-row2" style="margin-top:14px">
          <div class="input-group">
            <select id="am-home" class="input-field" style="color:var(--darkest-hour)">
              <option value="">Local…</option>
              ${accepted.map(t=>`<option value="${t.id}">${t.emoji||'⚽'} ${t.name}</option>`).join('')}
              <option value="tbd">🏆 Por definir</option>
            </select>
            <label class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Equipo local</label>
          </div>
          <div class="input-group">
            <select id="am-away" class="input-field" style="color:var(--darkest-hour)">
              <option value="">Visitante…</option>
              ${accepted.map(t=>`<option value="${t.id}">${t.emoji||'⚽'} ${t.name}</option>`).join('')}
              <option value="tbd">🏆 Por definir</option>
            </select>
            <label class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Equipo visitante</label>
          </div>
        </div>
        <div class="td-ep-row2">
          <div class="input-group">
            <input type="date" id="am-date" class="input-field" value="${tdData.startDate||''}">
            <label class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Fecha</label>
          </div>
          <div class="input-group">
            <input type="time" id="am-time" class="input-field" value="18:00">
            <label class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Hora</label>
          </div>
        </div>
        <div class="td-ep-row2">
          <div class="input-group">
            <input type="text" id="am-venue" class="input-field" value="${tdData.venue||''}" placeholder=" ">
            <label for="am-venue" class="floating-label" style="${tdData.venue?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Sede</label>
          </div>
          <div class="input-group">
            <input type="text" id="am-phase" class="input-field" placeholder=" " list="am-phase-list" value="Fase de Grupos">
            <label for="am-phase" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Fase</label>
            <datalist id="am-phase-list">
              <option>Fase de Grupos</option><option>Cuartos de Final</option>
              <option>Semifinal</option><option>Gran Final</option>
            </datalist>
          </div>
        </div>
        <button class="td-btn-primary" onclick="tdAddMatch()">
          <i class="ti ti-calendar-plus"></i> Agregar Partido
        </button>
      </div>
    </div>
 
    <div id="td-edit-panel" class="td-edit-panel" aria-hidden="true">
      <div id="td-edit-panel-inner"></div>
    </div>`;
 
    tdContent.querySelectorAll('.td-cal-row').forEach(row => {
        const id = row.dataset.matchId;
        const open = () => tdOpenMatchEdit(id);
        row.addEventListener('click', open);
        row.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); open(); }});
    });
}
 
window.tdAddMatch = function() {
    if (!tdData) return;
    const homeVal = document.getElementById('am-home')?.value;
    const awayVal = document.getElementById('am-away')?.value;
    const date    = document.getElementById('am-date')?.value;
    const time    = document.getElementById('am-time')?.value || '18:00';
    const venue   = document.getElementById('am-venue')?.value.trim() || tdData.venue || '';
    const phase   = document.getElementById('am-phase')?.value.trim() || 'Fase de Grupos';
 
    if (!date) { tdShowToast('Ingresá la fecha del partido', 'warn'); return; }
 
    const toId = v => (!v || v === '' || v === 'tbd') ? null : v;
    tdData.matches.push({
        id: Date.now().toString(), home: toId(homeVal), away: toId(awayVal),
        homeScore: null, awayScore: null,
        date, time, venue, phase, played: false,
        referee:'', refPhone:'', refCost:0, venueCost:0, notes:'',
    });
    tdSaveCurrent();
    tdRenderCalendario();
    tdShowToast('Partido agregado ✓');
};
 
// ── Panel de edición ──────────────────────────────────────────────────
function tdOpenMatchEdit(matchId) {
    const m = tdData?.matches.find(x => x.id === matchId);
    if (!m) return;
    tdCurrentEditId = matchId;
    const panel = document.getElementById('td-edit-panel');
    const inner = document.getElementById('td-edit-panel-inner');
    if (!panel || !inner) return;
    const homeLabel = m.home ? `${tdEmoji(m.home)} ${tdTeamName(m.home)}` : '🏆 Por definir';
    const awayLabel = m.away ? `${tdEmoji(m.away)} ${tdTeamName(m.away)}` : '🏆 Por definir';
    const accepted  = tdData.teams.filter(t => t.status === 'accepted');
 
    inner.innerHTML = `
      <div class="td-ep-header">
        <div>
          <span class="td-phase-badge ${tdPhaseColor(m.phase)}">${m.phase}</span>
          <h2 class="td-ep-title">${homeLabel} vs ${awayLabel}</h2>
        </div>
        <button class="td-ep-close" onclick="tdCloseMatchEdit()" aria-label="Cerrar"><i class="ti ti-x"></i></button>
      </div>
 
      <div class="td-ep-section">
        <p class="td-ep-section-title"><i class="ti ti-swap"></i> Equipos</p>
        <div class="td-ep-row2">
          <div class="input-group">
            <select id="ep-home" class="input-field" style="color:var(--darkest-hour)">
              <option value="">Por definir</option>
              ${accepted.map(t=>`<option value="${t.id}"${t.id===m.home?' selected':''}>${t.emoji||'⚽'} ${t.name}</option>`).join('')}
            </select>
            <label class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Local</label>
          </div>
          <div class="input-group">
            <select id="ep-away" class="input-field" style="color:var(--darkest-hour)">
              <option value="">Por definir</option>
              ${accepted.map(t=>`<option value="${t.id}"${t.id===m.away?' selected':''}>${t.emoji||'⚽'} ${t.name}</option>`).join('')}
            </select>
            <label class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Visitante</label>
          </div>
        </div>
      </div>
 
      <div class="td-ep-section">
        <p class="td-ep-section-title"><i class="ti ti-map-pin"></i> Logística</p>
        <div class="td-ep-row2">
          <div class="input-group">
            <input type="date" id="ep-date" class="input-field" value="${m.date}">
            <label class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Fecha</label>
          </div>
          <div class="input-group">
            <input type="time" id="ep-time" class="input-field" value="${m.time||''}">
            <label class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Hora</label>
          </div>
        </div>
        <div class="input-group">
          <input type="text" id="ep-venue" class="input-field" value="${m.venue||''}" placeholder=" ">
          <label for="ep-venue" class="floating-label" style="${m.venue?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Sede / Ubicación</label>
        </div>
        <div class="input-group">
          <input type="text" id="ep-phase" class="input-field" value="${m.phase||''}" placeholder=" " list="ep-phase-list">
          <label for="ep-phase" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Fase</label>
          <datalist id="ep-phase-list"><option>Fase de Grupos</option><option>Cuartos de Final</option><option>Semifinal</option><option>Gran Final</option></datalist>
        </div>
        <div class="input-group">
          <input type="text" id="ep-referee" class="input-field" value="${m.referee||''}" placeholder=" ">
          <label for="ep-referee" class="floating-label" style="${m.referee?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Nombre del árbitro</label>
        </div>
        <div class="input-group">
          <input type="tel" id="ep-ref-phone" class="input-field" value="${m.refPhone||''}" placeholder=" ">
          <label for="ep-ref-phone" class="floating-label" style="${m.refPhone?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Contacto del árbitro</label>
        </div>
        <div class="td-ep-row2">
          <div class="input-group td-cost-group">
            <span class="td-cost-prefix">$</span>
            <input type="number" id="ep-venue-cost" class="input-field td-cost-input" value="${m.venueCost||''}" min="0" placeholder=" ">
            <label class="floating-label" style="${m.venueCost?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Alquiler cancha</label>
          </div>
          <div class="input-group td-cost-group">
            <span class="td-cost-prefix">$</span>
            <input type="number" id="ep-ref-cost" class="input-field td-cost-input" value="${m.refCost||''}" min="0" placeholder=" ">
            <label class="floating-label" style="${m.refCost?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Honorario árbitro</label>
          </div>
        </div>
        <div class="td-ep-total" id="ep-total">
          <span>Total estimado:</span>
          <strong id="ep-total-val">$${((m.venueCost||0)+(m.refCost||0)).toLocaleString('es-UY')}</strong>
        </div>
      </div>
 
      <div class="td-ep-section">
        <p class="td-ep-section-title"><i class="ti ti-chart-bar"></i> Resultado</p>
        <label class="td-ep-toggle-row">
          <span>Partido jugado</span>
          <span class="relative inline-flex h-7 w-12 shrink-0 items-center">
            <input type="checkbox" id="ep-played" class="peer sr-only" ${m.played?'checked':''}>
            <span class="absolute inset-0 rounded-full bg-darkest-hour/15 transition-colors duration-300 peer-checked:bg-sun-glare-dark"></span>
            <span class="absolute left-1 h-5 w-5 rounded-full bg-cloud-dancer shadow transition-transform duration-300 peer-checked:translate-x-5"></span>
          </span>
        </label>
        <div class="td-ep-score-row" id="ep-score-row" style="${m.played?'':'display:none'}">
          <div class="td-ep-score-team">
            <span class="td-team-emoji">${m.home?tdEmoji(m.home):'🏆'}</span>
            <span class="td-ep-score-name" style="font-size:10px;max-width:80px;word-break:break-word">${homeLabel}</span>
            <input type="number" id="ep-home-score" class="td-score-input" value="${m.homeScore??''}" min="0">
          </div>
          <span class="td-ep-score-dash">—</span>
          <div class="td-ep-score-team">
            <input type="number" id="ep-away-score" class="td-score-input" value="${m.awayScore??''}" min="0">
            <span class="td-ep-score-name" style="font-size:10px;max-width:80px;word-break:break-word">${awayLabel}</span>
            <span class="td-team-emoji">${m.away?tdEmoji(m.away):'🏆'}</span>
          </div>
        </div>
      </div>
 
      <div class="td-ep-section">
        <div class="input-group">
          <textarea id="ep-notes" class="input-field" rows="2" placeholder=" " style="min-height:68px;padding-top:16px;resize:none">${m.notes||''}</textarea>
          <label for="ep-notes" class="floating-label" style="${m.notes?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Notas (opcional)</label>
        </div>
        <button class="td-btn-danger" style="width:100%;margin-top:2px" onclick="tdDeleteMatch('${m.id}')">
          <i class="ti ti-trash"></i> Eliminar partido
        </button>
      </div>
 
      <div class="td-ep-actions">
        <button class="td-btn-ghost" onclick="tdCloseMatchEdit()">Cancelar</button>
        <button class="td-btn-primary" onclick="tdSaveMatch()"><i class="ti ti-device-floppy"></i> Guardar</button>
      </div>`;
 
    ['ep-venue-cost','ep-ref-cost'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            const vc = parseFloat(document.getElementById('ep-venue-cost')?.value)||0;
            const rc = parseFloat(document.getElementById('ep-ref-cost')?.value)||0;
            const el = document.getElementById('ep-total-val');
            if (el) el.textContent = `$${(vc+rc).toLocaleString('es-UY')}`;
        });
    });
    document.getElementById('ep-played')?.addEventListener('change', e => {
        document.getElementById('ep-score-row').style.display = e.target.checked ? '' : 'none';
    });
 
    panel.classList.add('open');
    panel.setAttribute('aria-hidden','false');
    document.getElementById('td-cal-layout')?.classList.add('panel-open');
    setTimeout(() => document.getElementById('ep-date')?.focus(), 320);
}
 
window.tdCloseMatchEdit = function() {
    const panel = document.getElementById('td-edit-panel');
    panel?.classList.remove('open');
    panel?.setAttribute('aria-hidden','true');
    document.getElementById('td-cal-layout')?.classList.remove('panel-open');
    tdCurrentEditId = null;
};
 
window.tdSaveMatch = function() {
    if (!tdData) return;
    const m = tdData.matches.find(x => x.id === tdCurrentEditId);
    if (!m) return;
    const toId = v => (!v || v === '') ? null : v;
    m.home      = toId(document.getElementById('ep-home')?.value);
    m.away      = toId(document.getElementById('ep-away')?.value);
    m.date      = document.getElementById('ep-date')?.value      || m.date;
    m.time      = document.getElementById('ep-time')?.value      || m.time;
    m.venue     = document.getElementById('ep-venue')?.value.trim()     || '';
    m.phase     = document.getElementById('ep-phase')?.value.trim()     || m.phase;
    m.referee   = document.getElementById('ep-referee')?.value.trim()   || '';
    m.refPhone  = document.getElementById('ep-ref-phone')?.value.trim() || '';
    m.venueCost = parseFloat(document.getElementById('ep-venue-cost')?.value) || 0;
    m.refCost   = parseFloat(document.getElementById('ep-ref-cost')?.value)   || 0;
    m.notes     = document.getElementById('ep-notes')?.value.trim() || '';
    m.played    = document.getElementById('ep-played')?.checked ?? false;
    if (m.played) {
        m.homeScore = parseInt(document.getElementById('ep-home-score')?.value) ?? null;
        m.awayScore = parseInt(document.getElementById('ep-away-score')?.value) ?? null;
    } else { m.homeScore = null; m.awayScore = null; }
    tdSaveCurrent();
    tdCloseMatchEdit();
    tdRenderCalendario();
    tdShowToast('Partido actualizado ✓');
};
 
window.tdDeleteMatch = function(id) {
    if (!tdData || !confirm('¿Eliminar este partido?')) return;
    tdData.matches = tdData.matches.filter(m => m.id !== id);
    tdSaveCurrent();
    tdCloseMatchEdit();
    tdRenderCalendario();
    tdShowToast('Partido eliminado', 'warn');
};
 
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && tdCurrentEditId !== null) tdCloseMatchEdit();
});
 
// ═══════════════════════════════════════════════════════════════════════
// INIT — auto-seleccionar torneo desde ?t=ID
// ═══════════════════════════════════════════════════════════════════════
const tdUrlParam = new URLSearchParams(location.search).get('t');
if (tdUrlParam) {
    const found = tdLoadAll().find(t => t.id === tdUrlParam);
    if (found) { tdData = found; tdUpdateSidebar(); tdShowSection('overview'); }
    else { tdUpdateSidebar(); tdShowSection('selector'); }
} else {
    tdUpdateSidebar();
    tdShowSection('selector');
}
 
} // end if (tdDashboard)