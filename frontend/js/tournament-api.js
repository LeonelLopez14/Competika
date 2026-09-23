/* =====================================================
   COMPETIKA — tournament-api.js
   ===================================================== */
const COMPETIKA_API_BASE = new URL(
    '../../api/tournaments.php',
    document.currentScript ? document.currentScript.src : window.location.href
).href;
 
async function competikaApi(action, { method = 'GET', params = {}, body = null } = {}) {
    const url = new URL(COMPETIKA_API_BASE, window.location.origin);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
 
    const opts = { method, headers: {} };
    if (body !== null) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
 
    const res = await fetch(url.toString(), opts);
    const data = await res.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));
    if (!res.ok && !('success' in data)) {
        throw new Error(`Error HTTP ${res.status}`);
    }
    return data;
}
 
/* =====================================================
   1) FORMULARIO DE CREACIÓN 
   ===================================================== */
(function initTournamentCreateApi() {
    const form = document.getElementById('tf-form');
    if (!form) return;
 
    form.addEventListener('submit', async (e) => {

        const name = document.getElementById('tf-name')?.value.trim();
        if (!name) return; 
 
        const val = id => document.getElementById(id)?.value.trim() || '';
        const subChecked = document.querySelector('input[name="tf-subtype"]:checked');
        const formatChecked = document.querySelector('input[name="tf-format"]:checked');
 
        const payload = {
            name,
            formatTypeId: formatChecked?.value || '',
            formatSubId:  subChecked?.value || '',
            formatLabel:  subChecked?.closest('label')?.querySelector('span')?.textContent || '',
            maxTeams:     parseInt(val('tf-max-participants')) || 8,
            startDate:    val('tf-start-date'),
            costs: {
                entryFee:    parseFloat(val('tf-entry-fee'))    || 0,
                currency:    val('tf-currency'),
                fieldCost:   parseFloat(val('tf-field-cost'))   || 0,
                refereeCost: parseFloat(val('tf-referee-cost')) || 0,
            },
            referee: {
                name:  val('tf-referee-name'),
                phone: val('tf-referee-phone'),
                email: val('tf-referee-email'),
            },
            prizesText: val('tf-prizes'),
            organizer: {
                name:  val('tf-organizer-name'),
                phone: val('tf-organizer-phone'),
                email: val('tf-organizer-email'),
            },
        };
 
        try {
            const result = await competikaApi('create', { method: 'POST', body: payload });
            if (result.success) {
                sessionStorage.setItem('competika_last_created_db_id', result.id);
                const dashLink = document.querySelector('#tf-success a');
                if (dashLink) dashLink.href = `../tournament_dashboard/tournament_dashboard.html?t=${result.id}&src=db`;
            } else {
                console.error('No se pudo guardar el torneo en la base de datos:', result.error);
            }
        } catch (err) {
            console.error('Error de red al crear el torneo:', err);
        }
    });
})();
 
/* =====================================================
   2) LISTADO DE TORNEOS DEL USUARIO 
   ===================================================== */
async function competikaListTournaments() {
    const result = await competikaApi('list');
    return result.success ? result.tournaments : [];
}
 
async function competikaGetTournament(id) {
    const result = await competikaApi('get', { params: { id } });
    return result.success ? result.tournament : null;
}
 
async function competikaDeleteTournament(id) {
    return competikaApi('delete', { method: 'POST', params: { id } });
}