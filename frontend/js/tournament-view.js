/* COMPETIKA — tournament-view.js: página pública del torneo. */
(function () {
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const torneoId = new URLSearchParams(location.search).get('t');

const ESTADOS = { pending: 'Inscripciones abiertas', active: 'En curso', finished: 'Finalizado' };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function fecha(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MESES[m - 1]} ${y}`;
}
function fechaPartido(p) {
    if (!p.date) return 'Fecha a confirmar';
    const [y, m, d] = p.date.split('-').map(Number);
    const dia = DIAS[new Date(y, m - 1, d).getDay()];
    return `${dia} ${d} ${MESES[m - 1]}` + (p.time && p.time !== '00:00' ? ` · ${p.time} h` : '');
}

function toast(msg) {
    const el = $('tv-toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

let t = null;
const equipo = id => t.teams.find(e => e.id === id);
const nombreEquipo = id => equipo(id)?.name ?? 'Por definir';

// ── Encabezado ─────────────────────────────────────────
function renderHero() {
    document.title = `${t.name} — Competika`;
    $('tv-eyebrow').textContent = [t.sport, t.formatLabel].filter(Boolean).join(' · ') || 'Torneo';
    $('tv-nombre').textContent = t.name;
    const st = $('tv-estado');
    st.textContent = ESTADOS[t.status] ?? t.status;
    st.className = `tv-estado tv-estado--${t.status}`;

    const meta = [];
    const fechas = [fecha(t.startDate), fecha(t.endDate)].filter(Boolean).join(' → ');
    meta.push(['ti-calendar', fechas || 'Fechas a confirmar']);
    meta.push(['ti-map-pin', [t.venue, t.department].filter(Boolean).join(', ') || 'Lugar a confirmar']);
    meta.push(['ti-users', `${t.teams.length} / ${t.maxTeams} equipos`]);
    $('tv-meta').replaceChildren(...meta.map(([icono, texto]) => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="ti ${icono}" aria-hidden="true"></i><span></span>`;
        li.querySelector('span').textContent = texto;
        return li;
    }));

    if (t.rules?.competitive) {
        const b = document.createElement('li');
        b.innerHTML = '<span class="tv-badge-comp"><i class="ti ti-shield-check" aria-hidden="true"></i> Competitivo</span>';
        const juez = document.createElement('span');
        juez.textContent = t.rules.mainJudgeName ? ` Juez: ${t.rules.mainJudgeName}` : '';
        b.append(juez);
        $('tv-meta').append(b);
    }
    if (t.rules?.playersPerTeam > 1) {
        const li = document.createElement('li');
        li.innerHTML = '<i class="ti ti-users-group" aria-hidden="true"></i><span></span>';
        li.querySelector('span').textContent = `Hasta ${t.rules.playersPerTeam} jugadores por equipo`;
        $('tv-meta').append(li);
    }

    const camp = t.champion ? equipo(t.champion) : null;
    $('tv-campeon').hidden = !camp;
    if (camp) $('tv-campeon-nombre').textContent = `${camp.emoji} ${camp.name}`;

    const desc = $('tv-descripcion');
    desc.hidden = !t.description;
    desc.textContent = t.description || '';
    renderAcciones();
}

function renderAcciones() {
    const cont = $('tv-acciones');
    const lleno = t.teams.length >= t.maxTeams;
    let principal;
    if (t.isOwner) {
        principal = `<a class="tv-btn tv-btn--primary" href="../tournament_dashboard/tournament_dashboard.html?t=${encodeURIComponent(t.id)}"><i class="ti ti-settings"></i> Gestionar torneo</a>`;
    } else if (t.joined) {
        principal = `<button class="tv-btn tv-btn--ghost" disabled><i class="ti ti-circle-check"></i> Ya estás inscripto</button>`;
    } else if (t.status !== 'pending') {
        principal = `<button class="tv-btn tv-btn--ghost" disabled><i class="ti ti-lock"></i> Inscripciones cerradas</button>`;
    } else if (lleno) {
        principal = `<button class="tv-btn tv-btn--ghost" disabled><i class="ti ti-lock"></i> Cupo completo</button>`;
    } else {
        principal = `<button class="tv-btn tv-btn--green" id="tv-inscribirme"><i class="ti ti-door-enter"></i> Inscribirme</button>`;
    }
    const seguir = t.isOwner || t.joined ? '' :
        `<button class="tv-btn tv-btn--ghost" id="tv-seguir" aria-pressed="${t.following}"><i class="ti ${t.following ? 'ti-bell-check' : 'ti-bell-plus'}"></i> ${t.following ? 'Siguiendo' : 'Seguir'}${t.followers ? ` · ${t.followers}` : ''}</button>`;
    cont.innerHTML = principal + seguir + `<button class="tv-btn tv-btn--ghost" id="tv-compartir"><i class="ti ti-share"></i> Compartir</button>`;
    $('tv-inscribirme')?.addEventListener('click', abrirInscripcion);
    $('tv-seguir')?.addEventListener('click', alternarSeguir);
    $('tv-compartir').addEventListener('click', compartir);
}

// Seguir: recibe avisos de resultados y cambios del torneo (rol observador)
async function alternarSeguir() {
    const sesion = await (window.competikaSessionReady || Promise.resolve({ logged: false }));
    if (!sesion || !sesion.logged) {
        location.href = `${window.competikaSiteRoot || '../../..'}/frontend/paginas/login/login.html?error=${encodeURIComponent('Iniciá sesión para seguir un torneo.')}&next=${encodeURIComponent(`frontend/paginas/tournament_view/tournament_view.html?t=${t.id}`)}`;
        return;
    }
    const r = await competikaApi('follow', { method: 'POST', body: { torneoId: Number(t.id), follow: !t.following } });
    if (!r.success) { toast(r.error || 'No se pudo actualizar.'); return; }
    t.following = r.following;
    t.followers = r.followers;
    renderAcciones();
    toast(r.following ? 'Ahora seguís este torneo: te avisamos de cada resultado.' : 'Dejaste de seguir el torneo.');
}

async function compartir() {
    const url = location.href;
    try {
        if (navigator.share) { await navigator.share({ title: t.name, url }); return; }
        await navigator.clipboard.writeText(url);
        toast('¡Link copiado!');
    } catch (e) { /* el usuario canceló */ }
}

// ── Tabla de posiciones ────────────────────────────────
function tablaHtml(equipos) {
    const vidas = t.formatSubId === 'vidas';
    const filas = [...equipos].sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));
    const hayJugados = t.matches.some(m => m.played);
    return `<div class="tv-tabla-wrap"><table class="tv-tabla">
        <thead><tr><th>#</th><th>Equipo</th><th title="Partidos jugados">PJ</th><th title="Ganados">G</th><th title="Empatados">E</th><th title="Perdidos">P</th>${vidas ? '<th>Vidas</th>' : ''}<th>Pts</th></tr></thead>
        <tbody>${filas.map((e, i) => `<tr class="${e.id === t.myTeam ? 'tv-mio' : ''} ${i === 0 && hayJugados && e.points > 0 ? 'tv-lider' : ''}">
            <td class="tv-pos">${i + 1}</td>
            <td><span class="tv-equipo"><span aria-hidden="true">${esc(e.emoji)}</span>${esc(e.name)}</span></td>
            <td>${e.wins + e.draws + e.losses}</td><td>${e.wins}</td><td>${e.draws}</td><td>${e.losses}</td>
            ${vidas ? `<td title="${e.livesLeft || 0} vidas">${'❤'.repeat(e.livesLeft || 0) || '—'}</td>` : ''}
            <td class="tv-pts">${e.points}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderTabla() {
    const cont = $('tv-tabla');
    if (!t.teams.length) { cont.innerHTML = '<p class="tv-vacio">Todavía no hay equipos inscriptos.</p>'; return; }
    const grupos = [...new Set(t.teams.map(e => e.group).filter(Boolean))].sort();
    cont.innerHTML = grupos.length
        ? grupos.map(g => `<p class="tv-grupo-titulo">Grupo ${esc(g)}</p>${tablaHtml(t.teams.filter(e => e.group === g))}`).join('')
        : tablaHtml(t.teams);
}

// ── Partidos ───────────────────────────────────────────
function partidoHtml(m) {
    const mio = t.myTeam && (m.home === t.myTeam || m.away === t.myTeam);
    const ganaLocal = m.played && m.homeScore > m.awayScore;
    const ganaVisit = m.played && m.awayScore > m.homeScore;
    const info = [`<span><i class="ti ti-calendar" aria-hidden="true"></i>${esc(fechaPartido(m))}</span>`];
    if (m.venue) info.push(`<span><i class="ti ti-map-pin" aria-hidden="true"></i>${esc(m.venue)}</span>`);
    if (m.phase) info.push(`<span><i class="ti ti-flag" aria-hidden="true"></i>${esc(m.phase)}</span>`);
    if (m.judgeName) info.push(`<span><i class="ti ti-gavel" aria-hidden="true"></i>${esc(m.judgeName)}</span>`);
    return `<li class="tv-partido ${mio ? 'tv-mio' : ''}">
        <span class="tv-lado tv-lado--local ${ganaLocal ? 'tv-gana' : ''}">${esc(nombreEquipo(m.home))}</span>
        <span class="tv-centro">${m.played
            ? `<span class="tv-marcador">${esc(m.homeScore)} - ${esc(m.awayScore)}</span>`
            : '<span class="tv-vs">VS</span>'}</span>
        <span class="tv-lado ${ganaVisit ? 'tv-gana' : ''}">${esc(nombreEquipo(m.away))}</span>
        <div class="tv-partido-info">${info.join('')}</div>
    </li>`;
}

function renderPartidos() {
    const proximos = t.matches.filter(m => !m.played);
    const jugados = t.matches.filter(m => m.played).reverse();      // el más reciente primero
    $('tv-proximos').innerHTML = proximos.length
        ? `<ul class="tv-partidos">${proximos.map(partidoHtml).join('')}</ul>`
        : '<p class="tv-vacio">No hay partidos programados.</p>';
    $('tv-resultados').innerHTML = jugados.length
        ? `<ul class="tv-partidos">${jugados.map(partidoHtml).join('')}</ul>`
        : '<p class="tv-vacio">Todavía no se jugó ningún partido.</p>';
}

// ── Información lateral ────────────────────────────────
function persona(p) {
    const partes = [`<strong>${esc(p.name)}</strong>`];
    if (p.phone) partes.push(`<a href="tel:${esc(p.phone.replace(/[^\d+]/g, ''))}"><i class="ti ti-phone" aria-hidden="true"></i>${esc(p.phone)}</a>`);
    if (p.email) partes.push(`<a href="mailto:${esc(p.email)}"><i class="ti ti-mail" aria-hidden="true"></i>${esc(p.email)}</a>`);
    return `<div class="tv-persona">${partes.join('')}</div>`;
}

function renderLateral() {
    const c = t.costs;
    const dinero = n => n > 0 ? `${c.currencySymbol || '$'} ${Number(n).toLocaleString('es-UY')}` : null;
    const filas = [['Costo', dinero(c.entryFee) ?? 'Gratis'], ['Cupo', `${t.maxTeams} equipos`], ['Lugares libres', Math.max(0, t.maxTeams - t.teams.length)]];
    if (c.currency) filas.push(['Moneda', c.currency]);
    $('tv-costos').innerHTML = filas.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');

    const premios = t.prizes || [];
    $('tv-premios-card').hidden = !premios.length;
    $('tv-premios').innerHTML = premios.map(p => `<li><span class="tv-puesto">${['🥇', '🥈', '🥉'][p.place - 1] || p.place + '.º'}</span><span>${esc(p.description)}</span></li>`).join('');

    $('tv-organizador').innerHTML = t.organizer?.name ? persona(t.organizer) : '<p class="tv-vacio">Sin datos de contacto.</p>';
    const arb = t.referee;
    $('tv-arbitro-card').hidden = !arb?.name;
    if (arb?.name) $('tv-arbitro').innerHTML = persona(arb);

    $('tv-equipos-count').textContent = `${t.teams.length}/${t.maxTeams}`;
    $('tv-equipos').innerHTML = t.teams.length
        ? t.teams.map(e => `<li class="${e.id === t.myTeam ? 'tv-mio' : ''}"><span aria-hidden="true">${esc(e.emoji)}</span>${esc(e.name)}</li>`).join('')
        : '<li class="tv-vacio">Sé el primero en inscribirte.</li>';
}

// ── Inscripción ────────────────────────────────────────
async function abrirInscripcion() {
    const sesion = await (window.competikaSessionReady || Promise.resolve({ logged: false }));
    if (!sesion || !sesion.logged) {
        location.href = `${window.competikaSiteRoot || '../../..'}/frontend/paginas/login/login.html?error=${encodeURIComponent('Iniciá sesión para inscribirte en un torneo.')}&next=${encodeURIComponent(`frontend/paginas/tournament_view/tournament_view.html?t=${t.id}`)}`;
        return;
    }
    $('tv-dialog-sub').textContent = `«${t.name}»`;
    $('tv-dialog-error').textContent = '';
    $('tv-team').value = '';
    const nota = [];
    if (t.rules?.playersPerTeam > 1) nota.push(`Quedás como capitán: después podés invitar hasta ${t.rules.playersPerTeam - 1} jugador${t.rules.playersPerTeam > 2 ? 'es' : ''} más.`);
    if (t.rules?.competitive) nota.push('Torneo competitivo: necesitás el carné de deportista vigente.');
    $('tv-dialog-nota').textContent = nota.join(' ');
    $('tv-dialog').showModal();
    $('tv-team').focus();
}

$('tv-cancel').addEventListener('click', () => $('tv-dialog').close());
$('tv-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('tv-confirm');
    btn.disabled = true;
    const r = await competikaInscribirse(Number(t.id), $('tv-team').value.trim());
    btn.disabled = false;
    if (!r.success) { $('tv-dialog-error').textContent = r.error || 'No se pudo completar la inscripción.'; return; }
    $('tv-dialog').close();
    toast('¡Listo! Ya estás inscripto.');
    await cargar();
});

// ── Mi equipo e invitaciones ──────────────────────────
const equipos = (action, opts = {}) => competikaApi(action, { api: 'teams', ...opts });

async function accionEquipo(action, body, okMsg) {
    const r = await equipos(action, { method: 'POST', body });
    if (!r.success) { toast(r.error || 'No se pudo completar la acción.'); return false; }
    if (okMsg) toast(okMsg);
    await cargar();
    return true;
}

async function renderMiEquipo() {
    const card = $('tv-miequipo-card'), inv = $('tv-invitaciones');
    card.hidden = true; inv.hidden = true;
    const sesion = await (window.competikaSessionReady || Promise.resolve(null));
    if (!sesion || !sesion.logged) return;
    const r = await equipos('mine', { params: { id: t.id } });
    if (!r.success) return;

    inv.hidden = !r.invitations.length;
    inv.innerHTML = r.invitations.map(i => `<div class="tv-invitacion">
        <p><i class="ti ti-mail-forward" aria-hidden="true"></i> <strong>${esc(i.from)}</strong> te invitó al equipo <strong>${esc(i.team)}</strong>.</p>
        <div class="tv-acciones-mini">
          <button class="tv-btn tv-btn--ghost tv-btn--sm" data-inv="${esc(i.id)}" data-accept="0">Rechazar</button>
          <button class="tv-btn tv-btn--green tv-btn--sm" data-inv="${esc(i.id)}" data-accept="1"><i class="ti ti-check"></i> Aceptar</button>
        </div></div>`).join('');

    const eq = r.team;
    if (!eq) return;
    card.hidden = false;
    $('tv-miequipo-count').textContent = `${eq.members.length}/${eq.max}`;
    const libres = eq.max - eq.members.length - eq.pending.length;
    $('tv-miequipo').innerHTML = `
      <ul class="tv-integrantes">
        ${eq.members.map(m => `<li><span>${esc(m.name)}${m.me ? ' (vos)' : ''}</span><span>
          ${m.captain ? '<span class="tv-tag">Capitán</span>' : ''}
          ${t.rules?.competitive && !m.carne ? '<span class="tv-tag" title="Sin carné de deportista">Sin carné</span>' : ''}
          ${eq.isCaptain && !m.captain ? `<button class="tv-icon-btn" data-quitar="${esc(m.key)}" title="Quitar del equipo" aria-label="Quitar a ${esc(m.name)}"><i class="ti ti-user-minus"></i></button>` : ''}
        </span></li>`).join('')}
        ${eq.pending.map(p => `<li class="tv-pendiente"><span>${esc(p.name)} · invitación pendiente</span>
          <button class="tv-icon-btn" data-cancelar="${esc(p.id)}" title="Cancelar invitación" aria-label="Cancelar invitación a ${esc(p.name)}"><i class="ti ti-x"></i></button></li>`).join('')}
      </ul>
      ${eq.isCaptain && libres > 0 && t.status !== 'finished' ? `<form class="tv-invitar" id="tv-invitar">
          <input type="email" id="tv-invitar-email" placeholder="Correo del jugador" required maxlength="150" aria-label="Correo del jugador a invitar">
          <button class="tv-btn tv-btn--primary tv-btn--sm" type="submit"><i class="ti ti-send"></i> Invitar</button></form>` : ''}
      ${eq.isCaptain && eq.max === 1 ? '<p class="tv-vacio">Este torneo es individual.</p>' : ''}
      ${!eq.isCaptain ? '<button class="tv-btn tv-btn--ghost tv-btn--sm" id="tv-salir"><i class="ti ti-logout"></i> Dejar el equipo</button>' : ''}`;

    $('tv-invitar')?.addEventListener('submit', async e => {
        e.preventDefault();
        accionEquipo('invite', { torneoId: Number(t.id), email: $('tv-invitar-email').value.trim() }, 'Invitación enviada.');
    });
    $('tv-salir')?.addEventListener('click', () => confirm('¿Dejar el equipo?') && accionEquipo('leave', { torneoId: Number(t.id) }, 'Dejaste el equipo.'));
}

document.addEventListener('click', e => {
    const b = e.target.closest('[data-inv],[data-quitar],[data-cancelar]');
    if (!b) return;
    if (b.dataset.inv) accionEquipo('respond', { id: Number(b.dataset.inv), accept: b.dataset.accept === '1' }, b.dataset.accept === '1' ? '¡Te sumaste al equipo!' : 'Invitación rechazada.');
    else if (b.dataset.quitar) confirm('¿Quitar a este jugador del equipo?') && accionEquipo('remove', { torneoId: Number(t.id), member: b.dataset.quitar }, 'Jugador quitado.');
    else if (b.dataset.cancelar) accionEquipo('cancel', { id: Number(b.dataset.cancelar) }, 'Invitación cancelada.');
});

// ── Carga ──────────────────────────────────────────────
async function cargar() {
    const r = torneoId ? await competikaApi('get', { params: { id: torneoId } }) : { success: false };
    $('tv-loading').hidden = true;
    if (!r.success) { $('tv-error').hidden = false; return; }
    t = r.tournament;
    renderHero();
    renderTabla();
    renderPartidos();
    renderLateral();
    $('tv-torneo').hidden = false;
    renderMiEquipo();
}

cargar();
})();
