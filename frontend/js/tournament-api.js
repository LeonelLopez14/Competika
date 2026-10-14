/* =====================================================
   COMPETIKA — tournament-api.js
   Acceso a api/tournaments.php y api/session.php.

   Cargar DESPUÉS de main.js:
     <script src="../../js/main.js"></script>
     <script src="../../js/navbar-user.js"></script>
     <script src="../../js/tournament-api.js"></script>
     <!-- solo en el dashboard: -->
     <script src="../../js/tournament-dashboard-db.js"></script>
   ===================================================== */

const COMPETIKA_BASE = document.currentScript ? document.currentScript.src : window.location.href;
const COMPETIKA_API_URL     = new URL('../../api/tournaments.php', COMPETIKA_BASE).href;
const COMPETIKA_SESSION_URL = new URL('../../api/session.php', COMPETIKA_BASE).href;
const COMPETIKA_LOGIN_URL   = new URL('../paginas/login/login.html', COMPETIKA_BASE).href;

async function competikaApi(action, { method = 'GET', params = {}, body = null } = {}) {
    const url = new URL(COMPETIKA_API_URL);
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
        const sel = document.getElementById('tf-currency');
        if (!r.success || !sel || !r.currencies.length) return;
        const actual = sel.value;
        sel.replaceChildren(...r.currencies.map(m => new Option(`${m.code} — ${m.name}`, m.code, false, m.code === actual)));
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
                prizesText: val('tf-prizes'),
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

        // Guardado confirmado por el servidor: recién ahora se muestra el éxito
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
