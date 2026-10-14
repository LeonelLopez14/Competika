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
let tdEditMatchId = null;   // partido abierto en el panel de edición

// ── Utilidades ────────────────────────────────────────────────────────
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);
const money = n => `${tdData?.costs?.currencySymbol || '$'} ${Number(n).toLocaleString('es-UY')}`;
// Monedas habilitadas (tabla moneda): se cargan una vez desde la API
let tdMonedas = [['UYU', 'UYU — Peso uruguayo']];
competikaApi('catalogs').then(r => { if (r.success) tdMonedas = r.currencies.map(m => [m.code, `${m.code} — ${m.name}`]); });
const FL = 'style="top:0;transform:translateY(-50%) scale(0.95);font-size:12px;color:var(--blue-violet-dark)"';
const PHASES = ['Fase de Grupos', 'Fecha 1', 'Fecha 2', 'Cuartos de Final', 'Semifinal', 'Gran Final'];

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
            <div class="td-resumen-row"><span>Inscripción</span><span>${t.costs.entryFee > 0 ? money(t.costs.entryFee) : 'Gratis'}</span></div>
            ${t.costs.fieldCost > 0 ? `<div class="td-resumen-row"><span>Alquiler del lugar</span><span>${money(t.costs.fieldCost)}</span></div>` : ''}
            ${t.costs.refereeCost > 0 ? `<div class="td-resumen-row"><span>Costo de árbitro</span><span>${money(t.costs.refereeCost)}</span></div>` : ''}
          </div>
        </div>
      </div>
      ${t.prizesText ? `<div class="td-card"><p class="td-card-label"><i class="ti ti-medal"></i> Premios</p>
        <p style="margin-top:10px;font-size:14px;line-height:1.7;white-space:pre-wrap">${esc(t.prizesText)}</p></div>` : ''}
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
function renderResultados() {
    const t = tdData;
    const tabla = [...t.teams].sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));
    const played = t.matches.filter(m => m.played);
    content().innerHTML = `
      <div class="td-card">
        <p class="td-card-label"><i class="ti ti-list-numbers"></i> Tabla de posiciones</p>
        ${tabla.length ? `<table class="td-table">
          <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>Pts</th></tr></thead>
          <tbody>${tabla.map((e, i) => `<tr class="${i === 0 && e.points > 0 ? 'td-table-first' : ''}">
            <td class="td-table-pos">${i + 1}</td><td><span class="td-table-emoji">${e.emoji}</span>${esc(e.name)}</td>
            <td>${e.wins + e.draws + e.losses}</td><td>${e.wins}</td><td>${e.draws}</td><td>${e.losses}</td>
            <td class="td-table-pts">${e.points}</td></tr>`).join('')}</tbody></table>`
          : '<p class="td-no-data" style="margin-top:12px">Sin equipos todavía.</p>'}
      </div>
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
          <div class="input-group"><textarea id="cfg-prizes" class="input-field" style="height:auto;min-height:72px;padding-top:16px" maxlength="255" placeholder=" ">${esc(t.prizesText || '')}</textarea><label for="cfg-prizes" class="floating-label" ${FL}>Premios (máx. 255 caracteres)</label></div>
          <button class="td-btn-primary" data-action="save-costs"><i class="ti ti-device-floppy"></i> Guardar costos y premios</button>
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

function renderCalendario() {
    const t = tdData;
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
          <p class="td-empty-sub">Todavía no hay partidos. Agregá el primero abajo.</p></div>` : ''}
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
        <p class="td-ep-section-title"><i class="ti ti-chart-bar"></i> Resultado</p>
        <label class="td-ep-toggle-row"><span>Partido jugado</span>
          <span class="relative inline-flex h-7 w-12 shrink-0 items-center">
            <input type="checkbox" id="ep-played" class="peer sr-only" ${m.played ? 'checked' : ''}>
            <span class="absolute inset-0 rounded-full bg-darkest-hour/15 transition-colors duration-300 peer-checked:bg-sun-glare-dark"></span>
            <span class="absolute left-1 h-5 w-5 rounded-full bg-cloud-dancer shadow transition-transform duration-300 peer-checked:translate-x-5"></span>
          </span></label>
        <div class="td-ep-score-row" id="ep-score-row" style="${m.played ? '' : 'display:none'}">
          <div class="td-ep-score-team"><span class="td-ep-score-name">Local</span><input type="number" id="ep-home-score" class="td-score-input" value="${m.homeScore ?? ''}" min="0"></div>
          <span class="td-ep-score-dash">—</span>
          <div class="td-ep-score-team"><span class="td-ep-score-name">Visitante</span><input type="number" id="ep-away-score" class="td-score-input" value="${m.awayScore ?? ''}" min="0"></div>
        </div>
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
            prizesText: val('cfg-prizes'),
        };
        if (await call('update', { method: 'POST', params: tid(), body }, 'Costos y premios guardados ✓')) { await reload(); rerender(); }
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
            venue: val('ep-venue'), phase: val('ep-phase'), played,
            homeScore: played ? val('ep-home-score') : null, awayScore: played ? val('ep-away-score') : null,
        };
        if (await call('update_match', { method: 'POST', params: { match_id: tdEditMatchId }, body }, 'Partido actualizado ✓')) {
            closeMatch(); await reload(); rerender();
        }
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
root.addEventListener('keydown', e => {
    const el = e.target.closest('[data-action="edit-match"]');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openMatch(el.dataset.id); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && tdEditMatchId !== null) closeMatch(); });

// ═════════════════════════════════════════ INICIO
(async () => {
    const user = await competikaSession();
    if (!user) { competikaGoLogin(); return; }
    const id = new URLSearchParams(location.search).get('t');
    updateSidebar();
    if (id) await openTournament(id); else show('selector');
})();
})();
