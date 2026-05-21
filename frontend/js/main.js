const paragraph = document.querySelector('.info-paragraph');

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            paragraph.classList.add('animate');
            observer.unobserve(paragraph);
        } 
    });
} , {
    threshold: 0.1
});

observer.observe(paragraph);

const observerCompetika = new IntersectionObserver((entries) => {
    entries.forEach((entry)=>{
        if(entry.isIntersecting) {
            console.log(entry.target)
            entry.target.classList.add('show')
        } else {
            entry.target.classList.remove('show')
        }
    })
}, {
    threshold: 0.1
})

const competika = document.querySelector('.info-h1');

if (competika) {
    observerCompetika.observe(competika);
}

const observerBackground = new IntersectionObserver((entries) => {
    entries.forEach((entry)=>{
        if(entry.isIntersecting) {
            entry.target.classList.add('animate')
        } else {
            entry.target.classList.remove('animate')
        }
    })
}, {
    threshold: 0.1
})

// -- Datos de las tarjetas de deportes -----------------------------------
// Cada objeto tiene: title (nombre del deporte), icon (Libreria Tabler Icons),
// paragraph (el texto que se mostrará debajo del título)
const cardData = [
    { title: "Fútbol",           icon: "ti-ball-football",   paragraph: "INFO FUT" },
    { title: "Basketball",       icon: "ti-ball-basketball",  paragraph: "INFO BASKET" },
    { title: "Tenis",            icon: "ti-ball-tennis",      paragraph: "INFO TENIS" },
    { title: "Ajedrez",          icon: "ti-chess",            paragraph: "INFO AJEDREZ" },
    { title: "Juegos de cartas", icon: "ti-cards",            paragraph: "INFO CARTAS" },
    { title: "Videojuegos",      icon: "ti-device-gamepad-2", paragraph: "INFO VIDEOJUEGOS" },
    { title: "Volleyball",       icon: "ti-ball-volleyball",  paragraph: "INFO VOLLEY" },
    { title: "Natación",         icon: "ti-swimming",         paragraph: "INFO NATACIÓN" },
    { title: "Rugby",            icon: "ti-ball-rugby",       paragraph: "INFO RUGBY" },
    { title: "Baseball",         icon: "ti-ball-baseball",    paragraph: "INFO BASEBALL" },
    { title: "Running",          icon: "ti-run",              paragraph: "INFO RUNNING" },
    { title: "Artes marciales",  icon: "ti-martial-arts",     paragraph: "INFO ARTES MARCIALES" },
    { title: "Boxeo",            icon: "ti-boxing",           paragraph: "INFO BOXEO" },
    { title: "Gimnasia",         icon: "ti-gymnastics",       paragraph: "INFO GIMNASIA" },
    { title: "Otros",            icon: "ti-dots-circle-horizontal", paragraph: "INFO OTROS" },
];

// ── Estado ────────────────────────────────────────────────────────────────
const TOTAL = cardData.length;
let current = 0;
let isAnimating = false;

// ── Referencias DOM ───────────────────────────────────────────────────────
const stage  = document.getElementById('stage');
const dotsEl = document.getElementById('dots');

// ── Crear tarjetas ────────────────────────────────────────────────────────
const cards = cardData.map((d, i) => {
    const el = document.createElement('div');
    el.className = 'sport-card';

    el.innerHTML = `
    <i class="ti ${d.icon} card-icon" aria-hidden="true"></i>
    <h3 class="sport-h1">${d.title}</h3>
    <p class="sport-paragraph">${d.paragraph}</p>
    `;

  // Click sobre tarjetas laterales para navegar hacia ellas
    el.addEventListener('click', () => {
    const pos = getPos(i);
    if (pos === 1)       navigate(1);
    else if (pos === -1) navigate(-1);
    else if (pos === 2)  { navigate(1); setTimeout(() => navigate(1), 520); }
    else if (pos === -2) { navigate(-1); setTimeout(() => navigate(-1), 520); }
});
    stage.appendChild(el);
    return el;
});

// ── Crear dots ────────────────────────────────────────────────────────────
const dots = cardData.map((_, i) => {
    const d = document.createElement('div');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => {
    if (i !== current && !isAnimating) goTo(i);
});
    dotsEl.appendChild(d);
    return d;
});

// ── Helpers ───────────────────────────────────────────────────────────────

/** Distancia relativa de una tarjeta al centro (con wrap circular) */
function getPos(cardIndex) {
    let diff = cardIndex - current;
    if (diff >  TOTAL / 2) diff -= TOTAL;
    if (diff < -TOTAL / 2) diff += TOTAL;
    return diff;
}

/** Convierte distancia numérica en valor para data-pos */
function posAttr(diff) {
    if (diff === 0)  return '0';
    if (diff === 1)  return '1';
    if (diff === -1) return '-1';
    if (diff === 2)  return '2';
    if (diff === -2) return '-2';
    return diff > 0 ? 'hidden-right' : 'hidden-left';
}

/** Aplica posiciones a todas las tarjetas y actualiza dots */
function render() {
    cards.forEach((el, i) => {
        el.setAttribute('data-pos', posAttr(getPos(i)));
});
    dots.forEach((d, i) => {
        d.classList.toggle('active', i === current);
});
}

/** Avanza o retrocede un paso */
function navigate(dir) {
    if (isAnimating) return;
    isAnimating = true;
    current = (current + dir + TOTAL) % TOTAL;
    render();
    setTimeout(() => { isAnimating = false; }, 520);
}

/** Va directamente a una tarjeta pasando por las intermedias */
function goTo(target) {
    if (isAnimating) return;
    let diff = target - current;
    if (diff >  TOTAL / 2) diff -= TOTAL;
    if (diff < -TOTAL / 2) diff += TOTAL;
    const step = diff > 0 ? 1 : -1;
    let steps = Math.abs(diff);

function doStep() {
    if (steps === 0) return;
    navigate(step);
    steps--;
    if (steps > 0) setTimeout(doStep, 530);
}
    doStep();
}

// ── Botones ───────────────────────────────────────────────────────────────
document.getElementById('prev').addEventListener('click', () => navigate(-1));
document.getElementById('next').addEventListener('click', () => navigate(1));

// ── Teclado ───────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
});

// ── Swipe táctil ──────────────────────────────────────────────────────────
let touchStartX = 0;
stage.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
}, { passive: true });

stage.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) navigate(dx < 0 ? 1 : -1);
}, { passive: true });

// ── Render inicial ────────────────────────────────────────────────────────
render();
