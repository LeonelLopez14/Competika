/* COMPETIKA — judge.js: partidos asignados al juez. */
(function () {
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const API = (window.competikaSiteRoot || '../../..') + '/api/judges.php';
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function toast(msg) {
    const el = $('tv-toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2800);
}
function cuando(m) {
    if (!m.date) return 'Fecha a confirmar';
    const [y, mm, d] = m.date.split('-').map(Number);
    return `${d} ${MESES[mm - 1]} ${y}` + (m.time && m.time !== '00:00' ? ` · ${m.time} h` : '');
}

function tarjeta(m) {
    const listo = m.home && m.away;
    return `<li class="tv-partido" data-id="${esc(m.id)}">
        <a class="jz-torneo" href="../tournament_view/tournament_view.html?t=${encodeURIComponent(m.tournamentId)}">${esc(m.tournament)}</a>
        <span class="tv-lado tv-lado--local">${esc(m.homeName)}</span>
        <span class="tv-centro">${m.played ? `<span class="tv-marcador">${esc(m.homeScore)} - ${esc(m.awayScore)}</span>` : '<span class="tv-vs">VS</span>'}</span>
        <span class="tv-lado">${esc(m.awayName)}</span>
        <div class="tv-partido-info"><span><i class="ti ti-calendar"></i>${esc(cuando(m))}</span>
            ${m.venue ? `<span><i class="ti ti-map-pin"></i>${esc(m.venue)}</span>` : ''}<span><i class="ti ti-flag"></i>${esc(m.phase)}</span></div>
        ${listo ? `<div class="jz-carga">
            <input type="number" min="0" step="1" inputmode="numeric" aria-label="Goles/puntos de ${esc(m.homeName)}" value="${m.played ? esc(m.homeScore) : ''}" data-lado="home">
            <span class="tv-vs">-</span>
            <input type="number" min="0" step="1" inputmode="numeric" aria-label="Goles/puntos de ${esc(m.awayName)}" value="${m.played ? esc(m.awayScore) : ''}" data-lado="away">
            <button class="tv-btn tv-btn--primary" data-guardar><i class="ti ti-device-floppy"></i> ${m.played ? 'Corregir' : 'Guardar resultado'}</button>
        </div>` : '<p class="tv-partido-info">Todavía faltan los equipos (se definen en la ronda anterior).</p>'}
    </li>`;
}

const DEPARTAMENTOS = ['Artigas','Canelones','Cerro Largo','Colonia','Durazno','Flores','Florida','Lavalleja','Maldonado','Montevideo','Paysandú','Río Negro','Rivera','Rocha','Salto','San José','Soriano','Tacuarembó','Treinta y Tres'];
let miDepartamento = '';

async function api(accion, cuerpo) {
    try {
        const res = await fetch(`${API}?action=${accion}`, cuerpo === undefined ? { credentials: 'same-origin' }
            : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
        return await res.json();
    } catch (e) { return { success: false, error: 'No se pudo conectar con el servidor.' }; }
}

function fechaCorta(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MESES[m - 1]} ${y}`;
}

function invitacion(i) {
    const fechas = i.start ? fechaCorta(i.start) + (i.end && i.end !== i.start ? ' → ' + fechaCorta(i.end) : '') : 'Fecha a confirmar';
    const lugar = [i.venue, i.department].filter(Boolean).join(' · ');
    let cerca = '';
    if (i.department && miDepartamento) {
        cerca = i.sameDepartment ? '<span class="jz-cerca"><i class="ti ti-check"></i> Es de tu departamento</span>'
                                 : `<span class="jz-lejos"><i class="ti ti-route"></i> Queda en otro departamento (vos: ${esc(miDepartamento)})</span>`;
    } else if (i.department) cerca = '<span class="jz-lejos">Guardá tu departamento para saber si te queda cerca</span>';
    return `<li class="tv-partido" data-torneo="${esc(i.tournamentId)}">
        <a class="jz-torneo" href="../tournament_view/tournament_view.html?t=${encodeURIComponent(i.tournamentId)}">${esc(i.tournament)}</a>
        <div class="tv-partido-info" style="grid-column:1/-1;justify-content:center">
            ${i.sport ? `<span><i class="ti ti-ball-football"></i>${esc(i.sport)}</span>` : ''}
            <span><i class="ti ti-calendar"></i>${esc(fechas)}</span>
            ${lugar ? `<span><i class="ti ti-map-pin"></i>${esc(lugar)}</span>` : ''}
            <span><i class="ti ti-user"></i>Organiza ${esc(i.organizer)}</span>
            ${cerca ? `<span>${cerca}</span>` : ''}
        </div>
        <div class="jz-invit-btns">
            <button class="tv-btn tv-btn--primary" data-resp="1"><i class="ti ti-check"></i> Aceptar</button>
            <button class="tv-btn tv-btn--ghost" data-resp="0"><i class="ti ti-x"></i> Rechazar</button>
        </div>
    </li>`;
}

async function cargarInvitaciones() {
    const r = await api('invitations');
    const lista = r.success ? r.invitations : [];
    $('jz-invitaciones').innerHTML = lista.map(invitacion).join('');
    $('jz-invit-card').hidden = lista.length === 0;
}

async function cargarDepartamento() {
    const r = await api('status');
    miDepartamento = (r.success && r.department) || '';
    $('jz-dep').innerHTML = '<option value="">Sin indicar</option>' +
        DEPARTAMENTOS.map(d => `<option value="${esc(d)}"${d === miDepartamento ? ' selected' : ''}>${esc(d)}</option>`).join('');
}

$('jz-dep-guardar').addEventListener('click', async () => {
    const r = await api('department', { department: $('jz-dep').value });
    if (!r.success) { toast(r.error || 'No se pudo guardar'); return; }
    miDepartamento = r.department || '';
    toast('Departamento guardado ✓');
    cargarInvitaciones();
});

$('jz-invitaciones').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-resp]'); if (!b) return;
    const li = b.closest('[data-torneo]');
    const acepta = b.dataset.resp === '1';
    li.querySelectorAll('button').forEach(x => { x.disabled = true; });
    const r = await api('respond', { tournamentId: Number(li.dataset.torneo), accept: acepta });
    if (!r.success) toast(r.error || 'No se pudo responder');
    else toast(acepta ? 'Aceptaste ser el juez principal ✓' : 'Rechazaste la invitación');
    if (r.success) cargar(); else cargarInvitaciones();
});

// Cinco partidos por página en cada lista
const pagPendientes = crearPaginador({ contenedor: $('jz-pendientes'), porPagina: 5, pintar: tarjeta,
    vacio: '<li class="tv-vacio">No tenés partidos pendientes.</li>' });
const pagJugados = crearPaginador({ contenedor: $('jz-jugados'), porPagina: 5, pintar: tarjeta,
    vacio: '<li class="tv-vacio">Todavía no cargaste resultados.</li>' });

async function cargar() {
    let r;
    try { const res = await fetch(`${API}?action=matches`, { credentials: 'same-origin' }); r = await res.json(); r._status = res.status; }
    catch (e) { r = { success: false }; }
    if (r._status === 403) { $('jz-denegado').hidden = false; $('jz-panel').hidden = true; return; }
    if (!r.success) return;
    const pend = r.matches.filter(m => !m.played), jug = r.matches.filter(m => m.played).reverse();
    pagPendientes.mostrar(pend);
    pagJugados.mostrar(jug);
    $('jz-panel').hidden = false;
    cargarInvitaciones();
}

// El marcador solo admite números enteros: se bloquean el punto, la coma, el signo y la "e"
$('jz-panel').addEventListener('keydown', (e) => {
    if (e.target.matches('[data-lado]') && ['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
});

$('jz-panel').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-guardar]'); if (!btn) return;
    const li = btn.closest('.tv-partido');
    const home = li.querySelector('[data-lado=home]').value, away = li.querySelector('[data-lado=away]').value;
    if (home === '' || away === '') { toast('Ingresá el marcador de los dos equipos'); return; }
    if (!/^\d+$/.test(home) || !/^\d+$/.test(away)) { toast('El marcador debe ser un número entero, sin decimales'); return; }
    btn.disabled = true;
    let r;
    try {
        r = await (await fetch(`${API}?action=result`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId: Number(li.dataset.id), homeScore: Number(home), awayScore: Number(away) }) })).json();
    } catch (err) { r = { success: false, error: 'No se pudo conectar con el servidor.' }; }
    btn.disabled = false;
    if (!r.success) { toast(r.error || 'No se pudo guardar'); return; }
    toast('Resultado guardado ✓');
    cargar();
});

(window.competikaSessionReady || Promise.resolve({ logged: false })).then(s => { if (s && s.logged) cargarDepartamento().then(cargar); });
})();
