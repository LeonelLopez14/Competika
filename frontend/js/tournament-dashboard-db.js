/* =====================================================
   COMPETIKA — tournament-dashboard-db.js
   Dashboard del organizador (tournament_dashboard.html)

   Requiere, en este orden: main.js, navbar-user.js, tournament-api.js, este archivo.
   ===================================================== */
(function () {
const root = document.getElementById('td-dashboard');
if (!root) return;

// ── Estado ────────────────────────────────────────────────────────────
let tdData = null;          // torneo activo
let tdJueces = [];          // jueces aprobados, para asignar a partidos
let tdEditMatchId = null;   // partido abierto en el panel de edición
let tdIsAdmin = false;

// ── Utilidades ────────────────────────────────────────────────────────
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);
const money = n => `${tdData?.costs?.currencySymbol || '$'} ${Number(n).toLocaleString('es-UY')}`;
// Monedas habilitadas (tabla moneda): se cargan una vez desde la API
let tdMonedas = [['UYU', 'UYU — Peso uruguayo']];
competikaApi('catalogs').then(r => { if (r.success) tdMonedas = r.currencies.map(m => [m.code, `${m.code} — ${m.name}`]); });
competikaApi('judges').then(r => { if (r.success) tdJueces = r.judges; });
const FL = 'style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)"';
const PHASES = ['Fase de Grupos', 'Fecha 1', 'Fecha 2', 'Cuartos de Final', 'Semifinal', 'Gran Final'];

const FORMAT_HELP = {
    'liga-simple':        'todos contra todos, una fecha por ronda.',
    'liga-doble':         'todos contra todos a ida y vuelta.',
    'sistema-puntos':     'todos contra todos; suma puntos por partido.',
    'eliminacion-simple': 'llave de eliminación; el ganador pasa solo a la ronda siguiente.',
    'eliminacion-doble':  'llave de ganadores y de perdedores; quedás afuera con dos derrotas.',
    'blitz':              'llave de eliminación en el mismo día, con pocos minutos entre rondas.',
    'gran-premio':        'varias etapas todos contra todos; gana quien más puntos acumula.',
    'suizo':              'una ronda a la vez, emparejando equipos con puntaje parecido.',
    'vidas':              'una ronda a la vez; cada derrota resta una vida.',
    'copa-desafio':       'el campeón defiende el título ante un retador por desafío.',
    'grupos':             'fase de grupos todos contra todos y luego eliminatorias con los dos primeros.',
};
const prizeLabel = n => `${n}.º puesto`;

const team      = id => tdData?.teams.find(t => t.id === id);
const teamLabel = id => { const t = team(id); return t ? `${t.emoji} ${esc(t.name)}` : '🏆 Por definir'; };

function fmtDate(str, long = false) {
    if (!str) return '—';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('es-UY', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short', year: 'numeric' });
}
const STATUS = {
    pending:  { label: 'Inscripciones abiertas', color: 'rgba(245,158,11,0.9)' },
    active:   { label: 'En curso',               color: 'var(--sun-glare-dark)' },
    finished: { label: 'Finalizado',             color: 'rgba(33,33,33,0.4)' },
};
const statusOf = s => STATUS[s] || STATUS.pending;
const phaseClass = p => ({
    'Fase de Grupos': 'bg-blue-violet/10 text-blue-violet-dark',
    'Semifinal':      'bg-sun-glare/20 text-sun-glare-dark',
    'Gran Final':     'bg-blue-violet text-cloud-dancer',
})[p] || 'bg-darkest-hour/10 text-darkest-hour/60';

// ── Toast ─────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = 'ok') {
    const el = $('td-toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = msg;
    el.className = `td-toast td-toast--${type} td-toast--show`;
    toastTimer = setTimeout(() => el.classList.remove('td-toast--show'), 3200);
}

/** Ejecuta una acción de la API; si falla muestra el error. Devuelve true si salió bien. */
async function call(action, opts, okMsg) {
    const r = await competikaApi(action, opts);
    if (r._status === 401) { competikaGoLogin(); return false; }
    if (!r.success) { toast(r.error || 'No se pudo completar la acción.', 'warn'); return false; }
    if (okMsg) toast(okMsg);
    return true;
}
async function reload() {
    if (tdData) tdData = await competikaGetTournament(tdData.id);
    updateSidebar();
}

// ── Sidebar y navegación ──────────────────────────────────────────────
const sidebar = $('td-sidebar'), sideBack = $('td-sidebar-backdrop');
const closeSidebar = () => { sidebar?.classList.remove('open'); sideBack?.classList.remove('open'); };
$('td-sidebar-toggle')?.addEventListener('click', () => { sidebar.classList.toggle('open'); sideBack.classList.toggle('open'); });
sideBack?.addEventListener('click', closeSidebar);

function updateSidebar() {
    const info = $('td-sidebar-info');
    if (!info) return;
    if (!tdData) { info.innerHTML = '<p class="td-tournament-name" style="opacity:.4">Ningún torneo seleccionado</p>'; return; }
    const st = statusOf(tdData.status);
    info.innerHTML = `
        <p class="td-tournament-name">${esc(tdData.name)}</p>
        <span class="td-status-dot" style="background:${st.color}"></span>
        <span class="td-status-text" style="color:${st.color}">${st.label}</span>`;
}

const SECTIONS = {
    selector:      ['Mis Torneos', 'Torneos', renderSelector],
    overview:      ['Visión General del Torneo', 'Overview', renderOverview],
    participantes: ['Equipos Participantes', 'Participantes', renderParticipantes],
    resultados:    ['Resultados y Posiciones', 'Resultados', renderResultados],
    configuracion: ['Configuración del Torneo', 'Configuración', renderConfig],
    calendario:    ['Calendario de Partidos', 'Calendario', renderCalendario],
};
let current = 'selector';

function show(id) {
    if (id !== 'selector' && !tdData) id = 'selector';
    current = id;
    tdEditMatchId = null;
    const [title, crumb, render] = SECTIONS[id];
    $('td-page-title').textContent = title;
    $('td-breadcrumb').textContent = crumb;
    document.querySelectorAll('#td-nav-list .td-nav-item').forEach(li => li.classList.toggle('active', li.dataset.section === id));
    const c = $('td-section-content');
    c.innerHTML = '';
    c.classList.remove('td-section-anim'); void c.offsetWidth; c.classList.add('td-section-anim');
    render();
    closeSidebar();
}
const rerender = () => show(current);

document.querySelectorAll('#td-nav-list .td-nav-item').forEach(li => li.addEventListener('click', () => {
    if (li.dataset.section === 'selector') { tdData = null; updateSidebar(); history.replaceState(null, '', location.pathname); }
    show(li.dataset.section);
}));
// Compartir = link a la página pública del torneo (la que ven participantes e invitados)
['td-share-sidebar', 'td-share-top'].forEach(id => $(id)?.addEventListener('click', () => {
    if (!tdData) { toast('Elegí un torneo primero', 'warn'); return; }
    const url = new URL(`../tournament_view/tournament_view.html?t=${encodeURIComponent(tdData.id)}`, location.href).href;
    navigator.clipboard?.writeText(url);
    toast('¡Link público del torneo copiado!');
}));

const content = () => $('td-section-content');

// ═════════════════════════════════════════ MIS TORNEOS
async function renderSelector() {
    content().innerHTML = '<p class="td-no-data">Cargando torneos…</p>';
    const all = await competikaListTournaments();
    if (current !== 'selector') return;
    const nuevo = `<a href="../tournament_form/tournament_form.html" class="td-btn-primary"><i class="ti ti-plus"></i> Crear torneo</a>`;
    if (!all.length) {
        content().innerHTML = `
            <div class="td-empty-state">
                <span class="td-empty-icon"><i class="ti ti-tournament"></i></span>
                <h2 class="td-empty-title">Todavía no organizás ningún torneo</h2>
                <p class="td-empty-sub">Creá tu primer torneo y volvé acá para gestionarlo.</p>${nuevo}
            </div>`;
        return;
    }
    content().innerHTML = `
        <div class="td-selector-header">${nuevo}</div>
        <div class="td-selector-grid">
        ${all.map(t => { const st = statusOf(t.status); return `
            <div class="td-selector-card">
                <div class="td-sc-header">
                    <div><p class="td-sc-sport">${esc(t.sport || 'Sin deporte')}</p><h3 class="td-sc-name">${esc(t.name)}</h3></div>
                    <span class="td-sc-status" style="background:${st.color}20;color:${st.color}">${st.label}</span>
                </div>
                <div class="td-sc-meta">
                    <span><i class="ti ti-calendar"></i>${fmtDate(t.startDate)}</span>
                    <span><i class="ti ti-list-details"></i>${esc(t.formatLabel || 'Formato a definir')}</span>
                    <span><i class="ti ti-users"></i>${t.teamCount} / ${t.maxTeams} equipos</span>
                    ${t.department || t.venue ? `<span><i class="ti ti-map-pin"></i>${esc([t.venue, t.department].filter(Boolean).join(', '))}</span>` : ''}
                </div>
                <div class="td-sc-footer">
                    <button class="td-btn-primary td-sc-enter" data-action="open" data-id="${t.id}"><i class="ti ti-arrow-right"></i> Gestionar</button>
                    <button class="td-sc-delete" data-action="delete-tournament" data-id="${t.id}" title="Eliminar torneo"><i class="ti ti-trash"></i></button>
                </div>
            </div>`; }).join('')}
        </div>`;
}

async function openTournament(id) {
    tdData = await competikaGetTournament(id);
    if (!tdData) { toast('Torneo no encontrado', 'warn'); show('selector'); return; }
    if (!tdData.isOwner) { location.replace(`../tournament_view/tournament_view.html?t=${encodeURIComponent(tdData.id)}`); return; }   // no es el organizador: ve la página pública
    updateSidebar();
    history.replaceState(null, '', `?t=${encodeURIComponent(id)}`);
    show('overview');
}

// ═════════════════════════════════════════ OVERVIEW
function renderOverview() {
    const t = tdData;
    const played = t.matches.filter(m => m.played).length;
    const next = t.matches.find(m => !m.played);
    const st = statusOf(t.status);
    const leader = [...t.teams].sort((a, b) => b.points - a.points)[0];

    content().innerHTML = `
    <div class="td-overview-grid">
      <div class="td-stats-row">
        ${[['ti-users', 'Equipos', `${t.teams.length} / ${t.maxTeams}`], ['ti-sword', 'Partidos jugados', played],
           ['ti-clock', 'Partidos pendientes', t.matches.length - played], ['ti-trophy', 'Puntero', leader && leader.points ? esc(leader.name) : '—']]
          .map(([i, l, v]) => `<div class="td-stat-card"><i class="ti ${i} td-stat-icon"></i><div><p class="td-stat-label">${l}</p><p class="td-stat-val">${v}</p></div></div>`).join('')}
      </div>
      <div class="td-two-col">
        ${next ? `
        <div class="td-card">
          <p class="td-card-label">PRÓXIMO PARTIDO</p>
          <span class="td-phase-badge ${phaseClass(next.phase)}">${esc(next.phase)}</span>
          <div class="td-match-vs-big">
            <div class="td-match-team">${teamLabel(next.home)}</div><span class="td-vs-sep">VS</span><div class="td-match-team">${teamLabel(next.away)}</div>
          </div>
          <p class="td-match-meta"><i class="ti ti-calendar"></i>${fmtDate(next.date)} ${esc(next.time || '')} · <i class="ti ti-map-pin"></i>${esc(next.venue || '—')}</p>
        </div>` : `
        <div class="td-card td-card--muted"><p class="td-stat-label">Sin partidos pendientes</p>
          <p style="font-size:13px;margin-top:8px;color:rgba(33,33,33,0.4)">Agregá partidos desde Calendario.</p></div>`}
        <div class="td-card">
          <div class="td-card-header-row"><p class="td-card-label">DATOS</p>
            <span class="td-phase-badge" style="background:${st.color}20;color:${st.color}">${st.label}</span></div>
          <div class="td-resumen">
            <div class="td-resumen-row"><span>Deporte</span><span>${esc(t.sport || '—')}</span></div>
            <div class="td-resumen-row"><span>Formato</span><span>${esc(t.formatLabel || '—')}</span></div>
            <div class="td-resumen-row"><span>Fechas</span><span>${fmtDate(t.startDate)}${t.endDate ? ' → ' + fmtDate(t.endDate) : ''}</span></div>
            <div class="td-resumen-row"><span>Lugar</span><span>${esc([t.venue, t.department].filter(Boolean).join(', ') || '—')}</span></div>
            <div class="td-resumen-row"><span>Jugadores por equipo</span><span>${t.rules.playersPerTeam}</span></div>
            <div class="td-resumen-row"><span>Competitivo</span><span>${t.rules.competitive ? 'Sí · juez ' + esc(t.rules.mainJudgeName || '—') : 'No'}</span></div>
            <div class="td-resumen-row"><span>Inscripción</span><span>${t.costs.entryFee > 0 ? money(t.costs.entryFee) : 'Gratis'}</span></div>
            ${t.costs.fieldCost > 0 ? `<div class="td-resumen-row"><span>Alquiler del lugar</span><span>${money(t.costs.fieldCost)}</span></div>` : ''}
            ${t.costs.refereeCost > 0 ? `<div class="td-resumen-row"><span>Costo de árbitro</span><span>${money(t.costs.refereeCost)}</span></div>` : ''}
          </div>
        </div>
      </div>
      ${t.champion ? `<div class="td-card td-champion"><p class="td-card-label"><i class="ti ti-trophy"></i> Campeón</p>
        <p class="td-champion-name">${teamLabel(t.champion)}</p></div>` : ''}
      ${t.prizes?.length ? `<div class="td-card"><p class="td-card-label"><i class="ti ti-medal"></i> Premios</p>
        <div class="td-resumen" style="margin-top:10px">${t.prizes.map(p => `<div class="td-resumen-row"><span>${prizeLabel(p.place)}</span><span>${esc(p.description)}</span></div>`).join('')}</div></div>` : ''}
      ${t.referee && (t.referee.name || t.referee.phone || t.referee.email) ? `<div class="td-card"><p class="td-card-label"><i class="ti ti-gavel"></i> Árbitro principal</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px">
          ${t.referee.name ? `<span style="font-size:14px;font-weight:700">${esc(t.referee.name)}</span>` : ''}
          ${t.referee.phone ? `<span class="td-match-meta"><i class="ti ti-phone"></i>${esc(t.referee.phone)}</span>` : ''}
          ${t.referee.email ? `<span class="td-match-meta"><i class="ti ti-mail"></i>${esc(t.referee.email)}</span>` : ''}
        </div></div>` : ''}
      <div class="td-card"><p class="td-card-label"><i class="ti ti-user-circle"></i> Organizador</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px">
          <span style="font-size:14px;font-weight:700">${esc(t.organizer.name)}</span>
          ${t.organizer.phone ? `<span class="td-match-meta"><i class="ti ti-phone"></i>${esc(t.organizer.phone)}</span>` : ''}
          ${t.organizer.email ? `<span class="td-match-meta"><i class="ti ti-mail"></i>${esc(t.organizer.email)}</span>` : ''}
        </div></div>
    </div>`;
}

// ═════════════════════════════════════════ PARTICIPANTES
function renderParticipantes() {
    const t = tdData;
    const full = t.teams.length >= t.maxTeams;
    content().innerHTML = `
    <div class="td-part-layout">
      <div class="td-part-list">
        ${t.teams.length ? `<p class="td-list-section-title"><i class="ti ti-check"></i> INSCRIPTOS (${t.teams.length})</p>` : `
          <div class="td-empty-state td-empty-state--sm"><span class="td-empty-icon" style="font-size:2rem"><i class="ti ti-users"></i></span>
          <p class="td-empty-sub">Todavía no hay equipos. Agregalos desde el panel de la derecha o esperá inscripciones.</p></div>`}
        ${t.teams.map(e => `
          <div class="td-team-row">
            <span class="td-team-row-emoji">${e.emoji}</span>
            <div class="td-team-row-info">
              <p class="td-team-row-name">${esc(e.name)}</p>
              <p class="td-team-row-sub">${e.players} jugador${e.players === 1 ? '' : 'es'} · ${e.points} pts</p>
            </div>
            <span class="td-team-rec">${e.wins}G ${e.draws}E ${e.losses}P</span>
            <button class="td-action-btn td-action-ok" title="Renombrar" data-action="rename-team" data-id="${e.id}"><i class="ti ti-pencil" style="font-size:12px"></i></button>
            <button class="td-action-btn td-action-no" title="Eliminar" data-action="delete-team" data-id="${e.id}"><i class="ti ti-trash" style="font-size:12px"></i></button>
          </div>`).join('')}
      </div>
      <div class="td-card td-part-add">
        <p class="td-card-label"><i class="ti ti-plus"></i> Agregar equipo</p>
        <div class="input-group mt-4"><input type="text" id="td-add-name" class="input-field" placeholder=" " maxlength="100">
          <label for="td-add-name" class="floating-label">Nombre del equipo</label></div>
        <div class="input-group"><input type="number" id="td-add-players" class="input-field" placeholder=" " min="1" max="500">
          <label for="td-add-players" class="floating-label">N° de jugadores</label></div>
        <button class="td-btn-primary" style="width:100%" data-action="add-team" ${full ? 'disabled' : ''}>
          <i class="ti ti-plus"></i> ${full ? 'Cupo completo' : 'Agregar equipo'}</button>
        <div class="td-resumen"><p class="td-card-label" style="margin-top:16px">CUPO</p>
          <div class="td-resumen-row"><span>Inscriptos</span><span>${t.teams.length} / ${t.maxTeams}</span></div></div>
      </div>
    </div>`;
}

// ═════════════════════════════════════════ RESULTADOS + POSICIONES
function standingsTable(teams, lives) {
    const tabla = [...teams].sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));
    return `<table class="td-table">
          <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th>${lives ? '<th>Vidas</th>' : ''}<th>Pts</th></tr></thead>
          <tbody>${tabla.map((e, i) => `<tr class="${i === 0 && e.points > 0 ? 'td-table-first' : ''}">
            <td class="td-table-pos">${i + 1}</td><td><span class="td-table-emoji">${e.emoji}</span>${esc(e.name)}</td>
            <td>${e.wins + e.draws + e.losses}</td><td>${e.wins}</td><td>${e.draws}</td><td>${e.losses}</td>
            ${lives ? `<td>${'❤'.repeat(e.livesLeft || 0) || '—'}</td>` : ''}
            <td class="td-table-pts">${e.points}</td></tr>`).join('')}</tbody></table>`;
}

function renderResultados() {
    const t = tdData;
    const played = t.matches.filter(m => m.played);
    const lives = t.formatSubId === 'vidas';
    const groups = [...new Set(t.teams.map(e => e.group).filter(Boolean))].sort();
    content().innerHTML = `
      ${t.champion ? `<div class="td-card td-champion" style="margin-bottom:16px"><p class="td-card-label"><i class="ti ti-trophy"></i> Campeón</p>
        <p class="td-champion-name">${teamLabel(t.champion)}</p></div>` : ''}
      ${!t.teams.length ? '<div class="td-card"><p class="td-no-data">Sin equipos todavía.</p></div>'
        : groups.length ? groups.map(g => `<div class="td-card" style="margin-bottom:16px">
            <p class="td-card-label"><i class="ti ti-list-numbers"></i> Grupo ${esc(g)}</p>
            ${standingsTable(t.teams.filter(e => e.group === g), lives)}</div>`).join('')
        : `<div class="td-card"><p class="td-card-label"><i class="ti ti-list-numbers"></i> Tabla de posiciones</p>${standingsTable(t.teams, lives)}</div>`}
      <p class="td-section-label" style="margin-top:28px"><i class="ti ti-circle-check"></i> PARTIDOS JUGADOS</p>
      <div class="td-results-list">
        ${played.length ? played.map(m => `
          <div class="td-result-card">
            <div class="td-result-header"><span class="td-phase-badge ${phaseClass(m.phase)}">${esc(m.phase)}</span>
              <span class="td-result-date">${fmtDate(m.date)} ${esc(m.time || '')}</span></div>
            <div class="td-result-score-row">
              <span class="td-result-team">${teamLabel(m.home)}</span>
              <span class="td-result-score">${m.homeScore} <span class="td-result-dash">—</span> ${m.awayScore}</span>
              <span class="td-result-team">${teamLabel(m.away)}</span>
            </div>
          </div>`).join('') : '<p class="td-no-data">Todavía no se cargaron resultados. Hacelo desde Calendario.</p>'}
      </div>`;
}

// ═════════════════════════════════════════ CONFIGURACIÓN
function renderConfig() {
    const t = tdData;
    const sports = (typeof cardData !== 'undefined' ? cardData.map(s => s.title) : []);
    if (t.sport && !sports.includes(t.sport)) sports.unshift(t.sport);
    const formats = typeof tournamentTypes !== 'undefined' ? tournamentTypes.flatMap(tt => tt.subtipos.map(s => [s.id, s.title])) : [];
    const deps = ['Artigas','Canelones','Cerro Largo','Colonia','Durazno','Flores','Florida','Lavalleja','Maldonado','Montevideo','Paysandú','Río Negro','Rivera','Rocha','Salto','San José','Soriano','Tacuarembó','Treinta y Tres'];
    const opt = (list, sel) => list.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`; }).join('');
    const field = (id, label, value, type = 'text', extra = '') =>
        `<div class="input-group"><input type="${type}" id="${id}" class="input-field" value="${esc(value ?? '')}" placeholder=" " ${extra}><label for="${id}" class="floating-label" ${FL}>${label}</label></div>`;

    content().innerHTML = `
    <div class="td-config-layout">
      <div class="td-config-main">
        <div class="td-card">
          <p class="td-card-label"><i class="ti ti-clipboard-text"></i> Datos del torneo</p>
          <div class="mt-4">${field('cfg-name', 'Nombre del torneo', t.name, 'text', 'maxlength="150"')}</div>
          <div class="input-group"><select id="cfg-sport" class="input-field"><option value="">Sin deporte</option>${opt(sports, t.sport)}</select><label for="cfg-sport" class="floating-label" ${FL}>Deporte</label></div>
          <div class="input-group"><select id="cfg-format" class="input-field"><option value="">A definir</option>${opt(formats, t.formatSubId)}</select><label for="cfg-format" class="floating-label" ${FL}>Formato</label></div>
          <div class="td-ep-row2">${field('cfg-start', 'Fecha de inicio', t.startDate, 'date')}${field('cfg-end', 'Fecha de fin', t.endDate, 'date')}</div>
          <div class="td-ep-row2">
            <div class="input-group"><select id="cfg-dep" class="input-field"><option value="">Sin departamento</option>${opt(deps, t.department)}</select><label for="cfg-dep" class="floating-label" ${FL}>Departamento</label></div>
            ${field('cfg-venue', 'Dirección / sede', t.venue, 'text', 'maxlength="150"')}
          </div>
          <div class="input-group"><textarea id="cfg-desc" class="input-field" style="height:auto;min-height:72px;padding-top:16px" maxlength="2000" placeholder=" ">${esc(t.description || '')}</textarea><label for="cfg-desc" class="floating-label" ${FL}>Descripción</label></div>
          <div class="td-ep-row2">
            ${field('cfg-max', 'Cupo de equipos', t.maxTeams, 'number', 'min="2" max="1024"')}
            <div class="input-group"><select id="cfg-status" class="input-field">${opt([['pending', 'Inscripciones abiertas'], ['active', 'En curso'], ['finished', 'Finalizado']], t.status)}</select><label for="cfg-status" class="floating-label" ${FL}>Estado</label></div>
          </div>
          <button class="td-btn-primary" data-action="save-config"><i class="ti ti-device-floppy"></i> Guardar cambios</button>
        </div>
        <div class="td-card">
          <p class="td-card-label"><i class="ti ti-cash"></i> Costos y premios</p>
          <div class="mt-4 input-group"><select id="cfg-currency" class="input-field">${opt(tdMonedas, t.costs.currency || 'UYU')}</select><label for="cfg-currency" class="floating-label" ${FL}>Moneda</label></div>
          <div class="td-ep-row2">${field('cfg-fee', 'Costo de inscripción', t.costs.entryFee, 'number', 'min="0" step="0.01"')}${field('cfg-field', 'Alquiler del lugar', t.costs.fieldCost, 'number', 'min="0" step="0.01"')}</div>
          ${field('cfg-ref', 'Costo de árbitro', t.costs.refereeCost, 'number', 'min="0" step="0.01"')}
          ${[1, 2, 3].map(n => field('cfg-prize-' + n, 'Premio ' + prizeLabel(n), t.prizes?.find(p => p.place === n)?.description, 'text', 'maxlength="255"')).join('')}
          <button class="td-btn-primary" data-action="save-costs"><i class="ti ti-device-floppy"></i> Guardar costos y premios</button>
        </div>
        <div class="td-card">
          <p class="td-card-label"><i class="ti ti-adjustments"></i> Reglas</p>
          <div class="td-ep-row2 mt-4">
            ${field('cfg-players', 'Jugadores por equipo', t.rules.playersPerTeam, 'number', 'min="1" max="50"')}
            ${t.formatSubId === 'vidas' ? field('cfg-lives', 'Vidas por participante', t.rules.lives, 'number', 'min="1" max="10"') : ''}
            ${t.formatSubId === 'grupos' ? field('cfg-groups', 'Cantidad de grupos (vacío = automático)', t.rules.groups, 'number', 'min="1" max="16"') : ''}
          </div>
          <label class="td-ep-toggle-row"><span>Torneo competitivo <span class="td-meta-small" style="display:block;font-weight:400">Los resultados los carga el juez y los jugadores necesitan carné de deportista.</span></span>
            <span class="relative inline-flex h-7 w-12 shrink-0 items-center">
              <input type="checkbox" id="cfg-competitive" class="peer sr-only" ${t.rules.competitive ? 'checked' : ''}>
              <span class="absolute inset-0 rounded-full bg-darkest-hour/15 transition-colors duration-300 peer-checked:bg-sun-glare-dark"></span>
              <span class="absolute left-1 h-5 w-5 rounded-full bg-cloud-dancer shadow transition-transform duration-300 peer-checked:translate-x-5"></span>
            </span></label>
          <div class="input-group" id="cfg-judge-group" style="${t.rules.competitive ? '' : 'display:none'}">
            <select id="cfg-main-judge" class="input-field"><option value="">Elegí un juez…</option>${tdJueces.map(j =>
              `<option value="${esc(j.id)}"${j.id === t.rules.mainJudgeId ? ' selected' : ''}>${esc(j.name)}${j.certified ? ' · certificado' : ''}</option>`).join('')}</select>
            <label for="cfg-main-judge" class="floating-label" ${FL}>Juez principal (obligatorio)</label></div>
          <button class="td-btn-primary" data-action="save-rules"><i class="ti ti-device-floppy"></i> Guardar reglas</button>
        </div>
        <div class="td-card">
          <p class="td-card-label"><i class="ti ti-gavel"></i> Árbitro principal</p>
          <div class="mt-4">${field('cfg-ref-name', 'Nombre completo', t.referee?.name, 'text', 'maxlength="150"')}</div>
          <div class="td-ep-row2">${field('cfg-ref-phone', 'Teléfono', t.referee?.phone, 'tel', 'maxlength="20"')}${field('cfg-ref-email', 'Correo electrónico', t.referee?.email, 'email', 'maxlength="150"')}</div>
          <p class="td-card-label mt-4"><i class="ti ti-user-circle"></i> Contacto del organizador</p>
          <div class="mt-4">${field('cfg-org-name', 'Nombre de contacto', t.organizer?.name, 'text', 'maxlength="150"')}</div>
          <div class="td-ep-row2">${field('cfg-org-phone', 'Teléfono de contacto', t.organizer?.phone, 'tel', 'maxlength="20"')}${field('cfg-org-email', 'Correo de contacto', t.organizer?.email, 'email', 'maxlength="150"')}</div>
          <button class="td-btn-primary" data-action="save-contacts"><i class="ti ti-device-floppy"></i> Guardar árbitro y contacto</button>
        </div>
      </div>
      <div class="td-config-side">
        <div class="td-card td-card--danger">
          <p class="td-card-label"><i class="ti ti-alert-triangle"></i> Zona de peligro</p>
          <p class="td-meta-small">Un torneo con resultados registrados no se puede eliminar: marcalo como Finalizado.</p>
          <button class="td-btn-danger" data-action="delete-tournament" data-id="${t.id}">Eliminar torneo</button>
        </div>
      </div>
    </div>`;
}

// ═════════════════════════════════════════ CALENDARIO
function teamOptions(selected) {
    return `<option value="">🏆 Por definir</option>` +
        tdData.teams.map(e => `<option value="${e.id}"${e.id === selected ? ' selected' : ''}>${e.emoji} ${esc(e.name)}</option>`).join('');
}
const phaseList = id => `<datalist id="${id}">${PHASES.map(p => `<option value="${esc(p)}">`).join('')}</datalist>`;

function fixtureCard(t, field) {
    const fx = t.fixture || {};
    if (!fx.action) return fx.reason && !t.matches.length ? `<p class="td-meta-small" style="margin-bottom:16px"><i class="ti ti-info-circle"></i> ${esc(fx.reason)}</p>` : '';
    const first = fx.action === 'generar';
    const sub = t.formatSubId;
    const extra = [
        first && sub === 'grupos' ? field('fx-groups', 'Cantidad de grupos (vacío = automático)', t.rules.groups ?? '', 'number', 'min="1" max="16"') : '',
        first && sub === 'gran-premio' ? field('fx-stages', 'Cantidad de etapas', 3, 'number', 'min="1" max="10"') : '',
        sub === 'blitz' ? field('fx-minutes', 'Minutos entre rondas', 60, 'number', 'min="10" max="600"') : '',
    ].filter(Boolean).join('');
    return `<div class="td-card" style="margin-bottom:16px">
        <p class="td-card-label"><i class="ti ti-wand"></i> ${first ? 'Generar fixture automático' : 'Siguiente ronda'} · ${esc(t.formatLabel || '')}</p>
        <p class="td-meta-small" style="margin-top:6px">${first ? `Arma los partidos con los ${t.teams.length} equipos inscriptos: ${FORMAT_HELP[sub] || ''}` : 'Arma los cruces de la próxima ronda según los resultados cargados.'}</p>
        <div class="td-ep-row2" style="margin-top:14px">
          <div class="input-group"><input type="date" id="fx-start" class="input-field" value="${esc(first ? (t.startDate || '') : '')}"><label class="floating-label" ${FL}>${first ? 'Primera fecha' : 'Fecha (vacío = siguiente)'}</label></div>
          <div class="input-group"><input type="time" id="fx-time" class="input-field" value="18:00"><label class="floating-label" ${FL}>Hora</label></div>
        </div>
        <div class="td-ep-row2">
          ${sub === 'blitz' ? '' : field('fx-days', 'Días entre fechas', 7, 'number', 'min="0" max="60"')}
          ${field('fx-venue', 'Lugar', t.venue || '', 'text', 'maxlength="150"')}
        </div>
        ${extra ? `<div class="td-ep-row2">${extra}</div>` : ''}
        <button class="td-btn-primary" data-action="generate-fixture" data-first="${first ? 1 : 0}"><i class="ti ti-wand"></i> ${esc(fx.label)}</button>
      </div>`;
}

function renderCalendario() {
    const t = tdData;
    const field = (id, label, value, type = 'text', extra = '') =>
        `<div class="input-group"><input type="${type}" id="${id}" class="input-field" value="${esc(value ?? '')}" placeholder=" " ${extra}><label for="${id}" class="floating-label" ${FL}>${label}</label></div>`;
    const byDate = {};
    t.matches.forEach(m => (byDate[m.date || 'sin-fecha'] ||= []).push(m));
    const played = t.matches.filter(m => m.played).length;

    content().innerHTML = `
    <div class="td-cal-layout" id="td-cal-layout">
      <div class="td-stats-row td-stats-row--sm">
        ${[['Fechas', Object.keys(byDate).length], ['Partidos jugados', played], ['Partidos restantes', t.matches.length - played]]
          .map(([l, v]) => `<div class="td-stat-card"><p class="td-stat-val">${v}</p><p class="td-stat-label">${l}</p></div>`).join('')}
      </div>
      <div>
        ${!t.matches.length ? `<div class="td-empty-state td-empty-state--sm"><span class="td-empty-icon" style="font-size:2rem"><i class="ti ti-calendar"></i></span>
          <p class="td-empty-sub">Todavía no hay partidos. Generá el fixture automático o agregalos a mano.</p></div>` : ''}
        ${fixtureCard(t, field)}
        ${Object.keys(byDate).sort().map(d => `
          <div class="td-date-group">
            <div class="td-date-header"><i class="ti ti-calendar-event"></i>${d === 'sin-fecha' ? 'SIN FECHA' : esc(fmtDate(d, true).toUpperCase())}</div>
            ${byDate[d].map(m => `
              <div class="td-cal-row" data-action="edit-match" data-id="${m.id}" role="button" tabindex="0">
                <div class="td-cal-time"><span class="td-cal-hour">${esc(m.time || '—')}</span><span class="td-cal-dot td-cal-dot--${m.played ? 'played' : 'upcoming'}"></span></div>
                <div class="td-cal-match-info">
                  <div class="td-cal-teams"><span>${teamLabel(m.home)}</span>
                    <span class="td-cal-sep">${m.played ? `<strong>${m.homeScore} — ${m.awayScore}</strong>` : 'VS'}</span><span>${teamLabel(m.away)}</span></div>
                  ${m.venue ? `<span class="td-cal-venue"><i class="ti ti-map-pin"></i>${esc(m.venue)}</span>` : ''}
                </div>
                <div class="td-cal-right"><span class="td-phase-badge ${phaseClass(m.phase)}">${esc(m.phase)}</span><i class="ti ti-pencil td-cal-edit-icon"></i></div>
              </div>`).join('')}
          </div>`).join('')}
        ${t.matches.length ? '<p class="td-cal-tip"><i class="ti ti-info-circle"></i> Hacé clic en un partido para editarlo o cargar el resultado</p>' : ''}
      </div>
      <div class="td-card" style="margin-top:8px">
        <p class="td-card-label"><i class="ti ti-plus"></i> Agregar partido</p>
        <div class="td-ep-row2" style="margin-top:14px">
          <div class="input-group"><select id="am-home" class="input-field">${teamOptions(null)}</select><label class="floating-label" ${FL}>Local</label></div>
          <div class="input-group"><select id="am-away" class="input-field">${teamOptions(null)}</select><label class="floating-label" ${FL}>Visitante</label></div>
        </div>
        <div class="td-ep-row2">
          <div class="input-group"><input type="date" id="am-date" class="input-field" value="${esc(t.startDate || '')}"><label class="floating-label" ${FL}>Fecha</label></div>
          <div class="input-group"><input type="time" id="am-time" class="input-field" value="18:00"><label class="floating-label" ${FL}>Hora</label></div>
        </div>
        <div class="td-ep-row2">
          <div class="input-group"><input type="text" id="am-venue" class="input-field" value="${esc(t.venue || '')}" placeholder=" " maxlength="150"><label class="floating-label" ${FL}>Lugar</label></div>
          <div class="input-group"><input type="text" id="am-phase" class="input-field" value="Fase de Grupos" list="am-phases" maxlength="100"><label class="floating-label" ${FL}>Fase</label>${phaseList('am-phases')}</div>
        </div>
        <button class="td-btn-primary" data-action="add-match"><i class="ti ti-calendar-plus"></i> Agregar partido</button>
      </div>
    </div>
    <div id="td-edit-panel" class="td-edit-panel" aria-hidden="true"><div id="td-edit-panel-inner"></div></div>`;
}

function openMatch(id) {
    const m = tdData.matches.find(x => x.id === id);
    if (!m) return;
    tdEditMatchId = id;
    const locked = tdData.rules.competitive && !tdIsAdmin;
    $('td-edit-panel-inner').innerHTML = `
      <div class="td-ep-header">
        <div><span class="td-phase-badge ${phaseClass(m.phase)}">${esc(m.phase)}</span>
          <h2 class="td-ep-title">${teamLabel(m.home)} vs ${teamLabel(m.away)}</h2></div>
        <button class="td-ep-close" data-action="close-match" aria-label="Cerrar"><i class="ti ti-x"></i></button>
      </div>
      <div class="td-ep-section">
        <p class="td-ep-section-title"><i class="ti ti-switch-horizontal"></i> Equipos</p>
        <div class="td-ep-row2">
          <div class="input-group"><select id="ep-home" class="input-field">${teamOptions(m.home)}</select><label class="floating-label" ${FL}>Local</label></div>
          <div class="input-group"><select id="ep-away" class="input-field">${teamOptions(m.away)}</select><label class="floating-label" ${FL}>Visitante</label></div>
        </div>
      </div>
      <div class="td-ep-section">
        <p class="td-ep-section-title"><i class="ti ti-map-pin"></i> Fecha y lugar</p>
        <div class="td-ep-row2">
          <div class="input-group"><input type="date" id="ep-date" class="input-field" value="${esc(m.date || '')}"><label class="floating-label" ${FL}>Fecha</label></div>
          <div class="input-group"><input type="time" id="ep-time" class="input-field" value="${esc(m.time || '')}"><label class="floating-label" ${FL}>Hora</label></div>
        </div>
        <div class="input-group"><input type="text" id="ep-venue" class="input-field" value="${esc(m.venue || '')}" placeholder=" " maxlength="150"><label class="floating-label" ${FL}>Lugar</label></div>
        <div class="input-group"><input type="text" id="ep-phase" class="input-field" value="${esc(m.phase)}" list="ep-phases" maxlength="100"><label class="floating-label" ${FL}>Fase</label>${phaseList('ep-phases')}</div>
      </div>
      <div class="td-ep-section">
        <p class="td-ep-section-title"><i class="ti ti-gavel"></i> Juez del partido</p>
        <div class="input-group"><select id="ep-judge" class="input-field"><option value="">Sin juez asignado</option>${tdJueces.map(j =>
          `<option value="${esc(j.id)}"${j.id === m.judgeId ? ' selected' : ''}>${esc(j.name)}${j.certified ? ' · certificado' : ''}</option>`).join('')}</select>
          <label for="ep-judge" class="floating-label" ${FL}>Juez</label></div>
        <p class="td-meta-small">${tdJueces.length ? 'El juez asignado puede cargar el resultado desde "Mis arbitrajes".' : 'Todavía no hay jueces aprobados en el sitio.'}</p>
      </div>
      <div class="td-ep-section">
        <p class="td-ep-section-title"><i class="ti ti-chart-bar"></i> Resultado</p>
        <label class="td-ep-toggle-row"><span>Partido jugado</span>
          <span class="relative inline-flex h-7 w-12 shrink-0 items-center">
            <input type="checkbox" id="ep-played" class="peer sr-only" ${m.played ? 'checked' : ''} ${locked ? 'disabled' : ''}>
            <span class="absolute inset-0 rounded-full bg-darkest-hour/15 transition-colors duration-300 peer-checked:bg-sun-glare-dark"></span>
            <span class="absolute left-1 h-5 w-5 rounded-full bg-cloud-dancer shadow transition-transform duration-300 peer-checked:translate-x-5"></span>
          </span></label>
        <div class="td-ep-score-row" id="ep-score-row" style="${m.played ? '' : 'display:none'}">
          <div class="td-ep-score-team"><span class="td-ep-score-name">Local</span><input type="number" id="ep-home-score" class="td-score-input" value="${m.homeScore ?? ''}" min="0" ${locked ? 'disabled' : ''}></div>
          <span class="td-ep-score-dash">—</span>
          <div class="td-ep-score-team"><span class="td-ep-score-name">Visitante</span><input type="number" id="ep-away-score" class="td-score-input" value="${m.awayScore ?? ''}" min="0" ${locked ? 'disabled' : ''}></div>
        </div>
        ${locked ? '<p class="td-meta-small" style="color:var(--blue-violet-dark)"><i class="ti ti-lock"></i> Torneo competitivo: el resultado lo carga el juez del partido.</p>' : ''}
        <p class="td-meta-small">Los resultados quedan registrados de forma permanente: se pueden corregir, pero el partido ya no podrá eliminarse.</p>
      </div>
      <div class="td-ep-section">
        <button class="td-btn-danger" data-action="delete-match" data-id="${m.id}"><i class="ti ti-trash"></i> Eliminar partido</button>
      </div>
      <div class="td-ep-actions">
        <button class="td-btn-ghost" data-action="close-match">Cancelar</button>
        <button class="td-btn-primary" data-action="save-match"><i class="ti ti-device-floppy"></i> Guardar</button>
      </div>`;
    $('ep-played').addEventListener('change', e => { $('ep-score-row').style.display = e.target.checked ? '' : 'none'; });
    $('td-edit-panel').classList.add('open');
    $('td-edit-panel').setAttribute('aria-hidden', 'false');
    $('td-cal-layout')?.classList.add('panel-open');
}
function closeMatch() {
    $('td-edit-panel')?.classList.remove('open');
    $('td-edit-panel')?.setAttribute('aria-hidden', 'true');
    $('td-cal-layout')?.classList.remove('panel-open');
    tdEditMatchId = null;
}

// ═════════════════════════════════════════ ACCIONES (delegación de eventos)
const val = id => $(id)?.value.trim() ?? '';
const tid = () => ({ id: tdData.id });

const ACTIONS = {
    'open': el => openTournament(el.dataset.id),

    'delete-tournament': async el => {
        if (!confirm('¿Eliminar este torneo? Esta acción no se puede deshacer.')) return;
        if (!await call('delete', { method: 'POST', params: { id: el.dataset.id } }, 'Torneo eliminado')) return;
        tdData = null; updateSidebar(); history.replaceState(null, '', location.pathname); show('selector');
    },

    'add-team': async () => {
        const name = val('td-add-name');
        if (!name) { toast('Ingresá el nombre del equipo', 'warn'); return; }
        if (await call('add_team', { method: 'POST', params: tid(), body: { name, players: parseInt(val('td-add-players'), 10) || 1 } }, `${name} agregado ✓`)) {
            await reload(); rerender();
        }
    },
    'rename-team': async el => {
        const e = team(el.dataset.id);
        const name = prompt('Nuevo nombre del equipo:', e?.name || '');
        if (!name || !name.trim()) return;
        if (await call('update_team', { method: 'POST', params: { team_id: el.dataset.id }, body: { name: name.trim() } }, 'Equipo actualizado ✓')) {
            await reload(); rerender();
        }
    },
    'delete-team': async el => {
        const e = team(el.dataset.id);
        if (!confirm(`¿Eliminar "${e?.name}" del torneo?`)) return;
        if (await call('delete_team', { method: 'POST', params: { team_id: el.dataset.id } }, 'Equipo eliminado')) {
            await reload(); rerender();
        }
    },

    'save-config': async () => {
        const body = {
            name: val('cfg-name'), sport: val('cfg-sport'), formatSubId: val('cfg-format'),
            startDate: val('cfg-start'), endDate: val('cfg-end'), department: val('cfg-dep'), venue: val('cfg-venue'),
            description: val('cfg-desc'), maxTeams: parseInt(val('cfg-max'), 10), status: val('cfg-status'),
        };
        if (await call('update', { method: 'POST', params: tid(), body }, 'Cambios guardados ✓')) { await reload(); rerender(); }
    },
    'save-costs': async () => {
        const body = {
            costs: { currency: val('cfg-currency') || 'UYU', entryFee: parseFloat(val('cfg-fee')) || 0, fieldCost: parseFloat(val('cfg-field')) || 0, refereeCost: parseFloat(val('cfg-ref')) || 0 },
            prizes: [1, 2, 3].map(place => ({ place, description: val('cfg-prize-' + place) })).filter(p => p.description),
        };
        if (await call('update', { method: 'POST', params: tid(), body }, 'Costos y premios guardados ✓')) { await reload(); rerender(); }
    },

    'save-rules': async () => {
        const competitive = $('cfg-competitive').checked;
        if (competitive && !val('cfg-main-judge')) { toast('Elegí el juez principal del torneo competitivo', 'warn'); return; }
        const body = { playersPerTeam: parseInt(val('cfg-players'), 10) || 1, competitive, mainJudge: competitive ? val('cfg-main-judge') : '' };
        if ($('cfg-lives')) body.lives = parseInt(val('cfg-lives'), 10) || 3;
        if ($('cfg-groups')) body.groups = val('cfg-groups');
        if (await call('update', { method: 'POST', params: tid(), body }, 'Reglas guardadas ✓')) { await reload(); rerender(); }
    },

    'save-contacts': async () => {
        const body = {
            referee: { name: val('cfg-ref-name'), phone: val('cfg-ref-phone'), email: val('cfg-ref-email') },
            contact: { name: val('cfg-org-name'), phone: val('cfg-org-phone'), email: val('cfg-org-email') },
        };
        if (await call('update', { method: 'POST', params: tid(), body }, 'Árbitro y contacto guardados ✓')) { await reload(); rerender(); }
    },

    'add-match': async () => {
        if (!val('am-date')) { toast('Ingresá la fecha del partido', 'warn'); return; }
        const body = { home: val('am-home'), away: val('am-away'), date: val('am-date'), time: val('am-time'), venue: val('am-venue'), phase: val('am-phase') };
        if (await call('add_match', { method: 'POST', params: tid(), body }, 'Partido agregado ✓')) { await reload(); rerender(); }
    },
    'edit-match': el => openMatch(el.dataset.id),
    'close-match': () => closeMatch(),
    'save-match': async () => {
        const played = $('ep-played').checked;
        const body = {
            home: val('ep-home'), away: val('ep-away'), date: val('ep-date'), time: val('ep-time'),
            venue: val('ep-venue'), phase: val('ep-phase'), judge: val('ep-judge'),
        };
        if (!$('ep-played').disabled) Object.assign(body, {
            played, homeScore: played ? val('ep-home-score') : null, awayScore: played ? val('ep-away-score') : null,
        });
        if (await call('update_match', { method: 'POST', params: { match_id: tdEditMatchId }, body }, 'Partido actualizado ✓')) {
            closeMatch(); await reload(); rerender();
        }
    },
    'generate-fixture': async el => {
        const first = el.dataset.first === '1';
        if (first && !confirm('¿Generar los partidos del torneo? Después podés editarlos uno por uno.')) return;
        const num = (id, def) => { const v = parseInt(val(id), 10); return Number.isNaN(v) ? def : v; };
        const body = { time: val('fx-time'), venue: val('fx-venue'), daysBetween: num('fx-days', 7) };
        if (val('fx-start')) body.startDate = val('fx-start');
        if ($('fx-groups')) body.groups = val('fx-groups');
        if ($('fx-stages')) body.stages = num('fx-stages', 3);
        if ($('fx-minutes')) body.minutesBetween = num('fx-minutes', 60);
        if (await call('generate_fixture', { method: 'POST', params: tid(), body }, first ? 'Fixture generado ✓' : 'Ronda generada ✓')) { await reload(); rerender(); }
    },
    'delete-match': async el => {
        if (!confirm('¿Eliminar este partido?')) return;
        if (await call('delete_match', { method: 'POST', params: { match_id: el.dataset.id } }, 'Partido eliminado')) {
            closeMatch(); await reload(); rerender();
        }
    },
};

root.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (el && root.contains(el) && ACTIONS[el.dataset.action] && !el.disabled) ACTIONS[el.dataset.action](el);
});
root.addEventListener('change', e => {
    if (e.target.id === 'cfg-competitive') $('cfg-judge-group').style.display = e.target.checked ? '' : 'none';
});
root.addEventListener('keydown', e => {
    const el = e.target.closest('[data-action="edit-match"]');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openMatch(el.dataset.id); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && tdEditMatchId !== null) closeMatch(); });

// ═════════════════════════════════════════ INICIO
(async () => {
    const user = await competikaSession();
    if (!user) { competikaGoLogin(); return; }
    tdIsAdmin = !!user.roles?.admin;
    const id = new URLSearchParams(location.search).get('t');
    updateSidebar();
    if (id) await openTournament(id); else show('selector');
})();
})();
