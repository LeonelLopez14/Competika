/* COMPETIKA — profile.js: página de perfil. */
(function () {
const ROOT = window.competikaSiteRoot || '../../..';
const API = ROOT + '/api/profile.php';
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIAS = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

const SPORT = {
    'Fútbol':           ['ti-ball-football',   'rgba(59,130,246,0.12)',  '#1d4ed8'],
    'Basketball':       ['ti-ball-basketball', 'rgba(245,158,11,0.14)',  '#b45309'],
    'Tenis':            ['ti-ball-tennis',     'rgba(67,197,158,0.16)',  '#1a9a72'],
    'Volleyball':       ['ti-ball-volleyball', 'rgba(224,81,122,0.14)',  '#b3315a'],
    'Ajedrez':          ['ti-chess',           'rgba(95,31,197,0.1)',    'var(--blue-violet-dark)'],
    'Natación':         ['ti-swimming',        'rgba(59,130,246,0.12)',  '#1d4ed8'],
    'Rugby':            ['ti-ball-american-football', 'rgba(245,158,11,0.14)', '#b45309'],
    'Baseball':         ['ti-ball-baseball',   'rgba(239,68,68,0.12)',   '#c2410c'],
    'Videojuegos':      ['ti-device-gamepad-2','rgba(95,31,197,0.1)',    'var(--blue-violet-dark)'],
    'Juegos de cartas': ['ti-cards',           'rgba(224,81,122,0.14)',  '#b3315a'],
    'Running':          ['ti-run',             'rgba(67,197,158,0.16)',  '#1a9a72'],
    'Boxeo':            ['ti-karate',          'rgba(239,68,68,0.12)',   '#c2410c'],
    'Artes marciales':  ['ti-karate',          'rgba(239,68,68,0.12)',   '#c2410c'],
    'Gimnasia':         ['ti-stretching',      'rgba(67,197,158,0.16)',  '#1a9a72'],
};
const sportIcon = d => SPORT[d] || ['ti-trophy', 'rgba(95,31,197,0.1)', 'var(--blue-violet-dark)'];

let data = { torneos: [], partidos: [], stats: {} };

function fecha(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MES_CORTO[m - 1]} ${y}`;
}
function rango(a, b) {
    if (!a && !b) return 'Fechas a confirmar';
    if (a && b && a !== b) return `${fecha(a)} – ${fecha(b)}`;
    return fecha(a || b);
}

async function api(action) {
    try {
        const res = await fetch(`${API}?action=${action}`, { credentials: 'same-origin', cache: 'no-store' });
        return await res.json();
    } catch (e) { return { success: false }; }
}

/* ── Identidad ── */
function renderIdentity(u) {
    document.querySelectorAll('.pf-name').forEach(el => el.textContent = `${u.nombre} ${u.apellido}`.trim());
    document.querySelectorAll('.pf-email').forEach(el => el.textContent = u.email);
    const bio = document.querySelector('.pf-bio');
    if (bio) {
        bio.textContent = u.biografia || '';
        if (!u.biografia) bio.innerHTML = '<a href="../profile_configuration/profile_configuration.html" style="color:var(--blue-violet-dark)">Agregá una biografía</a>';
    }
    if (u.foto) document.querySelectorAll('.pf-avatar').forEach(img => img.src = `${ROOT}/${u.foto}`);
    const show = (cls, on) => document.querySelectorAll(cls).forEach(el => el.style.display = on ? '' : 'none');
    show('.pf-role--organizador', u.roles?.organizador);
    show('.pf-role--participante', u.roles?.participante);
    show('.pf-role--juez', u.roles?.juez);
}

function renderTopStats() {
    const s = data.stats;
    $('pf-stat-partidos').textContent = s.partidos ?? 0;
    $('pf-stat-torneos').textContent = (s.organizados ?? 0) + (s.participados ?? 0);
    $('pf-stat-victorias').textContent = s.porcentaje == null ? '—' : `${s.porcentaje}%`;
}

/* ── Torneos activos (no finalizados) ── */
function renderActive() {
    const list = $('pf-tournaments-list');
    if (!list) return;
    const propios = new Set(data.torneos.map(t => t.id));
    const activos = data.torneos.filter(t => t.estado !== 'finalizado')
        .concat((data.seguidos || []).filter(t => t.estado !== 'finalizado' && !propios.has(t.id)));
    if (!activos.length) {
        list.innerHTML = `<p class="pf-empty">No tenés torneos activos. <a href="../tournament_search/tournament_search.html">Buscá un torneo</a> o <a href="../tournament_form/tournament_form.html">creá uno</a>.</p>`;
        return;
    }
    list.innerHTML = activos.map(t => {
        const [icon, bg, color] = sportIcon(t.deporte);
        const curso = t.estado === 'activo';
        const etiqueta = { en_revision: 'En revisión', rechazado: 'Rechazado' }[t.estado] || (curso ? 'En curso' : 'Próximo');
        const link = t.rol === 'organizador' ? `../tournament_dashboard/tournament_dashboard.html?t=${t.id}` : `../tournament_view/tournament_view.html?t=${t.id}`;
        return `
        <a class="pf-tournament-item" href="${link}" style="text-decoration:none;color:inherit">
            <div class="pf-t-icon" style="background:${bg};color:${color};"><i class="ti ${icon}"></i></div>
            <div class="pf-t-body">
                <div class="pf-t-top">
                    <span class="pf-t-name">${esc(t.nombre)}</span>
                    <span class="pf-status-pill pf-status-pill--${curso ? 'curso' : 'proximo'}">${etiqueta}</span>
                </div>
                <div class="pf-t-meta">
                    <span><i class="ti ti-calendar"></i>${esc(rango(t.inicio, t.fin))}</span>
                    <span><i class="ti ti-users"></i>${t.equipos} equipo${t.equipos === 1 ? '' : 's'}</span>
                    ${t.premios ? `<span><i class="ti ti-trophy"></i>${esc(t.premios.split('\n')[0])}</span>` : ''}
                </div>
            </div>
            <div class="pf-t-side">
                <span class="pf-role-pill pf-role-pill--${t.rol}">${{ organizador: 'Organizador', participante: 'Participante', seguido: 'Siguiendo' }[t.rol]}</span>
                ${t.lugar ? `<span class="pf-t-location"><i class="ti ti-map-pin"></i>${esc(t.lugar)}</span>` : ''}
            </div>
        </a>`;
    }).join('');
}

/* ── Logros (calculados con la actividad real) ── */
function renderAchievements() {
    const s = data.stats;
    const all = [
        [s.organizados >= 1, 'ti-tournament', 'rgba(95,31,197,0.1)',   'var(--blue-violet-dark)', 'Organizador', 'Primer torneo creado'],
        [s.organizados >= 5, 'ti-medal',      'rgba(67,197,158,0.15)', '#1a9a72', 'Organizador Elite', '5 torneos creados'],
        [s.participados >= 1,'ti-door-enter', 'rgba(59,130,246,0.12)', '#1d4ed8', 'Debut', 'Primer torneo jugado'],
        [s.victorias >= 1,   'ti-star',       'rgba(245,158,11,0.14)', '#b45309', 'Primera victoria', 'Ganaste un partido'],
        [s.racha >= 3,       'ti-flame',      'rgba(239,68,68,0.12)',  '#c2410c', 'En racha', '3 victorias seguidas'],
        [s.titulos >= 1,     'ti-crown',      'rgba(245,158,11,0.14)', '#b45309', 'Campeón', `${s.titulos} título${s.titulos === 1 ? '' : 's'}`],
        [s.partidos >= 10,   'ti-target',     'rgba(224,81,122,0.14)', '#b3315a', 'Veterano', '10 partidos jugados'],
    ].filter(a => a[0]);
    $('pf-achievements-count').textContent = `${all.length} total`;
    const grid = $('pf-achievements-grid');
    grid.innerHTML = all.length ? all.map(([, icon, bg, color, title, sub]) => `
        <div class="pf-badge">
            <div class="pf-badge-icon" style="background:${bg};color:${color};"><i class="ti ${icon}"></i></div>
            <span class="pf-badge-title">${title}</span>
            <span class="pf-badge-sub">${esc(sub)}</span>
        </div>`).join('') : '<p class="pf-empty" style="grid-column:1/-1">Jugá u organizá torneos para desbloquear logros.</p>';
}

/* ── Deportes favoritos (por cantidad de torneos) ── */
function renderSports() {
    const list = $('pf-sports-list');
    const count = {};
    data.torneos.forEach(t => { if (t.deporte) count[t.deporte] = (count[t.deporte] || 0) + 1; });
    const rows = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (!rows.length) { list.innerHTML = '<p class="pf-empty">Todavía no hay deportes registrados.</p>'; return; }
    const max = rows[0][1];
    list.innerHTML = rows.map(([name, n]) => `
        <div class="pf-sport-row">
            <div class="pf-sport-top">
                <span class="pf-sport-name"><i class="ti ${sportIcon(name)[0]}"></i>${esc(name)}</span>
                <span class="pf-sport-count">${n} torneo${n === 1 ? '' : 's'}</span>
            </div>
            <div class="pf-sport-bar-bg"><div class="pf-sport-bar-fill" style="width:${Math.round(n * 100 / max)}%"></div></div>
        </div>`).join('');
}

/* ── Historial de torneos ── */
function renderTournamentHistory() {
    const tbody = $('pf-tournament-history-body');
    if (!data.torneos.length) { tbody.innerHTML = '<tr><td colspan="5" class="pf-empty">Sin torneos todavía.</td></tr>'; return; }
    tbody.innerHTML = data.torneos.map(t => {
        let res = 'Inscripto', tipo = 'semifinal';
        if (t.rol === 'organizador') { res = t.estado === 'finalizado' ? 'Finalizado' : (t.estado === 'activo' ? 'En curso' : 'Inscripciones abiertas'); tipo = 'finalizado'; }
        else if (t.estado === 'activo') { res = 'En curso'; }
        else if (t.estado === 'finalizado') {
            if (t.puesto === 1) { res = 'Campeón'; tipo = 'campeon'; }
            else if (t.puesto && t.puesto <= 3) { res = `${t.puesto}° puesto`; tipo = 'puesto'; }
            else { res = 'Finalizado'; tipo = 'finalizado'; }
        }
        return `<tr>
            <td><i class="ti ${sportIcon(t.deporte)[0]}" style="color:var(--blue-violet-dark);margin-right:6px;"></i>${esc(t.nombre)}</td>
            <td>${esc(t.deporte || '—')}</td>
            <td>${t.rol === 'organizador' ? 'Organizador' : 'Participante'}</td>
            <td>${esc(rango(t.inicio, t.fin))}</td>
            <td><span class="pf-tournament-result-badge pf-tr--${tipo}">${res}</span></td>
        </tr>`;
    }).join('');
}

/* ── Historial de partidos ── */
function renderMatches() {
    const tbody = $('pf-match-history-body');
    const jugados = data.partidos.filter(p => p.jugado);
    if (!jugados.length) { tbody.innerHTML = '<tr><td colspan="5" class="pf-empty">Todavía no jugaste partidos con resultado cargado.</td></tr>'; return; }
    const label = { win: ['ti-circle-check', 'Victoria'], loss: ['ti-circle-x', 'Derrota'], draw: ['ti-circle-minus', 'Empate'] };
    tbody.innerHTML = jugados.map(m => {
        const [ic, txt] = label[m.resultado];
        return `<tr>
            <td>${fecha(m.fecha)}</td>
            <td><i class="ti ${sportIcon(m.deporte)[0]}" style="color:var(--blue-violet-dark);margin-right:6px;"></i>${esc(m.torneo)}</td>
            <td>${esc(m.rival)}</td>
            <td><span class="pf-result-pill pf-result-pill--${m.resultado}"><i class="ti ${ic}"></i>${txt}</span></td>
            <td>${esc(m.marcador)}</td>
        </tr>`;
    }).join('');
}

/* ── Estadísticas ── */
function renderStats() {
    const s = data.stats;
    const cards = [
        ['ti-trending-up', `${s.racha} victoria${s.racha === 1 ? '' : 's'}`, 'Racha actual', 'green'],
        ['ti-trophy', s.titulos, 'Títulos ganados', 'yellow'],
        ['ti-percentage', s.porcentaje == null ? '—' : `${s.porcentaje}%`, 'Efectividad', 'blue'],
        ['ti-tournament', s.organizados, 'Torneos organizados', 'violet'],
        ['ti-check', s.victorias, 'Victorias', 'green'],
        ['ti-x', s.derrotas, 'Derrotas', 'red'],
        ['ti-minus', s.empates, 'Empates', 'gray'],
        ['ti-users', s.rivales, 'Rivales únicos', 'blue'],
    ];
    $('pf-stats-grid').innerHTML = cards.map(([icon, value, caption, variant]) => `
        <div class="pf-stat-card pf-stat-card--${variant}">
            <i class="ti ${icon}"></i><span class="pf-stat-value">${esc(value)}</span><span class="pf-stat-caption">${caption}</span>
        </div>`).join('');
}

/* ── Calendario de mis partidos ── */
const hoy = new Date();
let calY = hoy.getFullYear(), calM = hoy.getMonth();
let eventos = {};             // 'YYYY-MM-DD' -> [partido]

function tipoDe(fase) {
    const f = (fase || '').toLowerCase();
    if (f.includes('final') && !f.includes('semi') && !f.includes('cuartos')) return 'final';
    if (f.includes('semi')) return 'semifinal';
    return 'partido';
}

function renderCalendar() {
    const grid = $('pf-cal-grid'), title = $('pf-cal-title');
    if (!grid || !title) return;
    title.textContent = `${MESES[calM]} ${calY}`;
    const offset = (new Date(calY, calM, 1).getDay() + 6) % 7;
    const dias = new Date(calY, calM + 1, 0).getDate();
    let html = DIAS.map(d => `<div class="pf-cal-dow">${d}</div>`).join('');
    for (let i = 0; i < offset; i++) html += '<div class="pf-cal-day pf-cal-day--empty"></div>';
    let count = 0;
    for (let d = 1; d <= dias; d++) {
        const key = `${calY}-${String(calM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const evs = eventos[key];
        const isToday = hoy.getFullYear() === calY && hoy.getMonth() === calM && hoy.getDate() === d;
        const cls = ['pf-cal-day'];
        if (evs) { cls.push('pf-cal-day--has-event'); count += evs.length; }
        if (isToday) cls.push('pf-cal-day--today');
        const dot = evs ? `<span class="pf-cal-dot pf-cal-dot--${tipoDe(evs[0].fase)}"></span>` : '';
        html += `<div class="${cls.join(' ')}" ${evs ? `data-key="${key}" tabindex="0" role="button" aria-label="Ver partido del día ${d}"` : ''}>${d}${dot}</div>`;
    }
    grid.innerHTML = html;
    $('pf-cal-summary-count').textContent = `${count} partido${count !== 1 ? 's' : ''} programado${count !== 1 ? 's' : ''}`;
    grid.querySelectorAll('.pf-cal-day--has-event').forEach(el => {
        el.addEventListener('click', () => openPopover(el));
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPopover(el); } });
    });
}

function openPopover(dayEl) {
    const pop = $('pf-day-popover');
    const evs = eventos[dayEl.dataset.key];
    if (!pop || !evs) return;
    const ev = evs[0];
    const tipo = tipoDe(ev.fase);
    const res = ev.jugado ? `<div class="pf-popover-row"><i class="ti ti-scoreboard"></i>Resultado: ${esc(ev.marcador)}</div>` : '';
    pop.innerHTML = `
        <button class="pf-popover-close" aria-label="Cerrar"><i class="ti ti-x"></i></button>
        <span class="pf-popover-badge pf-popover-badge--${tipo}">${esc(ev.fase || 'Partido')}</span>
        <div class="pf-popover-title">${esc(ev.torneo)}</div>
        <div class="pf-popover-rival"><i class="ti ti-swords"></i>vs ${esc(ev.rival || 'Por definir')}</div>
        <div class="pf-popover-details">
            <div class="pf-popover-row"><i class="ti ti-calendar"></i>${fecha(ev.fecha)}</div>
            ${ev.hora ? `<div class="pf-popover-row"><i class="ti ti-clock"></i>${esc(ev.hora)} h</div>` : ''}
            ${ev.lugar ? `<div class="pf-popover-row"><i class="ti ti-map-pin"></i>${esc(ev.lugar)}</div>` : ''}
            ${res}
            ${evs.length > 1 ? `<div class="pf-popover-row"><i class="ti ti-plus"></i>${evs.length - 1} partido(s) más ese día</div>` : ''}
        </div>`;
    const box = $('pf-calendar-box');
    const dr = dayEl.getBoundingClientRect(), br = box.getBoundingClientRect();
    const w = pop.offsetWidth || 260;
    pop.style.top = `${dr.bottom - br.top + 8}px`;
    pop.style.left = `${Math.max(8, Math.min(dr.left - br.left + dr.width / 2 - w / 2, br.width - w - 8))}px`;
    pop.classList.add('open');
    pop.querySelector('.pf-popover-close').addEventListener('click', () => pop.classList.remove('open'));
}

document.addEventListener('click', e => {
    const pop = $('pf-day-popover');
    if (pop?.classList.contains('open') && !pop.contains(e.target) && !e.target.closest('.pf-cal-day--has-event')) pop.classList.remove('open');
});
$('pf-cal-prev')?.addEventListener('click', () => { if (--calM < 0) { calM = 11; calY--; } $('pf-day-popover')?.classList.remove('open'); renderCalendar(); });
$('pf-cal-next')?.addEventListener('click', () => { if (++calM > 11) { calM = 0; calY++; } $('pf-day-popover')?.classList.remove('open'); renderCalendar(); });

/* ── Tabs ── */
document.querySelectorAll('.pf-tab-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.pf-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.pf-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.target)?.classList.add('active');
}));

/* ── Inicio ── */
(window.competikaSessionReady || Promise.resolve({ logged: true })).then(async s => {
    if (!s || !s.logged) return;                       // navbar-user.js ya redirige al login
    const [me, act] = await Promise.all([api('me'), api('activity')]);
    if (me.success) { renderIdentity(me.user) }
    if (act.success) data = act;
    eventos = {};
    data.partidos.forEach(p => { if (p.fecha) (eventos[p.fecha] ||= []).push(p); });
    renderTopStats();
    renderActive();
    renderAchievements();
    renderSports();
    renderTournamentHistory();
    renderMatches();
    renderStats();
    renderCalendar();
});
renderCalendar();
})();
