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

// ── Actualiza el contenido sin animación de salida ────────────────────────────
function ttUpdateContent(sub) {
    if (ttTitle)        ttTitle.textContent       = sub.title;
    if (ttSubtitleEl)   ttSubtitleEl.textContent  = sub.subtitle;
    if (ttDescriptionEl) ttDescriptionEl.textContent = sub.description;
    // Atributos — recrear nodos para re-disparar la animación CSS
    if (ttAttrList) {
        ttAttrList.innerHTML = sub.attributes
            .map(a => `<li class="attribute-item"><i class="ti ti-chevron-right"></i>${a}</li>`)
            .join('');
    }

    if (ttSportsIcons) {
        ttSportsIcons.classList.remove('tt-sports-anim');
        void ttSportsIcons.offsetWidth; // reflow fuerza re-inicio de animación
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
// TOURNAMENT FORM — wizard de creación de torneo
// =====================================================================
 
const tfForm = document.getElementById('tf-form');
 
if (tfForm) {
 
    // ── Diagramas de estructura ──────
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
 
    // ── Paso 1 ───
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
 
    // ── Paso 2 ─────────
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
