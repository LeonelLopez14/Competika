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

// ── Título principal (slide-in desde derecha) ──────────────────────────────
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
                // Fade-in del contenedor
                entry.target.classList.add('show');

                // Animar bloques del podio con stagger ya definido en CSS
                document.querySelectorAll('.podium-block').forEach(b => b.classList.add('animated'));

                // Animar líneas de descripción
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

const TOTAL       = cardData.length;
let   current     = 0;
let   isAnimating = false;

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

// ── Banner fade-in ──────────────────────────────────────────────────────────
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
