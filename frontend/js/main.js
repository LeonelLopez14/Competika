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
// =====================================================================
 
const tfForm = document.getElementById('tf-form');
 
if (tfForm) {
 
    // ── Diagramas de estructura  ──────
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
 
    // ── Paso 1: tarjetas de formato  ───
    function tfRenderFormatCards() {
        if (!tfFormatGrid) return;
        tfFormatGrid.innerHTML = tournamentTypes.map(type => `
            <label class="tf-card group relative flex cursor-pointer flex-col gap-3 justify-center items-center rounded-2xl border border-blue-violet/15 bg-cloud-dancer p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-violet/40 hover:shadow-[0_18px_40px_rgba(95,31,197,0.12)] has-[:checked]:border-sun-glare-dark has-[:checked]:bg-sun-glare/10 has-[:checked]:shadow-[0_18px_40px_rgba(67,197,158,0.18)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-violet-dark has-[:focus-visible]:ring-offset-2">
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
 
    // ── Envío del formulario (sin backend por ahora: estado de éxito) ──────
    tfForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!tfForm.reportValidity()) return;
 
        if (tfSuccess) {
            const nameEl = tfSuccess.querySelector('[data-tf-success-name]');
            if (nameEl) nameEl.textContent = tfNameInput?.value || 'tu torneo';
            tfWizard?.classList.add('hidden');
            tfSuccess.classList.remove('hidden', 'tf-step-anim');
            void tfSuccess.offsetWidth;
            tfSuccess.classList.add('tf-step-anim');
            tfSuccess.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
 
    document.getElementById('tf-reset-btn')?.addEventListener('click', () => {
        tfForm.reset();
        tfSelectedTypeId = null;
        if (tfContinueBtn) tfContinueBtn.disabled = true;
        tfSuccess?.classList.add('hidden');
        tfWizard?.classList.remove('hidden');
        tfShowStep(1);
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
// Única fuente de datos: tdData. Para conectar al backend, reemplazar
// tdData por fetch() y ajustar las funciones de render.
// ====================================================================
const tdDashboard = document.getElementById('td-dashboard');
 
if (tdDashboard) {
 
// ── Mock data ─────────────────────────────────────────────────────────
const tdData = {
    tournament: {
        name: 'Liga Relámpago 2026', sport: 'Fútbol',
        format: 'grupos-eliminacion', formatLabel: 'Grupos + Eliminación',
        status: 'EN CURSO', maxTeams: 8,
        venue: 'Estadio Nacional', startDate: '2026-06-01', public: true,
        organizer: { name: 'Juan Pérez', email: 'juan@competika.com', phone: '+598 99 123 456' },
    },
    teams: [
        { id:1, name:'Águilas FC',     players:18, group:'A', wins:4, losses:1, status:'accepted', emoji:'🦅' },
        { id:2, name:'Lobos Negros',   players:16, group:'A', wins:3, losses:2, status:'accepted', emoji:'🐺' },
        { id:3, name:'Dragones Rojos', players:20, group:'B', wins:5, losses:0, status:'accepted', emoji:'🐉' },
        { id:4, name:'Toros Bravos',   players:17, group:'B', wins:2, losses:3, status:'accepted', emoji:'🐂' },
        { id:5, name:'Leones del Sur', players:18, group:'D', wins:4, losses:1, status:'accepted', emoji:'🦁' },
        { id:6, name:'Panteras DF',    players:19, group:'C', wins:3, losses:2, status:'pending',  emoji:'🐆' },
        { id:7, name:'Cóndores',       players:15, group:'C', wins:1, losses:4, status:'pending',  emoji:'🦅' },
        { id:8, name:'Tiburones',      players:16, group:'D', wins:2, losses:3, status:'rejected', emoji:'🦈' },
    ],
    matches: [
        { id:1, home:1, away:2, homeScore:3, awayScore:1, date:'2026-06-01', time:'18:00', venue:'Estadio Nacional',  phase:'Fase de Grupos', played:true,  referee:'Carlos Mendoza', refPhone:'+598 99 111 222', refCost:1500, venueCost:8000, notes:'' },
        { id:2, home:3, away:4, homeScore:2, awayScore:0, date:'2026-06-01', time:'20:30', venue:'Arena Central',     phase:'Fase de Grupos', played:true,  referee:'', refPhone:'', refCost:0, venueCost:0, notes:'' },
        { id:3, home:5, away:6, homeScore:1, awayScore:1, date:'2026-06-03', time:'17:00', venue:'Estadio Olímpico',  phase:'Fase de Grupos', played:true,  referee:'Ana García', refPhone:'+598 99 333 444', refCost:1200, venueCost:6000, notes:'Partido con lluvia, cancha alternativa' },
        { id:4, home:1, away:3, homeScore:null, awayScore:null, date:'2026-06-15', time:'19:00', venue:'Estadio Nacional', phase:'Semifinal', played:false, referee:'', refPhone:'', refCost:0, venueCost:0, notes:'' },
        { id:5, home:5, away:2, homeScore:null, awayScore:null, date:'2026-06-15', time:'21:30', venue:'Arena Central',    phase:'Semifinal', played:false, referee:'', refPhone:'', refCost:0, venueCost:0, notes:'' },
        { id:6, home:null, away:null, homeScore:null, awayScore:null, date:'2026-06-22', time:'20:00', venue:'Estadio Nacional', phase:'Gran Final', played:false, referee:'', refPhone:'', refCost:0, venueCost:0, notes:'Definición del campeonato' },
    ],
    prizes: [
        { place:1, emoji:'🥇', title:'Campeón',      detail:'Trofeo + $10.000 MXN' },
        { place:2, emoji:'🥈', title:'Subcampeón',   detail:'Medalla de plata + $5.000 MXN' },
        { place:3, emoji:'🥉', title:'Tercer Lugar', detail:'Medalla de bronce' },
    ],
};
 
// ── Helpers ──────────────────────────────────────────────────────────
const tdTeam     = id => tdData.teams.find(t => t.id === id);
const tdTeamName = id => tdTeam(id)?.name ?? 'Por definir';
const tdEmoji    = id => tdTeam(id)?.emoji ?? '🏆';
 
function tdFormatDate(str) {
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('es-UY', { weekday:'long', day:'numeric', month:'long' });
}
function tdShortDate(str) {
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('es-UY', { day:'numeric', month:'short', year:'numeric' });
}
 
const tdPhaseColor = phase => ({
    'Fase de Grupos': 'bg-blue-violet/10 text-blue-violet-dark',
    'Semifinal':      'bg-sun-glare/20 text-sun-glare-dark',
    'Gran Final':     'bg-blue-violet text-cloud-dancer',
})[phase] ?? 'bg-darkest-hour/10 text-darkest-hour/60';
 
function tdGroupByDate(matches) {
    return matches.reduce((acc, m) => {
        (acc[m.date] = acc[m.date] || []).push(m);
        return acc;
    }, {});
}
 
// ── Toast ─────────────────────────────────────────────────────────────
const tdToast = document.getElementById('td-toast');
let tdToastTimer;
function tdShowToast(msg, type = 'ok') {
    clearTimeout(tdToastTimer);
    tdToast.textContent = msg;
    tdToast.className = `td-toast td-toast--${type} td-toast--show`;
    tdToastTimer = setTimeout(() => tdToast.classList.remove('td-toast--show'), 3000);
}
 
// ── Sidebar init ──────────────────────────────────────────────────────
document.getElementById('td-sidebar-info').innerHTML = `
    <p class="td-tournament-name">${tdData.tournament.name}</p>
    <span class="td-status-dot"></span><span class="td-status-text">${tdData.tournament.status}</span>
`;
 
// Mobile sidebar toggle
const tdSidebar  = document.getElementById('td-sidebar');
const tdSideBack = document.getElementById('td-sidebar-backdrop');
const tdToggle   = document.getElementById('td-sidebar-toggle');
tdToggle?.addEventListener('click', () => {
    tdSidebar.classList.toggle('open');
    tdSideBack.classList.toggle('open');
});
tdSideBack?.addEventListener('click', () => {
    tdSidebar.classList.remove('open');
    tdSideBack.classList.remove('open');
});
 
// ── Navigation ────────────────────────────────────────────────────────
let tdCurrentSection = 'overview';
const tdSectionMeta = {
    overview:       { label:'Overview',          breadcrumb:'Dashboard' },
    participantes:  { label:'Equipos Participantes', breadcrumb:'Participantes' },
    resultados:     { label:'Resultados de Partidos', breadcrumb:'Resultados' },
    configuracion:  { label:'Configuración del Torneo', breadcrumb:'Configuración' },
    calendario:     { label:'Calendario de Partidos',  breadcrumb:'Calendario' },
};
const tdContent     = document.getElementById('td-section-content');
const tdPageTitle   = document.getElementById('td-page-title');
const tdBreadcrumb  = document.getElementById('td-breadcrumb');
let tdCurrentEditId = null;
 
function tdShowSection(id) {
    tdCurrentSection = id;
    tdCurrentEditId  = null;
    const meta = tdSectionMeta[id] || {};
    tdPageTitle.textContent  = meta.label     || id;
    tdBreadcrumb.textContent = meta.breadcrumb || id;
 
    document.querySelectorAll('.td-nav-item').forEach(li =>
        li.classList.toggle('active', li.dataset.section === id)
    );
    tdContent.innerHTML = '';
    tdContent.classList.remove('td-section-anim');
    void tdContent.offsetWidth;
    tdContent.classList.add('td-section-anim');
 
    ({ overview: tdRenderOverview, participantes: tdRenderParticipantes,
       resultados: tdRenderResultados, configuracion: tdRenderConfig,
       calendario: tdRenderCalendario })[id]?.();
 
    // close mobile sidebar
    tdSidebar.classList.remove('open');
    tdSideBack.classList.remove('open');
}
 
document.querySelectorAll('.td-nav-item').forEach(li =>
    li.addEventListener('click', () => tdShowSection(li.dataset.section))
);
 
// ── Share ─────────────────────────────────────────────────────────────
['td-share-sidebar','td-share-top'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
        if (navigator.clipboard) navigator.clipboard.writeText(location.href);
        tdShowToast('¡Link copiado al portapapeles!');
    });
});
 
// ═══════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════
function tdRenderOverview() {
    const played  = tdData.matches.filter(m => m.played).length;
    const pending = tdData.matches.filter(m => !m.played).length;
    const groups  = [...new Set(tdData.teams.map(t => t.group))].sort();
    const next    = tdData.matches.find(m => !m.played);
 
    tdContent.innerHTML = `
    <div class="td-overview-grid">
 
      <!-- Stats -->
      <div class="td-stats-row">
        ${[
            { icon:'ti-users',       label:'Equipos',            val: tdData.teams.filter(t=>t.status==='accepted').length },
            { icon:'ti-sword',       label:'Partidos Jugados',   val: played  },
            { icon:'ti-clock',       label:'Partidos Pendientes',val: pending },
            { icon:'ti-grid-dots',   label:'Grupos',             val: groups.length },
        ].map(s => `
          <div class="td-stat-card">
            <i class="ti ${s.icon} td-stat-icon"></i>
            <div>
              <p class="td-stat-label">${s.label}</p>
              <p class="td-stat-val">${s.val}</p>
            </div>
          </div>`).join('')}
      </div>
 
      <!-- Próximo partido + Formato -->
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
          <p class="td-match-meta"><i class="ti ti-calendar"></i>${tdShortDate(next.date)} · ${next.time} · <i class="ti ti-map-pin"></i>${next.venue}</p>
        </div>` : `<div class="td-card td-card--muted"><p class="td-stat-label">No hay próximos partidos</p></div>`}
 
        <!-- Grupos -->
        <div class="td-card">
          <div class="td-card-header-row">
            <p class="td-card-label">FORMATO DEL TORNEO</p>
            <span class="td-phase-badge bg-blue-violet text-cloud-dancer">${tdData.tournament.formatLabel}</span>
          </div>
          <div class="td-groups-mini-grid">
            ${groups.map(g => {
                const gTeams = tdData.teams.filter(t => t.group === g && t.status === 'accepted');
                return `
                <div class="td-group-mini">
                  <p class="td-group-mini-title">GRUPO ${g}</p>
                  ${gTeams.length ? gTeams.map(t => `
                    <div class="td-group-mini-row">
                      <span>${t.emoji} ${t.name}</span>
                      <span class="td-group-mini-rec">${t.wins}V ${t.losses}D</span>
                    </div>`).join('') : '<p class="td-no-data">Sin equipos</p>'}
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>
 
      <!-- Tabla de posiciones Grupo A -->
      <div class="td-card">
        <p class="td-card-label">TABLA DE POSICIONES — GRUPO A</p>
        <table class="td-table">
          <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>V</th><th>D</th><th>Pts</th></tr></thead>
          <tbody>
            ${tdData.teams.filter(t=>t.group==='A'&&t.status==='accepted')
              .sort((a,b)=>(b.wins*3)-(a.wins*3))
              .map((t,i)=>`
              <tr class="${i===0?'td-table-first':''}">
                <td class="td-table-pos">${i+1}</td>
                <td><span class="td-table-emoji">${t.emoji}</span>${t.name}</td>
                <td>${t.wins+t.losses}</td><td>${t.wins}</td><td>${t.losses}</td>
                <td class="td-table-pts">${t.wins*3}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}
 
// ═══════════════════════════════════════════════════════════════════════
// PARTICIPANTES
// ═══════════════════════════════════════════════════════════════════════
function tdRenderParticipantes() {
    const accepted = tdData.teams.filter(t=>t.status==='accepted');
    const pending  = tdData.teams.filter(t=>t.status==='pending');
    const rejected = tdData.teams.filter(t=>t.status==='rejected');
    const groups   = [...new Set(tdData.teams.map(t=>t.group))].sort();
 
    const teamRow = (t, showActions=false) => `
      <div class="td-team-row">
        <span class="td-team-row-emoji">${t.emoji}</span>
        <div class="td-team-row-info">
          <p class="td-team-row-name">${t.name}</p>
          <p class="td-team-row-sub">${t.players} jugadores · Grupo ${t.group}</p>
        </div>
        <span class="td-team-rec">${t.wins}V&nbsp;&nbsp;${t.losses}D</span>
        ${showActions ? `
          <button class="td-action-btn td-action-ok" title="Aceptar" onclick="tdApproveTeam(${t.id},true)"><i class="ti ti-check"></i></button>
          <button class="td-action-btn td-action-no" title="Rechazar" onclick="tdApproveTeam(${t.id},false)"><i class="ti ti-x"></i></button>` : ''}
        <span class="td-dot td-dot--${t.status}"></span>
      </div>`;
 
    tdContent.innerHTML = `
    <div class="td-part-layout">
      <div class="td-part-list">
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
          <select id="td-add-group" class="input-field" style="color:var(--darkest-hour)">
            ${groups.map(g=>`<option value="${g}">Grupo ${g}</option>`).join('')}
          </select>
          <label for="td-add-group" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Grupo</label>
        </div>
        <button class="td-btn-primary w-full mt-2" onclick="tdAddTeam()">
          <i class="ti ti-plus"></i> Agregar Equipo
        </button>
        <div class="td-resumen">
          <p class="td-card-label mt-4">RESUMEN</p>
          <div class="td-resumen-row"><span>Total equipos</span><span>${tdData.teams.length}</span></div>
          <div class="td-resumen-row"><span class="text-sun-glare-dark">Aceptados</span><span class="text-sun-glare-dark">${accepted.length}</span></div>
          <div class="td-resumen-row"><span style="color:#f59e0b">Pendientes</span><span style="color:#f59e0b">${pending.length}</span></div>
        </div>
      </div>
    </div>`;
}
 
window.tdApproveTeam = function(id, approve) {
    const t = tdData.teams.find(t=>t.id===id);
    if (!t) return;
    t.status = approve ? 'accepted' : 'rejected';
    tdRenderParticipantes();
    tdShowToast(approve ? `${t.name} aceptado ✓` : `${t.name} rechazado`, approve ? 'ok' : 'warn');
};
 
window.tdAddTeam = function() {
    const name    = document.getElementById('td-add-name')?.value.trim();
    const players = parseInt(document.getElementById('td-add-players')?.value) || 0;
    const group   = document.getElementById('td-add-group')?.value;
    if (!name) { tdShowToast('Ingresá el nombre del equipo', 'warn'); return; }
    tdData.teams.push({ id: Date.now(), name, players, group, wins:0, losses:0, status:'accepted', emoji:'⚽' });
    tdRenderParticipantes();
    tdShowToast(`${name} agregado al Grupo ${group} ✓`);
};
 
// ═══════════════════════════════════════════════════════════════════════
// RESULTADOS
// ═══════════════════════════════════════════════════════════════════════
function tdRenderResultados() {
    const played  = tdData.matches.filter(m=>m.played);
    const upcoming= tdData.matches.filter(m=>!m.played);
 
    const playedRow = m => `
      <div class="td-result-card">
        <div class="td-result-header">
          <span class="td-phase-badge ${tdPhaseColor(m.phase)}">${m.phase}</span>
          <span class="td-result-date">${m.date} · ${m.time}</span>
        </div>
        <div class="td-result-score-row">
          <span class="td-result-team">${tdTeamName(m.home)}</span>
          <span class="td-result-score">${m.homeScore} <span class="td-result-dash">—</span> ${m.awayScore}</span>
          <span class="td-result-team">${tdTeamName(m.away)}</span>
        </div>
        ${m.venue ? `<p class="td-match-meta"><i class="ti ti-map-pin"></i>${m.venue}</p>` : ''}
      </div>`;
 
    const upcomingRow = m => `
      <div class="td-result-card td-result-card--upcoming">
        <div class="td-result-header">
          <span class="td-phase-badge ${tdPhaseColor(m.phase)}">${m.phase}</span>
          <span class="td-result-date">${m.date} · ${m.time}</span>
        </div>
        <div class="td-result-score-row">
          <span class="td-result-team">${m.home ? tdTeamName(m.home) : 'TBD'}</span>
          <span class="td-result-vs">VS</span>
          <span class="td-result-team">${m.away ? tdTeamName(m.away) : 'TBD'}</span>
        </div>
        ${m.venue ? `<p class="td-match-meta"><i class="ti ti-map-pin"></i>${m.venue}</p>` : ''}
      </div>`;
 
    tdContent.innerHTML = `
      ${played.length ? `<p class="td-section-label"><i class="ti ti-check-circle"></i> PARTIDOS JUGADOS</p>
        <div class="td-results-list">${played.map(playedRow).join('')}</div>` : ''}
      ${upcoming.length ? `<p class="td-section-label" style="margin-top:32px"><i class="ti ti-clock"></i> PRÓXIMOS PARTIDOS</p>
        <div class="td-results-list">${upcoming.map(upcomingRow).join('')}</div>` : ''}`;
}
 
// ═══════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════
function tdRenderConfig() {
    const t = tdData.tournament;
    const formats = tournamentTypes.flatMap(tt => tt.subtipos.map(s => ({ id: s.id, label: s.title })));
 
    tdContent.innerHTML = `
    <div class="td-config-layout">
      <div class="td-config-main">
 
        <!-- Datos del torneo -->
        <div class="td-card">
          <p class="td-card-label"><i class="ti ti-clipboard-text"></i> Datos del Torneo</p>
          <div class="input-group mt-4">
            <input type="text" id="cfg-name" class="input-field" value="${t.name}" placeholder=" ">
            <label for="cfg-name" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Nombre del Torneo</label>
          </div>
          <div class="input-group">
            <input type="text" id="cfg-sport" class="input-field" value="${t.sport}" placeholder=" ">
            <label for="cfg-sport" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Deporte</label>
          </div>
          <div class="input-group">
            <input type="number" id="cfg-max" class="input-field" value="${t.maxTeams}" min="2" placeholder=" ">
            <label for="cfg-max" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Máximo de Equipos</label>
          </div>
          <div class="input-group">
            <select id="cfg-format" class="input-field" style="color:var(--darkest-hour)">
              ${formats.map(f=>`<option value="${f.id}" ${f.id===t.format?'selected':''}>${f.label}</option>`).join('')}
            </select>
            <label for="cfg-format" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Formato</label>
          </div>
          <button class="td-btn-primary" onclick="tdSaveConfig()"><i class="ti ti-device-floppy"></i> Guardar Cambios</button>
        </div>
 
        <!-- Premios -->
        <div class="td-card">
          <p class="td-card-label"><i class="ti ti-medal"></i> Premios</p>
          ${tdData.prizes.map(p => `
          <div class="td-prize-block">
            <p class="td-prize-place">${p.emoji} ${p.place}° Lugar</p>
            <div class="input-group">
              <input type="text" class="input-field" value="${p.title}" placeholder=" " data-prize="${p.place}" data-field="title">
              <label class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Título</label>
            </div>
            <div class="input-group">
              <input type="text" class="input-field" value="${p.detail}" placeholder=" " data-prize="${p.place}" data-field="detail">
              <label class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Premio</label>
            </div>
          </div>`).join('')}
        </div>
 
      </div>
      <div class="td-config-side">
 
        <!-- Aprobar participantes -->
        <div class="td-card">
          <p class="td-card-label"><i class="ti ti-user-check"></i> Aprobar Participantes</p>
          ${tdData.teams.filter(t=>t.status==='pending').length
            ? `<p class="td-meta-small">${tdData.teams.filter(t=>t.status==='pending').length} solicitudes pendientes</p>
              ${tdData.teams.filter(t=>t.status==='pending').map(t=>`
              <div class="td-approve-row">
                <span>${t.emoji} <strong>${t.name}</strong></span>
                <span class="td-approve-sub">${t.players} jugadores · Grupo ${t.group}</span>
                <div class="td-approve-btns">
                  <button class="td-action-btn td-action-ok" onclick="tdApproveTeam(${t.id},true)"><i class="ti ti-check"></i></button>
                  <button class="td-action-btn td-action-no" onclick="tdApproveTeam(${t.id},false)"><i class="ti ti-x"></i></button>
                </div>
              </div>`).join('')}`
            : '<p class="td-meta-small td-meta-muted">No hay solicitudes pendientes</p>'}
        </div>
 
        <!-- Zona de peligro -->
        <div class="td-card td-card--danger">
          <p class="td-card-label"><i class="ti ti-alert-triangle"></i> Zona de Peligro</p>
          <button class="td-btn-ghost-warn" onclick="tdShowToast('Inscripciones pausadas','warn')">Pausar Inscripciones</button>
          <button class="td-btn-danger" onclick="tdShowToast('Acción no disponible en demo','warn')">Cancelar Torneo</button>
        </div>
 
      </div>
    </div>`;
}
 
window.tdSaveConfig = function() {
    const t = tdData.tournament;
    t.name    = document.getElementById('cfg-name')?.value.trim() || t.name;
    t.sport   = document.getElementById('cfg-sport')?.value.trim() || t.sport;
    t.maxTeams= parseInt(document.getElementById('cfg-max')?.value) || t.maxTeams;
    t.format  = document.getElementById('cfg-format')?.value || t.format;
    document.getElementById('td-sidebar-info').innerHTML = `
      <p class="td-tournament-name">${t.name}</p>
      <span class="td-status-dot"></span><span class="td-status-text">${t.status}</span>`;
    tdShowToast('Cambios guardados ✓');
};
 
// ═══════════════════════════════════════════════════════════════════════
// CALENDARIO + EDICIÓN DE PARTIDOS  ← entregable principal
// ═══════════════════════════════════════════════════════════════════════
function tdRenderCalendario() {
    const played  = tdData.matches.filter(m=>m.played).length;
    const pending = tdData.matches.filter(m=>!m.played).length;
    const byDate  = tdGroupByDate(tdData.matches);
 
    const matchRow = m => `
      <div class="td-cal-row" data-match-id="${m.id}" role="button" tabindex="0" aria-label="Editar partido ${tdTeamName(m.home)} vs ${tdTeamName(m.away)}">
        <div class="td-cal-time">
          <span class="td-cal-hour">${m.time}</span>
          <span class="td-cal-dot td-cal-dot--${m.played ? 'played' : 'upcoming'}"></span>
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
 
      <!-- Stats -->
      <div class="td-stats-row td-stats-row--sm">
        ${[
          { label:'Total Fechas',      val: Object.keys(byDate).length, color:'text-blue-violet-dark' },
          { label:'Partidos Jugados',  val: played,  color:'text-sun-glare-dark' },
          { label:'Partidos Restantes',val: pending, color:'text-blue-violet-dark' },
        ].map(s=>`
          <div class="td-stat-card">
            <p class="td-stat-val ${s.color}">${s.val}</p>
            <p class="td-stat-label">${s.label}</p>
          </div>`).join('')}
      </div>
 
      <!-- Lista de partidos por fecha -->
      <div id="td-cal-list">
        ${Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b)).map(([date, matches]) => `
          <div class="td-date-group">
            <div class="td-date-header">
              <i class="ti ti-calendar-event"></i>
              ${tdFormatDate(date).toUpperCase()}
            </div>
            ${matches.map(matchRow).join('')}
          </div>`).join('')}
        <p class="td-cal-tip"><i class="ti ti-info-circle"></i> Hacé clic en cualquier partido para editar su información</p>
      </div>
    </div>
 
    <!-- Panel de edición (fuera del layout para poder posicionarse fixed/absolute) -->
    <div id="td-edit-panel" class="td-edit-panel" aria-hidden="true">
      <div id="td-edit-panel-inner"></div>
    </div>`;
 
    // Adjuntar eventos a las filas
    tdContent.querySelectorAll('.td-cal-row').forEach(row => {
        const id = parseInt(row.dataset.matchId);
        const open = () => tdOpenMatchEdit(id);
        row.addEventListener('click', open);
        row.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); open(); } });
    });
}
 
// ── Abrir panel de edición ────────────────────────────────────────────
function tdOpenMatchEdit(matchId) {
    const m = tdData.matches.find(x=>x.id===matchId);
    if (!m) return;
    tdCurrentEditId = matchId;
 
    const panel = document.getElementById('td-edit-panel');
    const inner = document.getElementById('td-edit-panel-inner');
    if (!panel || !inner) return;
 
    const homeLabel = m.home ? `${tdEmoji(m.home)} ${tdTeamName(m.home)}` : '🏆 Por definir';
    const awayLabel = m.away ? `${tdEmoji(m.away)} ${tdTeamName(m.away)}` : '🏆 Por definir';
 
    inner.innerHTML = `
      <!-- Encabezado del panel -->
      <div class="td-ep-header">
        <div>
          <span class="td-phase-badge ${tdPhaseColor(m.phase)}">${m.phase}</span>
          <h2 class="td-ep-title">${homeLabel} vs ${awayLabel}</h2>
        </div>
        <button class="td-ep-close" onclick="tdCloseMatchEdit()" aria-label="Cerrar">
          <i class="ti ti-x"></i>
        </button>
      </div>
 
      <!-- ─ SECCIÓN 1: LOGÍSTICA ─ -->
      <div class="td-ep-section">
        <p class="td-ep-section-title"><i class="ti ti-map-pin"></i> Logística del Partido</p>
 
        <div class="td-ep-row2">
          <div class="input-group">
            <input type="date" id="ep-date" class="input-field" value="${m.date}">
            <label for="ep-date" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Fecha</label>
          </div>
          <div class="input-group">
            <input type="time" id="ep-time" class="input-field" value="${m.time}">
            <label for="ep-time" class="floating-label" style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)">Hora</label>
          </div>
        </div>
 
        <div class="input-group">
          <input type="text" id="ep-venue" class="input-field" value="${m.venue}" placeholder=" ">
          <label for="ep-venue" class="floating-label" style="${m.venue?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Sede / Ubicación</label>
        </div>
 
        <div class="input-group">
          <input type="text" id="ep-referee" class="input-field" value="${m.referee}" placeholder=" ">
          <label for="ep-referee" class="floating-label" style="${m.referee?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Nombre del árbitro</label>
        </div>
 
        <div class="input-group">
          <input type="tel" id="ep-ref-phone" class="input-field" value="${m.refPhone}" placeholder=" ">
          <label for="ep-ref-phone" class="floating-label" style="${m.refPhone?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Contacto del árbitro</label>
        </div>
 
        <div class="td-ep-row2">
          <div class="input-group td-cost-group">
            <span class="td-cost-prefix">$</span>
            <input type="number" id="ep-venue-cost" class="input-field td-cost-input" value="${m.venueCost||''}" min="0" placeholder=" ">
            <label for="ep-venue-cost" class="floating-label" style="${m.venueCost?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Alquiler cancha</label>
          </div>
          <div class="input-group td-cost-group">
            <span class="td-cost-prefix">$</span>
            <input type="number" id="ep-ref-cost" class="input-field td-cost-input" value="${m.refCost||''}" min="0" placeholder=" ">
            <label for="ep-ref-cost" class="floating-label" style="${m.refCost?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Honorario árbitro</label>
          </div>
        </div>
 
        <!-- Total de costos (calculado live) -->
        <div class="td-ep-total" id="ep-total">
          <span>Total estimado del partido:</span>
          <strong id="ep-total-val">$${((m.venueCost||0)+(m.refCost||0)).toLocaleString('es-UY')}</strong>
        </div>
      </div>
 
      <!-- ─ SECCIÓN 2: RESULTADO ─ -->
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
            <span class="td-ep-score-name">${homeLabel}</span>
            <input type="number" id="ep-home-score" class="td-score-input" value="${m.homeScore??''}" min="0">
          </div>
          <span class="td-ep-score-dash">—</span>
          <div class="td-ep-score-team">
            <input type="number" id="ep-away-score" class="td-score-input" value="${m.awayScore??''}" min="0">
            <span class="td-ep-score-name">${awayLabel}</span>
            <span class="td-team-emoji">${m.away?tdEmoji(m.away):'🏆'}</span>
          </div>
        </div>
      </div>
 
      <!-- ─ NOTAS ─ -->
      <div class="td-ep-section">
        <div class="input-group">
          <textarea id="ep-notes" class="input-field" rows="2" placeholder=" " style="min-height:72px;padding-top:16px;resize:none">${m.notes||''}</textarea>
          <label for="ep-notes" class="floating-label" style="${m.notes?'top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)':''}">Notas adicionales (opcional)</label>
        </div>
      </div>
 
      <!-- Acciones -->
      <div class="td-ep-actions">
        <button class="td-btn-ghost" onclick="tdCloseMatchEdit()">Cancelar</button>
        <button class="td-btn-primary" onclick="tdSaveMatch()"><i class="ti ti-device-floppy"></i> Guardar cambios</button>
      </div>`;
 
    // Mostrar total en vivo
    ['ep-venue-cost','ep-ref-cost'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            const vc = parseFloat(document.getElementById('ep-venue-cost')?.value)||0;
            const rc = parseFloat(document.getElementById('ep-ref-cost')?.value)||0;
            const total = document.getElementById('ep-total-val');
            if (total) total.textContent = `$${(vc+rc).toLocaleString('es-UY')}`;
        });
    });
 
    // Toggle fila de resultado
    document.getElementById('ep-played')?.addEventListener('change', e => {
        document.getElementById('ep-score-row').style.display = e.target.checked ? '' : 'none';
    });
 
    // Abrir panel con animación
    panel.classList.add('open');
    panel.setAttribute('aria-hidden','false');
    document.getElementById('td-cal-layout')?.classList.add('panel-open');
    // Focus al primer campo
    setTimeout(() => document.getElementById('ep-date')?.focus(), 320);
}
 
// ── Cerrar panel ──────────────────────────────────────────────────────
window.tdCloseMatchEdit = function() {
    const panel = document.getElementById('td-edit-panel');
    panel?.classList.remove('open');
    panel?.setAttribute('aria-hidden','true');
    document.getElementById('td-cal-layout')?.classList.remove('panel-open');
    tdCurrentEditId = null;
};
 
// ── Guardar partido ───────────────────────────────────────────────────
window.tdSaveMatch = function() {
    const m = tdData.matches.find(x=>x.id===tdCurrentEditId);
    if (!m) return;
 
    m.date      = document.getElementById('ep-date')?.value      || m.date;
    m.time      = document.getElementById('ep-time')?.value      || m.time;
    m.venue     = document.getElementById('ep-venue')?.value.trim()    || '';
    m.referee   = document.getElementById('ep-referee')?.value.trim()  || '';
    m.refPhone  = document.getElementById('ep-ref-phone')?.value.trim()|| '';
    m.venueCost = parseFloat(document.getElementById('ep-venue-cost')?.value) || 0;
    m.refCost   = parseFloat(document.getElementById('ep-ref-cost')?.value)   || 0;
    m.notes     = document.getElementById('ep-notes')?.value.trim() || '';
    m.played    = document.getElementById('ep-played')?.checked ?? m.played;
    if (m.played) {
        m.homeScore = parseInt(document.getElementById('ep-home-score')?.value) ?? null;
        m.awayScore = parseInt(document.getElementById('ep-away-score')?.value) ?? null;
    }
 
    tdCloseMatchEdit();
    tdRenderCalendario();   // re-render para reflejar cambios
    tdShowToast('Partido actualizado ✓');
};
 
// Cerrar panel con Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && tdCurrentEditId !== null) tdCloseMatchEdit();
});
 
// ── Init ──────────────────────────────────────────────────────────────
tdShowSection('overview');
 
} // end if (tdDashboard)