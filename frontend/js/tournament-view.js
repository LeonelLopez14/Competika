/* =====================================================
   COMPETIKA — tournament-view.js  (tournament_view.html?t=ID)
   Página pública de un torneo: la ve cualquiera (con o sin cuenta).
   Muestra tabla de posiciones, próximos partidos, resultados, costos,
   premios, organizador, árbitro y equipos. Desde acá también se inscribe.

   Requiere, en este orden: main.js, navbar-user.js, tournament-api.js.
   Todo dato que viene de la base se inserta con textContent o esc().
   ===================================================== */
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
    cont.innerHTML = principal + `<button class="tv-btn tv-btn--ghost" id="tv-compartir"><i class="ti ti-share"></i> Compartir</button>`;
    $('tv-inscribirme')?.addEventListener('click', abrirInscripcion);
    $('tv-compartir').addEventListener('click', compartir);
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
function renderTabla() {
    const cont = $('tv-tabla');
    if (!t.teams.length) { cont.innerHTML = '<p class="tv-vacio">Todavía no hay equipos inscriptos.</p>'; return; }
    const filas = [...t.teams].sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));
    const hayJugados = t.matches.some(m => m.played);
    cont.innerHTML = `<div class="tv-tabla-wrap"><table class="tv-tabla">
        <thead><tr><th>#</th><th>Equipo</th><th title="Partidos jugados">PJ</th><th title="Ganados">G</th><th title="Empatados">E</th><th title="Perdidos">P</th><th>Pts</th></tr></thead>
        <tbody>${filas.map((e, i) => `<tr class="${e.id === t.myTeam ? 'tv-mio' : ''} ${i === 0 && hayJugados && e.points > 0 ? 'tv-lider' : ''}">
            <td class="tv-pos">${i + 1}</td>
            <td><span class="tv-equipo"><span aria-hidden="true">${esc(e.emoji)}</span>${esc(e.name)}</span></td>
            <td>${e.wins + e.draws + e.losses}</td><td>${e.wins}</td><td>${e.draws}</td><td>${e.losses}</td>
            <td class="tv-pts">${e.points}</td></tr>`).join('')}</tbody></table></div>`;
}

// ── Partidos ───────────────────────────────────────────
function partidoHtml(m) {
    const mio = t.myTeam && (m.home === t.myTeam || m.away === t.myTeam);
    const ganaLocal = m.played && m.homeScore > m.awayScore;
    const ganaVisit = m.played && m.awayScore > m.homeScore;
    const info = [`<span><i class="ti ti-calendar" aria-hidden="true"></i>${esc(fechaPartido(m))}</span>`];
    if (m.venue) info.push(`<span><i class="ti ti-map-pin" aria-hidden="true"></i>${esc(m.venue)}</span>`);
    if (m.phase) info.push(`<span><i class="ti ti-flag" aria-hidden="true"></i>${esc(m.phase)}</span>`);
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

    $('tv-premios-card').hidden = !t.prizesText;
    $('tv-premios').textContent = t.prizesText || '';

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
}

cargar();
})();
