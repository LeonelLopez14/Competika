/* =====================================================
   COMPETIKA — profile.js
   Lógica de la sección "Mi Perfil"
   ===================================================== */

const PF_USER_KEY = 'competika_user';

/* ── Aplica los datos guardados en profile_configuration (si existen) ── */
function pfApplyStoredUser() {
    let user;
    try { user = JSON.parse(localStorage.getItem(PF_USER_KEY) || 'null'); } catch (e) { user = null; }
    if (!user) return;

    if (user.fullname) {
        document.querySelectorAll('.pf-name, .nud-name').forEach(el => el.textContent = user.fullname);
    }
    if (user.email) {
        document.querySelectorAll('.pf-email, .nud-email').forEach(el => el.textContent = user.email);
    }
    if (user.bio) {
        const bioEl = document.querySelector('.pf-bio');
        if (bioEl) bioEl.textContent = user.bio;
    }
    if (user.avatar) {
        document.querySelectorAll('.pf-avatar, .nav-avatar-img').forEach(el => el.src = user.avatar);
    }
    if (user.roles) {
        const organizadorPill = document.querySelector('.pf-role--organizador');
        const participantePill = document.querySelector('.pf-role--participante');
        if (organizadorPill) organizadorPill.style.display = user.roles.organizador ? '' : 'none';
        if (participantePill) participantePill.style.display = user.roles.participante ? '' : 'none';
    }
}


/* ── Datos de ejemplo (en un backend real vendrían de la API) ── */
const pfTournaments = [
    {
        icon: 'ti-ball-football', iconBg: 'rgba(59,130,246,0.12)', iconColor: '#1d4ed8',
        name: 'Copa Regional Fútbol 2026', status: 'curso',
        dateRange: 'Jul 5 – Ago 10, 2026', teams: '16 equipos', prize: '€500',
        role: 'participante', location: 'Estadio'
    },
    {
        icon: 'ti-ball-basketball', iconBg: 'rgba(245,158,11,0.14)', iconColor: '#b45309',
        name: 'Liga Municipal Baloncesto', status: 'curso',
        dateRange: 'Jun 20 – Jul 30, 2026', teams: '8 equipos', prize: '€300',
        role: 'organizador', location: 'Pabellón'
    },
    {
        icon: 'ti-ball-tennis', iconBg: 'rgba(67,197,158,0.16)', iconColor: '#1a9a72',
        name: 'Torneo Tenis Verano', status: 'curso',
        dateRange: 'Jul 15 – Jul 28, 2026', teams: '32 equipos', prize: '€200',
        role: 'participante', location: 'Club'
    },
    {
        icon: 'ti-ball-tennis', iconBg: 'rgba(224,81,122,0.14)', iconColor: '#b3315a',
        name: 'Torneo Pádel Pro', status: 'proximo',
        dateRange: 'Jul 28 – Ago 5, 2026', teams: '24 equipos', prize: '€400',
        role: 'participante', location: 'Club'
    }
];

const pfAchievements = [
    { icon: 'ti-trophy', bg: 'rgba(245,158,11,0.14)', color: '#b45309', title: 'Campeón Regional', sub: 'Tenis 2024' },
    { icon: 'ti-star',   bg: 'rgba(95,31,197,0.1)',   color: 'var(--blue-violet-dark)', title: 'MVP', sub: 'Torneo Nacional' },
    { icon: 'ti-medal',  bg: 'rgba(67,197,158,0.15)', color: '#1a9a72', title: 'Organizador Elite', sub: '+10 torneos' },
    { icon: 'ti-flame',  bg: 'rgba(239,68,68,0.12)',  color: '#c2410c', title: '50 Torneos', sub: 'Milestone' },
    { icon: 'ti-crown',  bg: 'rgba(245,158,11,0.14)', color: '#b45309', title: 'Top Jugador', sub: '2025' },
    { icon: 'ti-target', bg: 'rgba(224,81,122,0.14)', color: '#b3315a', title: 'Precisión', sub: '90% victorias' }
];

const pfFavSports = [
    { icon: 'ti-ball-football',   name: 'Fútbol',     count: 34, max: 34 },
    { icon: 'ti-ball-basketball', name: 'Basketball', count: 22, max: 34 },
    { icon: 'ti-ball-tennis',    name: 'Tenis',       count: 18, max: 34 },
    { icon: 'ti-ball-tennis',    name: 'Pádel',       count: 12, max: 34 },
    { icon: 'ti-swimming',       name: 'Natación',    count: 8,  max: 34 },
    { icon: 'ti-ball-volleyball',name: 'Volleyball',  count: 6,  max: 34 }
];

const pfMatchHistory = [
    { id: 'm1', fecha: '14 Jul 2026', torneo: 'Copa Regional Fútbol', icon: 'ti-ball-football', rival: 'FC Norte', resultado: 'win',  marcador: '3-1' },
    { id: 'm2', fecha: '10 Jul 2026', torneo: 'Liga Baloncesto',      icon: 'ti-ball-basketball', rival: 'Eagles', resultado: 'loss', marcador: '72-80' },
    { id: 'm3', fecha: '6 Jul 2026',  torneo: 'Torneo Tenis',          icon: 'ti-ball-tennis', rival: 'Carlos V.', resultado: 'win',  marcador: '6-4, 6-3' },
    { id: 'm4', fecha: '1 Jul 2026',  torneo: 'Copa Regional Fútbol',  icon: 'ti-ball-football', rival: 'Real Oeste', resultado: 'win', marcador: '2-0' },
    { id: 'm5', fecha: '25 Jun 2026', torneo: 'Liga Baloncesto',       icon: 'ti-ball-basketball', rival: 'Wolves', resultado: 'win', marcador: '88-75' },
    { id: 'm6', fecha: '20 Jun 2026', torneo: 'Pádel Open',            icon: 'ti-ball-tennis', rival: 'Dupla García', resultado: 'loss', marcador: '4-6, 3-6' }
];

const pfTournamentHistory = [
    { nombre: 'Copa Nacional de Verano 2025', deporte: 'Fútbol', icon: 'ti-ball-football', rol: 'Participante', fechas: '10 Ene – 20 Feb 2025', resultado: 'Campeón', tipo: 'campeon' },
    { nombre: 'Liga Amateur Basket 2025', deporte: 'Basketball', icon: 'ti-ball-basketball', rol: 'Organizador', fechas: '5 Mar – 30 Abr 2025', resultado: 'Finalizado', tipo: 'finalizado' },
    { nombre: 'Abierto de Tenis Ciudad', deporte: 'Tenis', icon: 'ti-ball-tennis', rol: 'Participante', fechas: '12 May – 18 May 2025', resultado: 'Semifinalista', tipo: 'semifinal' },
    { nombre: 'Torneo Ajedrez Rápido', deporte: 'Ajedrez', icon: 'ti-chess', rol: 'Juez', fechas: '3 Jun 2025', resultado: 'Finalizado', tipo: 'finalizado' },
    { nombre: 'Copa Interbarrial Vóley', deporte: 'Volleyball', icon: 'ti-ball-volleyball', rol: 'Participante', fechas: '1 Jul – 15 Jul 2025', resultado: '3er puesto', tipo: 'puesto' }
];

const pfStats = [
    { icon: 'ti-trending-up', value: '4 victorias', caption: 'Racha actual', variant: 'green' },
    { icon: 'ti-trophy',      value: '3',            caption: 'Títulos ganados', variant: 'yellow' },
    { icon: 'ti-star',        value: '#12 Nacional', caption: 'Mejor ranking', variant: 'blue' },
    { icon: 'ti-heart-handshake', value: '128',      caption: 'Honor recibido', variant: 'violet' },
    { icon: 'ti-check',       value: '67',           caption: 'Victorias', variant: 'green' },
    { icon: 'ti-x',           value: '33',           caption: 'Derrotas', variant: 'red' },
    { icon: 'ti-minus',       value: '0',            caption: 'Empates', variant: 'gray' },
    { icon: 'ti-users',       value: '48',           caption: 'Rivales únicos', variant: 'blue' }
];

/* ── Eventos del calendario (Julio 2026) ──
   type: partido | semifinal | final                              */
const pfCalendarEvents = {
    5:  { type: 'partido',   torneo: 'Copa Regional Fútbol', rival: 'Estudiantes',   hora: '10:00 h', lugar: 'Estadio Sur',            costo: 'Gratis' },
    12: { type: 'partido',   torneo: 'Liga Municipal Baloncesto', rival: 'Halcones', hora: '18:00 h', lugar: 'Pabellón Central',       costo: '€5' },
    15: { type: 'semifinal', torneo: 'Torneo Tenis Verano', rival: 'Marcos L.',      hora: '09:30 h', lugar: 'Club de Tenis',          costo: '€10' },
    19: { type: 'partido',   torneo: 'Copa Regional Fútbol', rival: 'Atlético Sur',  hora: '09:00 h', lugar: 'Estadio Municipal Norte', costo: '€15' },
    22: { type: 'semifinal', torneo: 'Liga Municipal Baloncesto', rival: 'Águilas',  hora: '19:00 h', lugar: 'Pabellón Norte',         costo: '€5' },
    25: { type: 'final',     torneo: 'Torneo Tenis Verano', rival: 'Lucía R.',       hora: '10:00 h', lugar: 'Club de Tenis',          costo: '€10' },
    28: { type: 'partido',   torneo: 'Torneo Pádel Pro',    rival: 'Por definir',    hora: '16:00 h', lugar: 'Club Pádel Este',        costo: '€20' }
};

const pfMonthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const pfDowNames = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

let pfCalYear = 2026;
let pfCalMonth = 6; // Julio (0-indexed)

/* ── Render: Torneos activos ── */
function pfRenderTournaments() {
    const list = document.getElementById('pf-tournaments-list');
    if (!list) return;
    list.innerHTML = pfTournaments.map(t => `
        <div class="pf-tournament-item">
            <div class="pf-t-icon" style="background:${t.iconBg};color:${t.iconColor};">
                <i class="ti ${t.icon}"></i>
            </div>
            <div class="pf-t-body">
                <div class="pf-t-top">
                    <span class="pf-t-name">${t.name}</span>
                    <span class="pf-status-pill pf-status-pill--${t.status === 'curso' ? 'curso' : 'proximo'}">${t.status === 'curso' ? 'En curso' : 'Próximo'}</span>
                </div>
                <div class="pf-t-meta">
                    <span><i class="ti ti-calendar"></i>${t.dateRange}</span>
                    <span><i class="ti ti-users"></i>${t.teams}</span>
                    <span><i class="ti ti-trophy"></i>${t.prize}</span>
                </div>
            </div>
            <div class="pf-t-side">
                <span class="pf-role-pill pf-role-pill--${t.role}">${t.role === 'organizador' ? 'Organizador' : 'Participante'}</span>
                <span class="pf-t-location"><i class="ti ti-map-pin"></i>${t.location}</span>
            </div>
        </div>
    `).join('');
}

/* ── Render: Logros ── */
function pfRenderAchievements() {
    const grid = document.getElementById('pf-achievements-grid');
    if (!grid) return;
    grid.innerHTML = pfAchievements.map(a => `
        <div class="pf-badge">
            <div class="pf-badge-icon" style="background:${a.bg};color:${a.color};">
                <i class="ti ${a.icon}"></i>
            </div>
            <span class="pf-badge-title">${a.title}</span>
            <span class="pf-badge-sub">${a.sub}</span>
        </div>
    `).join('');
}

/* ── Render: Deportes favoritos ── */
function pfRenderFavSports() {
    const list = document.getElementById('pf-sports-list');
    if (!list) return;
    list.innerHTML = pfFavSports.map(s => `
        <div class="pf-sport-row">
            <div class="pf-sport-top">
                <span class="pf-sport-name"><i class="ti ${s.icon}"></i>${s.name}</span>
                <span class="pf-sport-count">${s.count} partidos</span>
            </div>
            <div class="pf-sport-bar-bg"><div class="pf-sport-bar-fill" style="width:${Math.round((s.count / s.max) * 100)}%"></div></div>
        </div>
    `).join('');
}

const PF_HONORS_KEY = 'competika_honors_given';

function pfGetHonorsGiven() {
    try { return JSON.parse(localStorage.getItem(PF_HONORS_KEY) || '[]'); } catch (e) { return []; }
}

function pfUpdateHonorCounter() {
    const counterEl = document.getElementById('pf-honor-given-count');
    if (counterEl) counterEl.textContent = pfGetHonorsGiven().length;
}

/* ── Render: Historial de partidos ── */
function pfRenderMatchHistory() {
    const tbody = document.getElementById('pf-match-history-body');
    if (!tbody) return;
    const honored = pfGetHonorsGiven();

    tbody.innerHTML = pfMatchHistory.map(m => {
        const given = honored.includes(m.id);
        return `
        <tr>
            <td>${m.fecha}</td>
            <td><i class="ti ${m.icon}" style="color:var(--blue-violet-dark);margin-right:6px;"></i>${m.torneo}</td>
            <td>${m.rival}</td>
            <td><span class="pf-result-pill pf-result-pill--${m.resultado}"><i class="ti ${m.resultado === 'win' ? 'ti-circle-check' : 'ti-circle-x'}"></i>${m.resultado === 'win' ? 'Victoria' : 'Derrota'}</span></td>
            <td>${m.marcador}</td>
            <td>
                <button class="pf-honor-btn ${given ? 'pf-honor-btn--given' : ''}" data-match-id="${m.id}" ${given ? 'disabled' : ''}>
                    <i class="ti ${given ? 'ti-heart-filled' : 'ti-heart-handshake'}"></i>${given ? 'Enviado' : 'Dar honor'}
                </button>
            </td>
        </tr>`;
    }).join('');

    pfUpdateHonorCounter();

    tbody.querySelectorAll('.pf-honor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const matchId = btn.dataset.matchId;
            const honors = pfGetHonorsGiven();
            if (honors.includes(matchId)) return;
            honors.push(matchId);
            localStorage.setItem(PF_HONORS_KEY, JSON.stringify(honors));
            btn.classList.add('pf-honor-btn--given');
            btn.disabled = true;
            btn.innerHTML = '<i class="ti ti-heart-filled"></i>Enviado';
            pfUpdateHonorCounter();
        });
    });
}

/* ── Render: Historial de torneos ── */
function pfRenderTournamentHistory() {
    const tbody = document.getElementById('pf-tournament-history-body');
    if (!tbody) return;
    tbody.innerHTML = pfTournamentHistory.map(t => `
        <tr>
            <td><i class="ti ${t.icon}" style="color:var(--blue-violet-dark);margin-right:6px;"></i>${t.nombre}</td>
            <td>${t.deporte}</td>
            <td>${t.rol}</td>
            <td>${t.fechas}</td>
            <td><span class="pf-tournament-result-badge pf-tr--${t.tipo}">${t.resultado}</span></td>
        </tr>
    `).join('');
}

/* ── Render: Estadísticas ── */
function pfRenderStats() {
    const grid = document.getElementById('pf-stats-grid');
    if (!grid) return;
    grid.innerHTML = pfStats.map(s => `
        <div class="pf-stat-card pf-stat-card--${s.variant}">
            <i class="ti ${s.icon}"></i>
            <span class="pf-stat-value">${s.value}</span>
            <span class="pf-stat-caption">${s.caption}</span>
        </div>
    `).join('');
}

/* ── Calendario ── */
function pfRenderCalendar() {
    const grid  = document.getElementById('pf-cal-grid');
    const title = document.getElementById('pf-cal-title');
    if (!grid || !title) return;

    title.textContent = `${pfMonthNames[pfCalMonth]} ${pfCalYear}`;

    const firstDay = new Date(pfCalYear, pfCalMonth, 1);
    // Lunes = 0 ... Domingo = 6
    let startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(pfCalYear, pfCalMonth + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === pfCalYear && today.getMonth() === pfCalMonth;

    let html = pfDowNames.map(d => `<div class="pf-cal-dow">${d}</div>`).join('');

    for (let i = 0; i < startOffset; i++) {
        html += `<div class="pf-cal-day pf-cal-day--empty"></div>`;
    }

    const showEvents = pfCalMonth === 6 && pfCalYear === 2026; // eventos de ejemplo son para Julio 2026

    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = isCurrentMonth && today.getDate() === day;
        const ev = showEvents ? pfCalendarEvents[day] : null;
        const classes = ['pf-cal-day'];
        if (ev) classes.push('pf-cal-day--has-event');
        if (isToday) classes.push('pf-cal-day--today');

        const dot = ev ? `<span class="pf-cal-dot pf-cal-dot--${ev.type}"></span>` : '';
        html += `<div class="${classes.join(' ')}" ${ev ? `data-day="${day}" tabindex="0" role="button" aria-label="Ver evento del día ${day}"` : ''}>${day}${dot}</div>`;
    }

    grid.innerHTML = html;

    // Resumen de eventos del mes
    const summary = document.getElementById('pf-cal-summary-count');
    if (summary) {
        const count = showEvents ? Object.keys(pfCalendarEvents).length : 0;
        summary.textContent = `${count} evento${count !== 1 ? 's' : ''} programado${count !== 1 ? 's' : ''}`;
    }

    // Click / teclado en días con evento
    grid.querySelectorAll('.pf-cal-day--has-event').forEach(dayEl => {
        dayEl.addEventListener('click', () => pfOpenDayPopover(dayEl));
        dayEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pfOpenDayPopover(dayEl); }
        });
    });
}

function pfOpenDayPopover(dayEl) {
    const popover = document.getElementById('pf-day-popover');
    if (!popover) return;
    const day = parseInt(dayEl.dataset.day, 10);
    const ev = pfCalendarEvents[day];
    if (!ev) return;

    const typeLabels = { partido: 'Partido', semifinal: 'Semifinal', final: 'Final' };

    popover.innerHTML = `
        <button class="pf-popover-close" aria-label="Cerrar"><i class="ti ti-x"></i></button>
        <span class="pf-popover-badge pf-popover-badge--${ev.type}">${typeLabels[ev.type]}</span>
        <div class="pf-popover-title">${ev.torneo}</div>
        <div class="pf-popover-rival"><i class="ti ti-swords"></i>vs ${ev.rival}</div>
        <div class="pf-popover-details">
            <div class="pf-popover-row"><i class="ti ti-calendar"></i>Julio ${day}, ${pfCalYear}</div>
            <div class="pf-popover-row"><i class="ti ti-clock"></i>${ev.hora}</div>
            <div class="pf-popover-row"><i class="ti ti-map-pin"></i>${ev.lugar}</div>
            <div class="pf-popover-row"><i class="ti ti-currency-euro"></i>Costo de participación: ${ev.costo}</div>
        </div>
    `;

    // Posicionar el popover cerca del día clickeado
    const calendarBox = document.getElementById('pf-calendar-box');
    const dayRect = dayEl.getBoundingClientRect();
    const boxRect = calendarBox.getBoundingClientRect();
    const popoverWidth = popover.offsetWidth || 260;
    let top = dayRect.bottom - boxRect.top + 8;
    let left = dayRect.left - boxRect.left + (dayRect.width / 2) - (popoverWidth / 2);
    left = Math.max(8, Math.min(left, boxRect.width - popoverWidth - 8));
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;

    popover.classList.add('open');
    popover.querySelector('.pf-popover-close').addEventListener('click', () => popover.classList.remove('open'));
}

document.addEventListener('click', (e) => {
    const popover = document.getElementById('pf-day-popover');
    if (!popover || !popover.classList.contains('open')) return;
    if (popover.contains(e.target) || e.target.closest('.pf-cal-day--has-event')) return;
    popover.classList.remove('open');
});

document.getElementById('pf-cal-prev')?.addEventListener('click', () => {
    pfCalMonth--;
    if (pfCalMonth < 0) { pfCalMonth = 11; pfCalYear--; }
    document.getElementById('pf-day-popover')?.classList.remove('open');
    pfRenderCalendar();
});
document.getElementById('pf-cal-next')?.addEventListener('click', () => {
    pfCalMonth++;
    if (pfCalMonth > 11) { pfCalMonth = 0; pfCalYear++; }
    document.getElementById('pf-day-popover')?.classList.remove('open');
    pfRenderCalendar();
});

/* ── Tabs ── */
function pfInitTabs() {
    const buttons = document.querySelectorAll('.pf-tab-btn');
    const panels  = document.querySelectorAll('.pf-tab-panel');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target)?.classList.add('active');
        });
    });
}

/* ── Init general ── */
pfApplyStoredUser();
pfRenderTournaments();
pfRenderAchievements();
pfRenderFavSports();
pfRenderMatchHistory();
pfRenderTournamentHistory();
pfRenderStats();
pfRenderCalendar();
pfInitTabs();