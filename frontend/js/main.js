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
        icon: 'ti-list-details',
        subtipos: [
            {
                title: 'LIGA TODOS VS TODOS',
                subtitle: 'Round Robin Simple',
                description: 'Cada participante enfrenta a todos los demás exactamente una vez. El campeón se determina por puntos acumulados al finalizar todas las fechas. Ideal para torneos donde se busca el rendimiento constante a lo largo del tiempo.',
                attributes: ['Todos juegan contra todos', 'Clasificación por puntos acumulados', 'Sin eliminación directa', 'Alta cantidad de partidos garantizados'],
                sports: ['ti-ball-football', 'ti-ball-basketball', 'ti-ball-volleyball', 'ti-swimming', 'ti-run'],
            },
            {
                title: 'LIGA DOBLE VUELTA',
                subtitle: 'Round Robin Doble',
                description: 'Cada participante enfrenta a todos los demás dos veces: una como local y otra como visitante. Formato muy usado en ligas profesionales para mayor equidad y emoción a lo largo de la temporada.',
                attributes: ['Dos rondas completas por equipo', 'Local y visitante por turno', 'Doble cantidad de partidos', 'Formato estándar de ligas profesionales'],
                sports: ['ti-ball-football', 'ti-ball-basketball', 'ti-ball-volleyball', 'ti-ball-american-football', 'ti-ball-baseball'],
            },
        ],
    },
    {
        icon: 'ti-x',
        subtipos: [
            {
                title: 'ELIMINACIÓN SIMPLE',
                subtitle: 'Single Elimination',
                description: 'El perdedor queda fuera y el ganador avanza. Un único partido decide el destino de cada equipo. Formato veloz, tenso y muy popular en competiciones de todos los niveles.',
                attributes: ['Rondas sucesivas de eliminación', 'Perdedor queda eliminado', 'Ganador avanza a siguiente ronda', 'Máxima emoción por partido'],
                sports: ['ti-ball-volleyball', 'ti-ball-american-football', 'ti-ball-basketball', 'ti-ball-tennis', 'ti-chess'],
            },
            {
                title: 'DOBLE ELIMINACIÓN',
                subtitle: 'Double Elimination',
                description: 'Cada participante puede perder una vez y seguir en competencia a través del bracket de perdedores. Solo la segunda derrota significa la eliminación definitiva.',
                attributes: ['Bracket ganadores y perdedores', 'Segunda oportunidad tras una derrota', 'Mayor cantidad de partidos', 'Popular en esports y ajedrez'],
                sports: ['ti-device-gamepad-2', 'ti-chess', 'ti-cards', 'ti-ball-tennis', 'ti-karate'],
            },
        ],
    },
    {
        icon: 'ti-exposure-plus-1',
        subtipos: [
            {
                title: 'SISTEMA DE PUNTOS',
                subtitle: 'Points System',
                description: 'Los participantes acumulan puntos a lo largo de varias pruebas o fechas. La clasificación final refleja el desempeño global, no un único resultado. Muy usado en deportes individuales y competencias por etapas.',
                attributes: ['Acumulación de puntos por fecha', 'Ranking global actualizable', 'Sin eliminación por resultado único', 'Ideal para deportes individuales'],
                sports: ['ti-run', 'ti-swimming', 'ti-gymnastics', 'ti-ball-tennis', 'ti-bell-school'],
            },
            {
                title: 'VIDAS / CONTINUACIONES',
                subtitle: 'Lives System',
                description: 'Cada participante comienza con un número fijo de vidas o intentos. Al agotar sus vidas, queda eliminado. Muy popular en torneos de videojuegos y competencias arcade.',
                attributes: ['Número fijo de vidas por jugador', 'Eliminación al agotar vidas', 'Alta interacción entre participantes', 'Popular en esports y gaming'],
                sports: ['ti-device-gamepad-2', 'ti-cards', 'ti-chess', 'ti-ball-tennis', 'ti-karate'],
            },
        ],
    },
    {
        icon: 'ti-arrows-shuffle',
        subtipos: [
            {
                title: 'SISTEMA SUIZO',
                subtitle: 'Swiss System',
                description: 'Los participantes se enfrentan a rivales con puntaje similar en cada ronda, sin que nadie quede eliminado temprano. Equilibra el nivel de los cruces automáticamente a lo largo del torneo.',
                attributes: ['Cruces por puntaje similar', 'Nadie es eliminado prematuramente', 'Número fijo de rondas', 'Muy usado en ajedrez y TCG'],
                sports: ['ti-chess', 'ti-cards', 'ti-device-gamepad-2', 'ti-ball-tennis', 'ti-karate'],
            },
            {
                title: 'GRUPOS + ELIMINACIÓN',
                subtitle: 'Group Stage + Knockout',
                description: 'Fase de grupos donde todos compiten entre sí, seguida de una eliminación directa entre los clasificados. El estándar de grandes torneos internacionales.',
                attributes: ['Fase de grupos inicial', 'Clasificados pasan a eliminatoria', 'Alta cantidad de partidos garantizados', 'Formato de Mundiales y Olimpiadas'],
                sports: ['ti-ball-football', 'ti-ball-basketball', 'ti-ball-volleyball', 'ti-ball-american-football', 'ti-swimming'],
            },
        ],
    },
    {
        icon: 'ti-trophy',
        subtipos: [
            {
                title: 'TORNEO RELÁMPAGO',
                subtitle: 'Blitz / Flash Tournament',
                description: 'Todas las fases se juegan en un solo día o jornada. Ideal para eventos presenciales, torneos sociales o cuando el tiempo disponible es limitado.',
                attributes: ['Todo en una sola jornada', 'Rondas más cortas', 'Alta energía y ritmo rápido', 'Ideal para eventos sociales'],
                sports: ['ti-chess', 'ti-cards', 'ti-device-gamepad-2', 'ti-bell-school', 'ti-ball-tennis'],
            },
            {
                title: 'GRAN PREMIO',
                subtitle: 'Grand Prix / Season',
                description: 'Serie de torneos a lo largo de una temporada donde los puntos se acumulan. Al final, el participante con más puntos totales es coronado campeón.',
                attributes: ['Serie de torneos en temporada', 'Puntos acumulativos por evento', 'Clasificación anual o semestral', 'Formato de F1 y grandes ligas'],
                sports: ['ti-run', 'ti-swimming', 'ti-ball-tennis', 'ti-gymnastics', 'ti-ball-baseball'],
            },
            {
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
const sportNames = {
    'ti-ball-football':         'Fútbol',
    'ti-ball-basketball':       'Basketball',
    'ti-ball-volleyball':       'Volleyball',
    'ti-ball-tennis':           'Tenis',
    'ti-ball-american-football':'Futbol americano',
    'ti-ball-baseball':         'Baseball',
    'ti-chess':                 'Ajedrez',
    'ti-cards':                 'Cartas',
    'ti-device-gamepad-2':      'Videojuegos',
    'ti-swimming':              'Natación',
    'ti-run':                   'Running',
    'ti-karate':                'Artes marciales',
    'ti-bell-school':           'Boxeo',
    'ti-gymnastics':            'Gimnasia',
};

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
    // Deportes con animación pop
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

// ── Render completo con animación texto ───────────────────────────────────────
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



