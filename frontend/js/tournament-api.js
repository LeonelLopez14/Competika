/* COMPETIKA — tournament-api.js: acceso a la API y formulario de creación. */

const COMPETIKA_BASE = document.currentScript ? document.currentScript.src : window.location.href;
const COMPETIKA_SESSION_URL = new URL('../../api/session.php', COMPETIKA_BASE).href;
const COMPETIKA_LOGIN_URL   = new URL('../paginas/login/login.html', COMPETIKA_BASE).href;

async function competikaApi(action, { method = 'GET', params = {}, body = null, api = 'tournaments' } = {}) {
    const url = new URL(`../../api/${api}.php`, COMPETIKA_BASE);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== null) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    try {
        const res = await fetch(url.toString(), opts);
        const data = await res.json();
        data._status = res.status;
        return data;
    } catch (e) {
        return { success: false, error: 'No se pudo conectar con el servidor.', _status: 0 };
    }
}

/** Sesión actual (la crea controller/login.php). Devuelve null si no hay sesión. */
async function competikaSession() {
    try {
        const res = await fetch(COMPETIKA_SESSION_URL, { credentials: 'same-origin' });
        const data = await res.json();
        return data.logged ? data : null;
    } catch (e) {
        return null;
    }
}

function competikaGoLogin() { window.location.href = COMPETIKA_LOGIN_URL; }

/* ---------- funciones usadas por las páginas ---------- */

async function competikaListPublicTournaments() {
    const r = await competikaApi('list');
    return r.success ? r.tournaments : [];
}

/** Torneos que organiza el usuario logueado. Sin sesión, lleva al login. */
async function competikaListTournaments() {
    const r = await competikaApi('mine');
    if (r._status === 401) { competikaGoLogin(); return []; }
    return r.success ? r.tournaments : [];
}

async function competikaGetTournament(id) {
    const r = await competikaApi('get', { params: { id } });
    return r.success ? r.tournament : null;
}

async function competikaDeleteTournament(id) {
    return competikaApi('delete', { method: 'POST', params: { id } });
}

async function competikaInscribirse(torneoId, teamName = '') {
    const r = await competikaApi('inscribirse', { method: 'POST', body: { torneoId, teamName } });
    if (r._status === 401) competikaGoLogin();
    return r;
}

/* =====================================================
   Formulario de creación (tournament_form.html)
   ===================================================== */
(function initTournamentForm() {
    const form = document.getElementById('tf-form');
    if (!form) return;

    // Monedas desde la base (tabla moneda); las opciones del HTML quedan si la API no responde
    competikaApi('catalogs').then(r => {
        if (r.success) document.dispatchEvent(new CustomEvent('competika:formatos', { detail: r.formats.map(f => f.id) }));
        const sel = document.getElementById('tf-currency');
        if (!r.success || !sel || !r.currencies.length) return;
        const actual = sel.value;
        sel.replaceChildren(...r.currencies.map(m => new Option(`${m.code} — ${m.name}`, m.code, false, m.code === actual)));
    });

    const competitive = document.getElementById('tf-competitive');
    const judgeSel    = document.getElementById('tf-main-judge');
    const show = (id, on) => { const el = document.getElementById(id); if (el) el.hidden = !on; };

    function syncRules() {
        const sub = document.querySelector('input[name="tf-subtype"]:checked')?.value || '';
        show('tf-lives-group', sub === 'vidas');
        show('tf-groups-group', sub === 'grupos');
        show('tf-judge-group', !!competitive?.checked);
        if (judgeSel) judgeSel.required = !!competitive?.checked;
    }
    form.addEventListener('change', e => { if (e.target.name === 'tf-subtype' || e.target === competitive) syncRules(); });
    syncRules();

    competikaApi('judges').then(r => {
        if (!judgeSel || !r.success) return;
        const help = document.getElementById('tf-judge-help');
        if (!r.judges.length) {
            if (help) help.textContent = 'Todavía no hay jueces aprobados en el sitio; sin juez no se puede crear un torneo competitivo.';
            return;
        }
        judgeSel.append(...r.judges.map(j => new Option(j.name + (j.certified ? ' (certificado)' : ''), j.id)));
    });

    // Contacto del organizador: se precarga con los datos de su cuenta (editable)
    competikaSession().then(user => {
        if (!user) {
            const head = document.querySelector('#tf-organizer-name')?.closest('.rounded-2xl')?.querySelector('p');
            if (head) head.innerHTML = 'Necesitás <a class="underline" href="' + COMPETIKA_LOGIN_URL + '">iniciar sesión</a> para crear un torneo.';
            return;
        }
        const pre = (id, v) => { const el = document.getElementById(id); if (el && !el.value) el.value = v || ''; };
        pre('tf-organizer-name',  `${user.nombre || ''} ${user.apellido || ''}`.trim());
        pre('tf-organizer-phone', user.telefono);
        pre('tf-organizer-email', user.email);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = id => document.getElementById(id)?.value.trim() || '';

        const name = val('tf-name');
        if (!name) { document.getElementById('tf-name')?.focus(); return; }
        if (!val('tf-sport')) { alert('Elegí el deporte del torneo.'); document.getElementById('tf-sport')?.focus(); return; }

        // Teléfonos y correos opcionales, pero si se escriben deben ser válidos
        for (const id of ['tf-referee-phone', 'tf-referee-email', 'tf-organizer-phone', 'tf-organizer-email']) {
            const el = document.getElementById(id);
            if (el && el.value.trim() && !el.checkValidity()) {
                alert(`Revisá el campo «${el.labels?.[0]?.textContent.trim() || id}».`);
                el.focus();
                return;
            }
        }

        if (competitive?.checked && !val('tf-main-judge')) {
            alert('Un torneo competitivo necesita un juez principal.');
            judgeSel?.focus();
            return;
        }
        const sub = document.querySelector('input[name="tf-subtype"]:checked')?.value || '';
        const rules = {
            playersPerTeam: parseInt(val('tf-players-per-team'), 10) || 1,
            competitive:    !!competitive?.checked,
            mainJudge:      competitive?.checked ? val('tf-main-judge') : '',
        };
        if (sub === 'vidas')  rules.lives  = parseInt(val('tf-lives'), 10) || 3;
        if (sub === 'grupos') rules.groups = val('tf-groups');
        const prizes = [1, 2, 3]
            .map(place => ({ place, description: val('tf-prize-' + place) }))
            .filter(p => p.description);

        const btn = document.getElementById('tf-submit-btn');
        const btnHtml = btn?.innerHTML;
        if (btn) { btn.disabled = true; btn.textContent = 'Creando…'; }

        const result = await competikaApi('create', {
            method: 'POST',
            body: {
                name,
                sport:       val('tf-sport'),
                description: val('tf-description'),
                formatSubId: document.querySelector('input[name="tf-subtype"]:checked')?.value || '',
                maxTeams:    parseInt(val('tf-max-participants'), 10) || 8,
                startDate:   val('tf-start-date'),
                endDate:     val('tf-end-date'),
                venue:       val('tf-venue'),
                department:  val('tf-department'),
                costs: {
                    currency:    val('tf-currency') || 'UYU',
                    entryFee:    parseFloat(val('tf-entry-fee'))    || 0,
                    fieldCost:   parseFloat(val('tf-field-cost'))   || 0,
                    refereeCost: parseFloat(val('tf-referee-cost')) || 0,
                },
                ...rules,
                prizes,
                referee: {
                    name:  val('tf-referee-name'),
                    phone: val('tf-referee-phone'),
                    email: val('tf-referee-email'),
                },
                contact: {
                    name:  val('tf-organizer-name'),
                    phone: val('tf-organizer-phone'),
                    email: val('tf-organizer-email'),
                },
            },
        });

        if (btn) { btn.disabled = false; btn.innerHTML = btnHtml; }

        if (result._status === 401) {
            alert('Necesitás iniciar sesión para crear un torneo.');
            competikaGoLogin();
            return;
        }
        if (!result.success) {
            alert(result.error || 'No se pudo crear el torneo.');
            return;
        }

        const wizard  = document.getElementById('tf-wizard');
        const success = document.getElementById('tf-success');
        wizard?.classList.add('hidden');
        if (success) {
            const nameEl = success.querySelector('[data-tf-success-name]');
            if (nameEl) nameEl.textContent = name;
            const link = success.querySelector('a');
            if (link) {
                link.href = `../tournament_dashboard/tournament_dashboard.html?t=${encodeURIComponent(result.id)}`;
                link.innerHTML = '<i class="ti ti-layout-dashboard"></i> Ir al Dashboard';
            }
            success.classList.remove('hidden', 'tf-step-anim');
            void success.offsetWidth;
            success.classList.add('tf-step-anim');
            success.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
})();
