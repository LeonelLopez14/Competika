/* =====================================================
   COMPETIKA — profile_settings.js  (profile_configuration.html)
   Todos los cambios se guardan en la base de datos vía api/profile.php.
   Requiere navbar-user.js cargado antes (define competikaSiteRoot y
   competikaRefreshSession).
   ===================================================== */
(function () {
const API = (window.competikaSiteRoot || '../../..') + '/api/profile.php';
const $ = id => document.getElementById(id);

async function api(action, { method = 'GET', body = null, form = null } = {}) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (form) opts.body = form;
    else if (body !== null) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    try {
        const res = await fetch(`${API}?action=${encodeURIComponent(action)}`, opts);
        const data = await res.json();
        if (res.status === 401) { location.replace((window.competikaSiteRoot || '../../..') + '/frontend/paginas/login/login.html'); }
        return data;
    } catch (e) {
        return { success: false, error: 'No se pudo conectar con el servidor.' };
    }
}

/* ── Toast ── */
function toast(message, isDanger = false) {
    const el = $('settings-toast');
    if (!el) return;
    el.innerHTML = `<i class="ti ${isDanger ? 'ti-alert-triangle' : 'ti-circle-check'}"></i><span></span>`;
    el.querySelector('span').textContent = message;             // texto, nunca HTML
    el.classList.toggle('settings-toast--danger', isDanger);
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function busy(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    btn.style.opacity = on ? '0.6' : '';
}

/* ── Cargar los datos reales de la cuenta ── */
let defaultAvatar = '';
function fill(user) {
    $('settings-nombre').value   = user.nombre || '';
    $('settings-apellido').value = user.apellido || '';
    $('settings-username').value = user.nombreUsuario || '';
    $('settings-telefono').value = user.telefono || '';
    $('settings-bio').value      = user.biografia || '';
    $('settings-current-email-value').textContent = user.email || '—';
    $('settings-role-organizador').checked  = !!user.roles?.organizador;
    $('settings-role-participante').checked = !!user.roles?.participante;
    setAvatar(user.foto);

    const juez = document.querySelector('.settings-role-pending-badge');
    if (juez && user.roles?.juez) juez.textContent = 'Activo';
}

function setAvatar(url) {
    const preview = $('settings-avatar-preview');
    if (preview) preview.src = url ? `${window.competikaSiteRoot}/${url}` : defaultAvatar;
    const remove = $('settings-avatar-remove');
    if (remove) remove.hidden = !url;
}

async function load() {
    defaultAvatar = $('settings-avatar-preview')?.getAttribute('src') || '';
    const r = await api('me');
    if (r.success) fill(r.user);
    else if (r.error) toast(r.error, true);
}

/* ── Navegación entre paneles ── */
function initNav() {
    const buttons = document.querySelectorAll('.settings-nav-btn');
    const panels = document.querySelectorAll('.settings-panel');
    buttons.forEach(btn => btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        $(btn.dataset.target)?.classList.add('active');
        $('settings-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
}

/* ── Foto de perfil ── */
function initAvatar() {
    const input = $('settings-avatar-input');
    $('settings-avatar-btn')?.addEventListener('click', () => input?.click());

    input?.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        if (!['image/jpeg', 'image/png'].includes(file.type)) { toast('Solo se aceptan imágenes JPG o PNG.', true); return; }
        if (file.size > 5 * 1024 * 1024) { toast('La imagen supera los 5MB permitidos.', true); return; }

        const form = new FormData();
        form.append('avatar', file);
        busy($('settings-avatar-btn'), true);
        const r = await api('avatar', { method: 'POST', form });
        busy($('settings-avatar-btn'), false);
        if (!r.success) { toast(r.error || 'No se pudo subir la foto.', true); return; }
        setAvatar(r.foto);
        window.competikaRefreshSession?.();
        toast('Foto de perfil actualizada.');
    });

    $('settings-avatar-remove')?.addEventListener('click', async () => {
        const r = await api('avatar_delete', { method: 'POST' });
        if (!r.success) { toast(r.error || 'No se pudo quitar la foto.', true); return; }
        setAvatar(null);
        window.competikaRefreshSession?.();
        toast('Foto de perfil eliminada.');
    });
}

/* ── Editar perfil ── */
function initProfileForm() {
    const form = $('settings-profile-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            nombre:        $('settings-nombre').value.trim(),
            apellido:      $('settings-apellido').value.trim(),
            nombreUsuario: $('settings-username').value.trim(),
            telefono:      $('settings-telefono').value.trim(),
            biografia:     $('settings-bio').value.trim(),
            roles: {
                organizador:  $('settings-role-organizador').checked,
                participante: $('settings-role-participante').checked,
            },
        };
        if (!body.nombre || !body.apellido) { toast('Completá tu nombre y apellido.', true); return; }

        const btn = form.querySelector('.settings-save-btn');
        busy(btn, true);
        const r = await api('update', { method: 'POST', body });
        busy(btn, false);
        if (!r.success) {
            toast(r.error || 'No se pudo guardar.', true);
            const me = await api('me');                      // deja los interruptores como están en la base
            if (me.success) fill(me.user);
            return;
        }
        fill(r.user);
        window.competikaRefreshSession?.();
        toast('Perfil actualizado correctamente.');
    });
}

/* ── Correo ── */
function initEmailForm() {
    const form = $('settings-email-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = $('settings-new-email').value.trim();
        const password = $('settings-email-password').value;
        if (!email || !password) { toast('Completá el nuevo correo y tu contraseña actual.', true); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Ingresá un correo electrónico válido.', true); return; }

        const btn = form.querySelector('.settings-save-btn');
        busy(btn, true);
        const r = await api('email', { method: 'POST', body: { email, password } });
        busy(btn, false);
        if (!r.success) { toast(r.error || 'No se pudo actualizar el correo.', true); return; }
        $('settings-current-email-value').textContent = r.email;
        form.reset();
        window.competikaRefreshSession?.();
        toast('Correo electrónico actualizado.');
    });
}

/* ── Contraseña ── */
function initPasswordForm() {
    const form = $('settings-password-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const current = $('settings-current-password').value;
        const next    = $('settings-new-password').value;
        const confirm = $('settings-confirm-password').value;
        if (!current || !next || !confirm) { toast('Completá todos los campos de contraseña.', true); return; }
        if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
            toast('La nueva contraseña debe tener al menos 8 caracteres, con letras y números.', true); return;
        }
        if (next !== confirm) { toast('Las contraseñas nuevas no coinciden.', true); return; }

        const btn = form.querySelector('.settings-save-btn');
        busy(btn, true);
        const r = await api('password', { method: 'POST', body: { current, next } });
        busy(btn, false);
        if (!r.success) { toast(r.error || 'No se pudo cambiar la contraseña.', true); return; }
        form.reset();
        toast('Contraseña actualizada correctamente.');
    });

    document.querySelectorAll('.settings-toggle-pass').forEach(btn => btn.addEventListener('click', () => {
        const input = $(btn.dataset.for);
        if (!input) return;
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        btn.querySelector('i').className = `ti ${isPass ? 'ti-eye-off' : 'ti-eye'}`;
    }));
}

/* ── Eliminar cuenta ── */
function initDeleteAccount() {
    const check = $('settings-delete-confirm-check');
    const text = $('settings-delete-confirm-text');
    const pass = $('settings-delete-password');
    const btn = $('settings-delete-btn');
    if (!check || !text || !btn) return;

    const refresh = () => {
        const ready = check.checked && text.value.trim().toUpperCase() === 'ELIMINAR' && !!pass?.value;
        btn.classList.toggle('enabled', ready);
        btn.disabled = !ready;
    };
    [check, text, pass].forEach(el => el?.addEventListener(el.type === 'checkbox' ? 'change' : 'input', refresh));

    btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        busy(btn, true);
        const r = await api('delete_account', { method: 'POST', body: { password: pass.value, confirm: text.value } });
        busy(btn, false);
        if (!r.success) { toast(r.error || 'No se pudo eliminar la cuenta.', true); return; }
        toast('Cuenta eliminada. Redirigiendo…', true);
        setTimeout(() => { location.href = `${window.competikaSiteRoot}/frontend/index.html`; }, 1500);
    });
}

initNav();
initAvatar();
initProfileForm();
initEmailForm();
initPasswordForm();
initDeleteAccount();
(window.competikaSessionReady || Promise.resolve({ logged: true })).then(s => { if (s && s.logged) load(); });
})();
