/* =====================================================
   COMPETIKA — tournament-dashboard-db.js
   -----------------------------------------------------
   Reemplaza POR COMPLETO el bloque de tournament_dashboard
   que antes vivía en main.js (el que empezaba con
   "const tdDashboard = document.getElementById('td-dashboard');").

   Toda la data (torneo, equipos, partidos, premios,
   organizador) se lee y se escribe contra la API PHP
   (api/tournaments.php), no contra localStorage.

   REQUIERE que este archivo se cargue DESPUÉS de:
     1) main.js
     2) tournament-api.js   (define competikaApi, competikaListTournaments,
                              competikaGetTournament, competikaDeleteTournament)

   IMPORTANTE: en main.js hay que BORRAR el bloque viejo
   (desde "const tdDashboard = ..." hasta el final del
   archivo). Si dejás los dos, el navegador tira
   "Identifier has already been declared" porque ambos
   declaran las mismas variables/funciones a nivel global.
   ===================================================== */

const tdDashboard = document.getElementById('td-dashboard');

if (tdDashboard) {

// ── Torneo activo en memoria (se recarga desde la API tras cada cambio) ──
let tdData = null;
let tdCurrentSection = 'overview';
let tdCurrentEditId  = null;

// ── Helpers de lectura sobre tdData (sin llamadas a red) ─────────────
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

// ── Recarga completa del torneo activo desde la API ───────────────────
async function tdReload() {
    if (!tdData?.id) return;
    tdData = await competikaGetTournament(tdData.id);
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
const tdContent    = document.getElementById('td-section-content');
const tdPageTitle  = document.getElementById('td-page-title');
const tdBreadcrumb = document.getElementById('td-breadcrumb');

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
// SELECTOR DE TORNEOS (lista real desde la BD)
// ═══════════════════════════════════════════════════════════════════════
async function tdRenderSelector() {
    tdContent.innerHTML = `<p class="td-no-data">Cargando torneos…</p>`;
    let all = [];
    try {
        all = await competikaListTournaments();
    } catch (e) {
        tdContent.innerHTML = `<p class="td-no-data">No se pudo conectar con el servidor. Revisá que la API esté disponible.</p>`;
        return;
    }

    if (!all.length) {
        tdContent.innerHTML = `
        <div class="td-empty-state">
            <span class="td-empty-icon"><i class="ti ti-tournament"></i></span>
            <h2 class="td-empty-title">Todavía no creaste ningún torneo</h2>
            <p class="td-empty-sub">Creá tu primer torneo y volvé acá para gestionarlo.</p>
            <a href="../tournament_form/tournament_form.html" class="td-btn-primary">
                <i class="ti ti-plus"></i> Crear torneo
            </a>
        </div>`;
        return;
    }

    tdContent.innerHTML = `
    <div class="td-selector-header">
        <a href="../tournament_form/tournament_form.html" class="td-btn-primary">
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
                <span><i class="ti ti-users"></i>${t.teamCount || 0} / ${t.maxTeams} equipos</span>
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

    tdContent.querySelectorAll('.td-sc-enter').forEach(btn => {
        btn.addEventListener('click', () => tdSelectTournament(btn.dataset.tid));
    });
    tdContent.querySelectorAll('.td-sc-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('¿Eliminar este torneo? Esta acción no se puede deshacer.')) return;
            await competikaDeleteTournament(btn.dataset.tid);
            tdShowToast('Torneo eliminado', 'warn');
            tdRenderSelector();
        });
    });
}

async function tdSelectTournament(id) {
    tdData = await competikaGetTournament(id);
    if (!tdData) { tdShowToast('Torneo no encontrado', 'warn'); return; }
    tdUpdateSidebar();
    tdShowSection('overview');
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

window.tdApproveTeam = async function(id, approve) {
    if (!tdData) return;
    const t = tdData.teams.find(t => t.id === id);
    if (!t) return;
    await competikaApi('update_team', { method: 'POST', params: { team_id: id }, body: { status: approve ? 'accepted' : 'rejected' } });
    await tdReload();
    tdRenderParticipantes();
    tdShowToast(approve ? `${t.name} aceptado ✓` : `${t.name} rechazado`, approve ? 'ok' : 'warn');
};

window.tdRemoveTeam = async function(id) {
    if (!tdData) return;
    const t = tdData.teams.find(t => t.id === id);
    if (!t || !confirm(`¿Eliminar "${t.name}"?`)) return;
    await competikaApi('delete_team', { method: 'POST', params: { team_id: id } });
    await tdReload();
    tdRenderParticipantes();
    tdShowToast(`${t.name} eliminado`, 'warn');
};

window.tdAddTeam = async function() {
    if (!tdData) return;
    const name    = document.getElementById('td-add-name')?.value.trim();
    const players = parseInt(document.getElementById('td-add-players')?.value) || 0;
    const group   = document.getElementById('td-add-group')?.value.trim() || '';
    if (!name) { tdShowToast('Ingresá el nombre del equipo', 'warn'); return; }
    if (tdData.teams.filter(t => t.status !== 'rejected').length >= tdData.maxTeams) {
        tdShowToast(`Límite de ${tdData.maxTeams} equipos alcanzado`, 'warn'); return;
    }
    const EMOJIS = ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🥍','🏒'];
    const emoji = EMOJIS[tdData.teams.length % EMOJIS.length];
    const res = await competikaApi('add_team', { method: 'POST', params: { id: tdData.id }, body: { name, players, group, status: 'accepted', emoji } });
    if (!res.success) { tdShowToast(res.error || 'No se pudo agregar el equipo', 'warn'); return; }
    await tdReload();
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

window.tdSaveConfig = async function() {
    if (!tdData) return;
    const payload = {
        name:      document.getElementById('cfg-name')?.value.trim()   || tdData.name,
        sport:     document.getElementById('cfg-sport')?.value.trim()  || '',
        venue:     document.getElementById('cfg-venue')?.value.trim()  || '',
        maxTeams:  parseInt(document.getElementById('cfg-max')?.value) || tdData.maxTeams,
        formatSubId: document.getElementById('cfg-format')?.value      || tdData.formatSubId,
        status:    document.getElementById('cfg-status')?.value        || tdData.status,
    };
    const sub = tournamentTypes.flatMap(t => t.subtipos).find(s => s.id === payload.formatSubId);
    if (sub) payload.formatLabel = sub.title;

    const res = await competikaApi('update', { method: 'POST', params: { id: tdData.id }, body: payload });
    if (!res.success) { tdShowToast(res.error || 'No se pudo guardar', 'warn'); return; }
    await tdReload();
    tdUpdateSidebar();
    tdShowToast('Cambios guardados ✓');
};

window.tdSaveOrganizer = async function() {
    if (!tdData) return;
    const organizer = {
        name:  document.getElementById('cfg-org-name')?.value.trim()  || '',
        phone: document.getElementById('cfg-org-phone')?.value.trim() || '',
        email: document.getElementById('cfg-org-email')?.value.trim() || '',
    };
    await competikaApi('update', { method: 'POST', params: { id: tdData.id }, body: { organizer } });
    await tdReload();
    tdShowToast('Contacto guardado ✓');
};

window.tdSavePrizes = async function() {
    if (!tdData) return;
    const prizes = [1,2,3].map(n => ({
        place:  n,
        title:  document.getElementById(`cfg-p${n}-title`)?.value.trim()  || '',
        detail: document.getElementById(`cfg-p${n}-detail`)?.value.trim() || '',
    })).filter(p => p.title);
    await competikaApi('update', { method: 'POST', params: { id: tdData.id }, body: { prizes } });
    await tdReload();
    tdShowToast('Premios guardados ✓');
};

window.tdConfirmDelete = async function() {
    if (!tdData) return;
    if (!confirm(`¿Eliminar "${tdData.name}"? Esta acción no se puede deshacer.`)) return;
    await competikaDeleteTournament(tdData.id);
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

window.tdAddMatch = async function() {
    if (!tdData) return;
    const homeVal = document.getElementById('am-home')?.value;
    const awayVal = document.getElementById('am-away')?.value;
    const date    = document.getElementById('am-date')?.value;
    const time    = document.getElementById('am-time')?.value || '18:00';
    const venue   = document.getElementById('am-venue')?.value.trim() || tdData.venue || '';
    const phase   = document.getElementById('am-phase')?.value.trim() || 'Fase de Grupos';

    if (!date) { tdShowToast('Ingresá la fecha del partido', 'warn'); return; }

    const res = await competikaApi('add_match', {
        method: 'POST',
        params: { id: tdData.id },
        body: { home: homeVal, away: awayVal, date, time, venue, phase },
    });
    if (!res.success) { tdShowToast(res.error || 'No se pudo agregar el partido', 'warn'); return; }
    await tdReload();
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

window.tdSaveMatch = async function() {
    if (!tdData) return;
    const m = tdData.matches.find(x => x.id === tdCurrentEditId);
    if (!m) return;

    const played = document.getElementById('ep-played')?.checked ?? false;
    const payload = {
        home:      document.getElementById('ep-home')?.value || null,
        away:      document.getElementById('ep-away')?.value || null,
        date:      document.getElementById('ep-date')?.value || m.date,
        time:      document.getElementById('ep-time')?.value || m.time,
        venue:     document.getElementById('ep-venue')?.value.trim() || '',
        phase:     document.getElementById('ep-phase')?.value.trim() || m.phase,
        referee:   document.getElementById('ep-referee')?.value.trim() || '',
        refPhone:  document.getElementById('ep-ref-phone')?.value.trim() || '',
        venueCost: parseFloat(document.getElementById('ep-venue-cost')?.value) || 0,
        refCost:   parseFloat(document.getElementById('ep-ref-cost')?.value) || 0,
        notes:     document.getElementById('ep-notes')?.value.trim() || '',
        played,
        homeScore: played ? (parseInt(document.getElementById('ep-home-score')?.value) ?? null) : null,
        awayScore: played ? (parseInt(document.getElementById('ep-away-score')?.value) ?? null) : null,
    };

    const res = await competikaApi('update_match', { method: 'POST', params: { match_id: tdCurrentEditId }, body: payload });
    if (!res.success) { tdShowToast(res.error || 'No se pudo guardar el partido', 'warn'); return; }
    await tdReload();
    tdCloseMatchEdit();
    tdRenderCalendario();
    tdShowToast('Partido actualizado ✓');
};

window.tdDeleteMatch = async function(id) {
    if (!tdData || !confirm('¿Eliminar este partido?')) return;
    await competikaApi('delete_match', { method: 'POST', params: { match_id: id } });
    await tdReload();
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
(async () => {
    const tdUrlParam = new URLSearchParams(location.search).get('t');
    if (tdUrlParam) {
        tdData = await competikaGetTournament(tdUrlParam);
        if (tdData) { tdUpdateSidebar(); tdShowSection('overview'); }
        else { tdUpdateSidebar(); tdShowSection('selector'); }
    } else {
        tdUpdateSidebar();
        tdShowSection('selector');
    }
})();

} // end if (tdDashboard)
