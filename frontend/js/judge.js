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

async function cargar() {
    let r;
    try { const res = await fetch(`${API}?action=matches`, { credentials: 'same-origin' }); r = await res.json(); r._status = res.status; }
    catch (e) { r = { success: false }; }
    if (r._status === 403) { $('jz-denegado').hidden = false; $('jz-panel').hidden = true; return; }
    if (!r.success) return;
    const pend = r.matches.filter(m => !m.played), jug = r.matches.filter(m => m.played).reverse();
    $('jz-pendientes').innerHTML = pend.length ? pend.map(tarjeta).join('') : '<li class="tv-vacio">No tenés partidos pendientes.</li>';
    $('jz-jugados').innerHTML = jug.length ? jug.map(tarjeta).join('') : '<li class="tv-vacio">Todavía no cargaste resultados.</li>';
    $('jz-panel').hidden = false;
}

$('jz-panel').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-guardar]'); if (!btn) return;
    const li = btn.closest('.tv-partido');
    const home = li.querySelector('[data-lado=home]').value, away = li.querySelector('[data-lado=away]').value;
    if (home === '' || away === '') { toast('Ingresá el marcador de los dos equipos'); return; }
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

(window.competikaSessionReady || Promise.resolve({ logged: false })).then(s => { if (s && s.logged) cargar(); });
})();
