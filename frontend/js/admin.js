/* COMPETIKA — admin.js: panel de administración. */
(function () {
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const API = (window.competikaSiteRoot || '../../..') + '/api/admin.php';
const SITE = window.competikaSiteRoot || '../../..';

async function api(action, { method = 'GET', params = {}, body = null } = {}) {
    const url = new URL(API, location.href);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    try {
        const res = await fetch(url, { method, credentials: 'same-origin',
            headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : null });
        const data = await res.json();
        data._status = res.status;
        return data;
    } catch (e) { return { success: false, error: 'No se pudo conectar con el servidor.' }; }
}
const post = (action, body) => api(action, { method: 'POST', body });

function toast(msg) {
    const el = $('tv-toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2800);
}
const fecha = s => s ? new Date(s.replace(' ', 'T')).toLocaleString('es-UY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const fechaCorta = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha';

/** Ejecuta una acción; muestra el error o el mensaje de éxito y recarga lo indicado. */
async function accion(action, body, okMsg, ...recargar) {
    const r = await post(action, body);
    if (!r.success) { toast(r.error || 'No se pudo completar la acción.'); return false; }
    toast(okMsg);
    await Promise.all([cargarResumen(), ...recargar.map(f => f())]);
    return true;
}

// ── Diálogo con un campo de texto (motivo, correo…) ──
let resolverDialogo = null;
function pedir({ titulo, sub = '', label, confirmar, minimo = 1, tipo = 'text' }) {
    $('adm-dialog-title').textContent = titulo;
    $('adm-dialog-sub').textContent = sub;
    $('adm-campo-label').textContent = label;
    $('adm-campo').type = tipo;
    $('adm-campo').value = '';
    $('adm-confirm').textContent = confirmar;
    $('adm-error').textContent = '';
    $('adm-dialog').dataset.minimo = minimo;
    $('adm-dialog').showModal();
    $('adm-campo').focus();
    return new Promise(res => { resolverDialogo = res; });
}
function cerrarDialogo(valor) {
    $('adm-dialog').close();
    resolverDialogo?.(valor);
    resolverDialogo = null;
}
$('adm-cancel').addEventListener('click', () => cerrarDialogo(null));
$('adm-dialog').addEventListener('cancel', () => cerrarDialogo(null));
$('adm-form').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('adm-campo').value.trim();
    if (v.length < Number($('adm-dialog').dataset.minimo) || !$('adm-campo').checkValidity()) {
        $('adm-error').textContent = 'Completá el campo correctamente.';
        return;
    }
    cerrarDialogo(v);
});

// ── Resumen ──
async function cargarResumen() {
    const r = await api('summary');
    if (r._status === 403) { $('adm-denegado').hidden = false; return false; }
    if (!r.success) return false;
    const t = r.totals;
    $('adm-totales').innerHTML = [['usuarios', 'Usuarios'], ['torneos', 'Torneos'], ['jueces', 'Jueces'], ['pendientes', 'Solicitudes pendientes'], ['revision', 'Torneos por aprobar'],
        ['mensajes', 'Mensajes sin leer'], ['suspendidos', 'Cuentas suspendidas']]
        .map(([k, l]) => `<li><strong>${esc(t[k])}</strong><span>${l}</span></li>`).join('');
    $('adm-badge-pend').textContent = t.pendientes || '';
    $('adm-badge-msg').textContent = t.mensajes || '';
    $('adm-badge-rev').textContent = t.revision || '';
    $('adm-panel').hidden = false;
    return true;
}

// ── Paginación en el navegador ──
const paginasAdm = {};
const reiniciarPagina = n => { paginasAdm[n] = 1; };
function paginar(ul, nombre, items, pintar, tam = 10) {
    const caja = $('adm-pager-' + nombre);
    const total = Math.max(1, Math.ceil(items.length / tam));
    const pag = Math.min(paginasAdm[nombre] || 1, total);
    paginasAdm[nombre] = pag;
    pintar(items.slice((pag - 1) * tam, pag * tam));
    if (!caja) return;
    if (total === 1) { caja.innerHTML = ''; return; }
    caja.innerHTML = `
        <button class="tv-btn tv-btn--ghost" data-d="-1" ${pag === 1 ? 'disabled' : ''}><i class="ti ti-chevron-left"></i> Anterior</button>
        <span class="adm-pager-info">Página ${pag} de ${total}</span>
        <button class="tv-btn tv-btn--ghost" data-d="1" ${pag === total ? 'disabled' : ''}>Siguiente <i class="ti ti-chevron-right"></i></button>`;
    caja.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        paginasAdm[nombre] = pag + Number(b.dataset.d);
        paginar(ul, nombre, items, pintar, tam);
    }));
}

// ── Solicitudes de juez ──
let estadoFiltro = 'pendiente';
async function cargarSolicitudes() {
    const r = await api('requests', { params: estadoFiltro ? { estado: estadoFiltro } : {} });
    const ul = $('adm-lista-solicitudes');
    if (!r.success) { ul.innerHTML = `<li class="tv-vacio">${esc(r.error)}</li>`; return; }
    if (!r.requests.length) { ul.innerHTML = '<li class="tv-vacio">No hay solicitudes en esta lista.</li>'; $('adm-pager-solicitudes').innerHTML = ''; return; }
    paginar(ul, 'solicitudes', r.requests, p => { ul.innerHTML = p.map(s => `
        <li class="adm-solicitud">
            <div>
                <h3>${esc(s.nombre)}</h3>
                <p class="adm-meta">${esc(s.email)} · ${esc(fecha(s.fecha))}</p>
                <p class="adm-meta">Deportes: <strong>${esc(s.deportes)}</strong> · Certificado: <strong>${s.certificado ? 'Sí' : 'No'}</strong></p>
            </div>
            <div class="adm-acciones">${s.estado === 'pendiente'
                ? `<button class="tv-btn tv-btn--green" data-aprobar="${s.id}"><i class="ti ti-check"></i> Aprobar</button>
                   <button class="tv-btn tv-btn--ghost" data-rechazar="${s.id}" data-nombre="${esc(s.nombre)}"><i class="ti ti-x"></i> Rechazar</button>`
                : `<span class="adm-estado adm-estado--${esc(s.estado)}">${esc(s.estado)}</span>`}</div>
            <p class="adm-exp">${esc(s.experiencia)}</p>
            ${s.motivo ? `<p class="adm-exp adm-meta">Motivo del rechazo: ${esc(s.motivo)}</p>` : ''}
        </li>`).join(''); });
}

$('adm-lista-solicitudes').addEventListener('click', async (e) => {
    const ap = e.target.closest('[data-aprobar]');
    const re = e.target.closest('[data-rechazar]');
    if (ap) {
        if (!confirm('¿Aprobar la solicitud? La persona pasa a tener el rol de juez.')) return;
        ap.disabled = true;
        if (!await accion('approve', { id: Number(ap.dataset.aprobar) }, 'Solicitud aprobada ✓', cargarSolicitudes)) ap.disabled = false;
    } else if (re) {
        const motivo = await pedir({ titulo: 'Rechazar solicitud', sub: re.dataset.nombre, label: 'Motivo (lo verá la persona)', confirmar: 'Rechazar', minimo: 5 });
        if (motivo) await accion('reject', { id: Number(re.dataset.rechazar), motivo }, 'Solicitud rechazada', cargarSolicitudes);
    }
});

$('adm-filtro-estado').addEventListener('click', (e) => {
    const b = e.target.closest('.adm-chip'); if (!b) return;
    $('adm-filtro-estado').querySelectorAll('.adm-chip').forEach(x => x.classList.toggle('active', x === b));
    estadoFiltro = b.dataset.estado;
    reiniciarPagina('solicitudes');
    cargarSolicitudes();
});

// ── Usuarios ──
const ROLES = [['admin', 'Admin'], ['organizador', 'Organizador'], ['participante', 'Participante'], ['juez', 'Juez'], ['observador', 'Observador']];
let tBusqueda;
let rolFiltro = '';
async function cargarUsuarios() {
    const q = $('adm-q').value.trim();
    const params = {};
    if (q) params.q = q;
    if (rolFiltro) params.role = rolFiltro;
    const r = await api('users', { params });
    const ul = $('adm-lista-usuarios');
    if (!r.success) { ul.innerHTML = `<li class="tv-vacio">${esc(r.error)}</li>`; return; }
    paginar(ul, 'usuarios', r.users, p => { ul.innerHTML = p.length ? p.map(u => `
        <li class="adm-solicitud ${u.bloqueado ? 'adm-suspendido' : ''}" data-email="${esc(u.email)}" data-nombre="${esc(u.nombre)}">
            <div>
                <h3>${esc(u.nombre)} ${u.bloqueado ? '<span class="adm-estado adm-estado--rechazada">suspendida</span>' : ''}</h3>
                <p class="adm-meta">${esc(u.email)} · CI ${esc(u.ci)}</p>
                ${u.bloqueado && u.motivo ? `<p class="adm-meta">Motivo: ${esc(u.motivo)}</p>` : ''}
            </div>
            <div class="adm-acciones">
                <button class="tv-btn tv-btn--ghost" data-bloquear="${u.bloqueado ? 0 : 1}"><i class="ti ${u.bloqueado ? 'ti-lock-open' : 'ti-lock'}"></i> ${u.bloqueado ? 'Reactivar' : 'Suspender'}</button>
                <button class="tv-btn tv-btn--ghost adm-btn-peligro" data-borrar-usuario><i class="ti ti-trash"></i> Eliminar</button>
            </div>
            <div class="adm-roles">${ROLES.map(([k, l]) => `
                <label class="adm-rol"><input type="checkbox" data-rol="${k}" ${u.roles[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div>
        </li>`).join('') : '<li class="tv-vacio">Sin resultados.</li>'; });
}
$('adm-q').addEventListener('input', () => { clearTimeout(tBusqueda); tBusqueda = setTimeout(() => { reiniciarPagina('usuarios'); cargarUsuarios(); }, 300); });

$('adm-filtro-rol').addEventListener('click', e => {
    const b = e.target.closest('.adm-chip'); if (!b) return;
    $('adm-filtro-rol').querySelectorAll('.adm-chip').forEach(x => x.classList.toggle('active', x === b));
    rolFiltro = b.dataset.rol;
    reiniciarPagina('usuarios');
    cargarUsuarios();
});

$('adm-lista-usuarios').addEventListener('change', async e => {
    const cb = e.target.closest('[data-rol]');
    if (!cb) return;
    const li = cb.closest('[data-email]');
    const verbo = cb.checked ? 'Dar' : 'Quitar';
    if (!confirm(`¿${verbo} el rol ${cb.dataset.rol} a ${li.dataset.nombre}?`)) { cb.checked = !cb.checked; return; }
    if (!await accion('user_role', { email: li.dataset.email, role: cb.dataset.rol, active: cb.checked }, 'Roles actualizados ✓', cargarUsuarios)) cb.checked = !cb.checked;
});
$('adm-lista-usuarios').addEventListener('click', async e => {
    const li = e.target.closest('[data-email]');
    if (!li) return;
    const bl = e.target.closest('[data-bloquear]');
    if (bl) {
        if (bl.dataset.bloquear === '1') {
            const motivo = await pedir({ titulo: 'Suspender cuenta', sub: li.dataset.nombre, label: 'Motivo (se le muestra al iniciar sesión)', confirmar: 'Suspender', minimo: 5 });
            if (motivo) await accion('user_block', { email: li.dataset.email, block: true, motivo }, 'Cuenta suspendida', cargarUsuarios);
        } else if (confirm(`¿Reactivar la cuenta de ${li.dataset.nombre}?`)) {
            await accion('user_block', { email: li.dataset.email, block: false }, 'Cuenta reactivada ✓', cargarUsuarios);
        }
    } else if (e.target.closest('[data-borrar-usuario]')) {
        if (confirm(`¿Eliminar definitivamente la cuenta de ${li.dataset.nombre}? No se puede deshacer.`)) {
            await accion('user_delete', { email: li.dataset.email }, 'Cuenta eliminada', cargarUsuarios);
        }
    }
});

// ── Torneos ──
const ESTADOS = [['pendiente', 'pending', 'Inscripciones abiertas'], ['activo', 'active', 'En curso'], ['finalizado', 'finished', 'Finalizado']];
let tBusquedaT;
async function cargarTorneos() {
    const q = $('adm-qt').value.trim();
    const r = await api('tournaments', { params: q ? { q } : {} });
    const ul = $('adm-lista-torneos');
    if (!r.success) { ul.innerHTML = `<li class="tv-vacio">${esc(r.error)}</li>`; return; }
    paginar(ul, 'torneos', r.tournaments, p => { ul.innerHTML = p.length ? p.map(t => `
        <li class="adm-solicitud" data-id="${t.id}" data-nombre="${esc(t.nombre)}">
            <div>
                <h3><a href="${SITE}/frontend/paginas/tournament_view/tournament_view.html?t=${t.id}">${esc(t.nombre)}</a>
                    ${t.competitivo ? '<span class="adm-pill"><i class="ti ti-shield-check"></i> Competitivo</span>' : ''}</h3>
                <p class="adm-meta">${esc([t.deporte, t.formato].filter(Boolean).join(' · ') || 'Sin formato')} · ${esc(fechaCorta(t.inicio))}</p>
                <p class="adm-meta">Organiza: <strong>${esc(t.organizador)}</strong> (${esc(t.organizadorEmail)}) · ${t.equipos} equipos · ${t.partidos} partidos · ${t.resultados} resultados</p>
                ${t.estado === 'rechazado' ? `<p class="adm-meta"><span class="adm-pill"><i class="ti ti-circle-x"></i> Rechazado</span> ${esc(t.motivo || '')}</p>` : ''}
            </div>
            <div class="adm-acciones">
                ${t.estado === 'en_revision' ? `
                <span class="adm-pill"><i class="ti ti-hourglass"></i> En revisión</span>
                <button class="tv-btn" data-aprobar-torneo><i class="ti ti-check"></i> Aprobar</button>
                <button class="tv-btn tv-btn--ghost adm-btn-peligro" data-rechazar-torneo><i class="ti ti-x"></i> Rechazar</button>
                ` : t.estado === 'rechazado' ? '' : `
                <select class="adm-select" data-estado aria-label="Estado del torneo">${ESTADOS.map(([db, front, l]) =>
                    `<option value="${front}" ${t.estado === db ? 'selected' : ''}>${l}</option>`).join('')}</select>`}
                <a class="tv-btn tv-btn--ghost" href="${SITE}/frontend/paginas/tournament_dashboard/tournament_dashboard.html?t=${t.id}"><i class="ti ti-settings"></i> Gestionar</a>
                <button class="tv-btn tv-btn--ghost" data-transferir><i class="ti ti-arrows-exchange"></i> Transferir</button>
                <button class="tv-btn tv-btn--ghost adm-btn-peligro" data-borrar-torneo ${t.resultados ? 'disabled title="Tiene resultados: marcalo como finalizado"' : ''}><i class="ti ti-trash"></i></button>
            </div>
        </li>`).join('') : '<li class="tv-vacio">Sin resultados.</li>'; });
}
$('adm-qt').addEventListener('input', () => { clearTimeout(tBusquedaT); tBusquedaT = setTimeout(() => { reiniciarPagina('torneos'); cargarTorneos(); }, 300); });

$('adm-lista-torneos').addEventListener('change', async e => {
    const sel = e.target.closest('[data-estado]');
    if (!sel) return;
    const li = sel.closest('[data-id]');
    if (!await accion('tournament_status', { id: Number(li.dataset.id), status: sel.value }, 'Estado actualizado ✓', cargarTorneos)) cargarTorneos();
});
$('adm-lista-torneos').addEventListener('click', async e => {
    const li = e.target.closest('[data-id]');
    if (!li) return;
    const body = { id: Number(li.dataset.id) };
    if (e.target.closest('[data-aprobar-torneo]')) {
        await accion('tournament_approve', body, 'Torneo aprobado ✓', cargarTorneos);
    } else if (e.target.closest('[data-rechazar-torneo]')) {
        const motivo = await pedir({ titulo: 'Rechazar torneo', sub: li.dataset.nombre, label: 'Motivo (lo ve el organizador)', confirmar: 'Rechazar', minimo: 5 });
        if (motivo) await accion('tournament_reject', { ...body, motivo }, 'Torneo rechazado', cargarTorneos);
    } else if (e.target.closest('[data-transferir]')) {
        const email = await pedir({ titulo: 'Transferir torneo', sub: li.dataset.nombre, label: 'Correo del nuevo organizador', confirmar: 'Transferir', tipo: 'email' });
        if (email) await accion('tournament_transfer', { ...body, email }, 'Torneo transferido ✓', cargarTorneos);
    } else if (e.target.closest('[data-borrar-torneo]')) {
        if (confirm(`¿Eliminar el torneo «${li.dataset.nombre}»? Se avisa a los inscriptos y al organizador.`)) {
            await accion('tournament_delete', body, 'Torneo eliminado', cargarTorneos);
        }
    }
});

// ── Mensajes de contacto ──
let soloNoLeidos = true;
async function cargarMensajes() {
    const r = await api('messages', { params: soloNoLeidos ? { unread: 1 } : {} });
    const ul = $('adm-lista-mensajes');
    if (!r.success) { ul.innerHTML = `<li class="tv-vacio">${esc(r.error)}</li>`; return; }
    paginar(ul, 'mensajes', r.messages, p => { ul.innerHTML = p.length ? p.map(m => `
        <li class="adm-solicitud ${m.leido ? '' : 'adm-no-leido'}" data-id="${m.id}">
            <div>
                <h3>${esc(m.asunto)}</h3>
                <p class="adm-meta">${esc(m.nombre)} · <a href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + m.asunto)}">${esc(m.email)}</a>
                    ${m.registrado ? '· cuenta registrada' : ''} · ${esc(fecha(m.fecha))}</p>
            </div>
            <div class="adm-acciones">
                <button class="tv-btn tv-btn--ghost" data-leido="${m.leido ? 0 : 1}"><i class="ti ${m.leido ? 'ti-mail' : 'ti-mail-opened'}"></i> ${m.leido ? 'Marcar sin leer' : 'Marcar leído'}</button>
                <button class="tv-btn tv-btn--ghost adm-btn-peligro" data-borrar-msg aria-label="Borrar mensaje"><i class="ti ti-trash"></i></button>
            </div>
            <p class="adm-exp">${esc(m.mensaje)}</p>
        </li>`).join('') : `<li class="tv-vacio">${soloNoLeidos ? 'No hay mensajes sin leer.' : 'No hay mensajes.'}</li>`; });
}
$('adm-filtro-msg').addEventListener('click', e => {
    const b = e.target.closest('.adm-chip'); if (!b) return;
    $('adm-filtro-msg').querySelectorAll('.adm-chip').forEach(x => x.classList.toggle('active', x === b));
    soloNoLeidos = b.dataset.unread === '1';
    reiniciarPagina('mensajes');
    cargarMensajes();
});
$('adm-lista-mensajes').addEventListener('click', async e => {
    const li = e.target.closest('[data-id]');
    if (!li) return;
    const id = Number(li.dataset.id);
    const le = e.target.closest('[data-leido]');
    if (le) await accion('message_read', { id, read: le.dataset.leido === '1' }, 'Mensaje actualizado', cargarMensajes);
    else if (e.target.closest('[data-borrar-msg]') && confirm('¿Borrar este mensaje?')) await accion('message_delete', { id }, 'Mensaje borrado', cargarMensajes);
});

// ── Anuncios ──
$('adm-anuncio-form').addEventListener('submit', async e => {
    e.preventDefault();
    const message = $('adm-anuncio-texto').value.trim();
    const to = $('adm-anuncio-para').value;
    if (!message) { $('adm-anuncio-texto').focus(); return; }
    const destino = $('adm-anuncio-para').selectedOptions[0].textContent.toLowerCase();
    if (!confirm(`¿Enviar el anuncio a: ${destino}?`)) return;
    const r = await post('announce', { message, to });
    if (!r.success) { toast(r.error || 'No se pudo enviar.'); return; }
    $('adm-anuncio-texto').value = '';
    toast(`Anuncio enviado a ${r.sent} cuenta${r.sent === 1 ? '' : 's'} ✓`);
});

// ── Catálogos ──
const filaCatalogo = (tipo, clave, campos, activo) => `
    <li class="adm-fila-form" data-${tipo}="${esc(clave)}">
        ${campos}
        <label class="adm-rol"><input type="checkbox" data-activo ${activo ? 'checked' : ''}> Habilitad${tipo === 'moneda' ? 'a' : 'o'}</label>
        <button class="tv-btn tv-btn--ghost" data-guardar><i class="ti ti-device-floppy"></i> Guardar</button>
    </li>`;

async function cargarCatalogos() {
    const r = await api('catalogs');
    if (!r.success) { $('adm-lista-monedas').innerHTML = `<li class="tv-vacio">${esc(r.error)}</li>`; return; }
    $('adm-lista-monedas').innerHTML = r.currencies.map(m => filaCatalogo('moneda', m.code,
        `<span class="adm-codigo">${esc(m.code)}</span>
         <input class="adm-input" data-campo="name" value="${esc(m.name)}" maxlength="50" aria-label="Nombre de ${esc(m.code)}">
         <input class="adm-input adm-input--simbolo" data-campo="symbol" value="${esc(m.symbol)}" maxlength="5" aria-label="Símbolo de ${esc(m.code)}">`, m.active)).join('');
    $('adm-lista-formatos').innerHTML = r.formats.map(f => filaCatalogo('formato', f.id,
        `<span class="adm-codigo">${esc(f.category)}</span>
         <input class="adm-input" data-campo="label" value="${esc(f.label)}" maxlength="100" aria-label="Nombre del formato">`, f.active)).join('');
}

$('adm-catalogos').addEventListener('click', async e => {
    if (!e.target.closest('[data-guardar]')) return;
    const li = e.target.closest('li');
    const campo = k => li.querySelector(`[data-campo="${k}"]`)?.value.trim() ?? '';
    const active = li.querySelector('[data-activo]').checked;
    if (li.dataset.moneda) {
        await accion('currency_save', { code: li.dataset.moneda, name: campo('name'), symbol: campo('symbol'), active }, 'Moneda guardada ✓', cargarCatalogos);
    } else {
        await accion('format_save', { id: li.dataset.formato, label: campo('label'), active }, 'Formato guardado ✓', cargarCatalogos);
    }
});
$('adm-moneda-nueva').addEventListener('submit', async e => {
    e.preventDefault();
    const body = { code: $('adm-mn-codigo').value.trim(), name: $('adm-mn-nombre').value.trim(), symbol: $('adm-mn-simbolo').value.trim(), active: true };
    if (await accion('currency_save', body, 'Moneda agregada ✓', cargarCatalogos)) e.target.reset();
});

// ── Registro de actividad ──
let categoriaAct = '';
let tBusquedaA;
const CATEGORIAS = { cuenta: 'Cuenta', torneo: 'Torneo', inscripcion: 'Inscripción', resultado: 'Resultado', administracion: 'Administración' };
async function cargarActividad() {
    const q = $('adm-qa').value.trim();
    const params = {};
    if (categoriaAct) params.categoria = categoriaAct;
    if (q) params.q = q;
    const r = await api('activity', { params });
    const ul = $('adm-lista-actividad');
    if (!r.success) { ul.innerHTML = `<li>${esc(r.error)}</li>`; return; }
    paginar(ul, 'actividad', r.activity, p => { ul.innerHTML = p.length ? p.map(a => `<li><strong>${esc(a.accion)}</strong> — ${esc(a.descripcion)}
        <time>${esc(fecha(a.fecha))} · ${esc(a.admin || 'Sin cuenta')} · ${esc(CATEGORIAS[a.categoria] || a.categoria)}</time></li>`).join('')
        : `<li class="tv-vacio">${categoriaAct || q ? 'No hay actividad que coincida.' : 'Todavía no hay actividad registrada.'}</li>`; });
}
$('adm-filtro-act').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    $('adm-filtro-act').querySelectorAll('.adm-chip').forEach(x => x.classList.toggle('active', x === b));
    categoriaAct = b.dataset.cat;
    reiniciarPagina('actividad');
    cargarActividad();
});
$('adm-qa').addEventListener('input', () => { clearTimeout(tBusquedaA); tBusquedaA = setTimeout(() => { reiniciarPagina('actividad'); cargarActividad(); }, 300); });

// ── Pestañas ──
const cargas = { solicitudes: cargarSolicitudes, usuarios: cargarUsuarios, torneos: cargarTorneos, mensajes: cargarMensajes, anuncios: () => {}, catalogos: cargarCatalogos, actividad: cargarActividad };
function abrirPestania(nombre) {
    if (!cargas[nombre]) nombre = 'solicitudes';
    document.querySelectorAll('.adm-tab').forEach(t => {
        const on = t.dataset.tab === nombre;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on);
    });
    Object.keys(cargas).forEach(k => { $(`adm-${k}`).hidden = k !== nombre; });
    cargas[nombre]();
}
document.querySelectorAll('.adm-tab').forEach(tab => tab.addEventListener('click', () => {
    history.replaceState(null, '', '#' + tab.dataset.tab);
    abrirPestania(tab.dataset.tab);
}));

(window.competikaSessionReady || Promise.resolve({ logged: false })).then(async s => {
    if (!s || !s.logged) return;            // navbar-user.js redirige al login
    if (await cargarResumen()) abrirPestania(location.hash.slice(1));
});
})();
