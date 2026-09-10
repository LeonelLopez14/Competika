/* =====================================================
   COMPETIKA — profile_settings.js
   ===================================================== */

const PF_USER_KEY = 'competika_user';

function pfGetUser() {
    try { return JSON.parse(localStorage.getItem(PF_USER_KEY) || 'null'); } catch (e) { return null; }
}

function pfSaveUser(patch) {
    const current = pfGetUser() || {
        fullname: 'Alex Rodríguez',
        username: 'alex.rodriguez',
        email: 'alex.rodriguez@competika.com',
        bio: 'Apasionado del deporte competitivo. Organizo torneos locales de fútbol y baloncesto desde 2019. Siempre buscando nuevos retos.',
        avatar: null,
        roles: { organizador: true, participante: true }
    };
    const updated = { ...current, ...patch };
    if (patch.roles) updated.roles = { ...current.roles, ...patch.roles };
    localStorage.setItem(PF_USER_KEY, JSON.stringify(updated));
    return updated;
}

/* ── Precargar los campos del formulario con lo guardado (si existe) ── */
function pfPrefillSettingsForm() {
    const user = pfGetUser();
    if (!user) return;

    if (user.fullname) document.getElementById('settings-fullname').value = user.fullname;
    if (user.username) document.getElementById('settings-username').value = user.username;
    if (user.bio) document.getElementById('settings-bio').value = user.bio;
    if (user.email) document.getElementById('settings-current-email-value').textContent = user.email;
    if (user.avatar) {
        document.getElementById('settings-avatar-preview').src = user.avatar;
        document.querySelectorAll('.nav-avatar-img').forEach(img => img.src = user.avatar);
    }
    if (user.roles) {
        const organizadorInput = document.getElementById('settings-role-organizador');
        const participanteInput = document.getElementById('settings-role-participante');
        if (organizadorInput) organizadorInput.checked = !!user.roles.organizador;
        if (participanteInput) participanteInput.checked = !!user.roles.participante;
    }

    document.querySelectorAll('.nud-name').forEach(el => el.textContent = user.fullname || el.textContent);
    document.querySelectorAll('.nud-email').forEach(el => el.textContent = user.email || el.textContent);
}

/* ── Toast ── */
function showSettingsToast(message, isDanger = false) {
    const toast = document.getElementById('settings-toast');
    if (!toast) return;
    toast.innerHTML = `<i class="ti ${isDanger ? 'ti-alert-triangle' : 'ti-circle-check'}"></i><span>${message}</span>`;
    toast.classList.toggle('settings-toast--danger', isDanger);
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ── Navegación entre paneles ── */
function initSettingsNav() {
    const navButtons = document.querySelectorAll('.settings-nav-btn');
    const panels = document.querySelectorAll('.settings-panel');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target)?.classList.add('active');
            document.getElementById('settings-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

/* ── Avatar: preview ── */
function initAvatarUpload() {
    const input   = document.getElementById('settings-avatar-input');
    const preview = document.getElementById('settings-avatar-preview');
    if (!input || !preview) return;

    input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showSettingsToast('La imagen supera los 5MB permitidos.', true);
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            document.querySelectorAll('.nav-avatar-img').forEach(img => img.src = e.target.result);
            pfSaveUser({ avatar: e.target.result });
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('settings-avatar-btn')?.addEventListener('click', () => input.click());
}

/* ── Formulario: Editar perfil ── */
function initProfileForm() {
    const form = document.getElementById('settings-profile-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const fullname = document.getElementById('settings-fullname').value.trim();
        const username = document.getElementById('settings-username').value.trim();
        const bio = document.getElementById('settings-bio').value.trim();
        const organizador = document.getElementById('settings-role-organizador')?.checked ?? true;
        const participante = document.getElementById('settings-role-participante')?.checked ?? true;

        if (!fullname) {
            showSettingsToast('El nombre completo no puede quedar vacío.', true);
            return;
        }

        pfSaveUser({ fullname, username, bio, roles: { organizador, participante } });
        document.querySelectorAll('.nud-name').forEach(el => el.textContent = fullname);
        showSettingsToast('Perfil actualizado correctamente.');
    });
}

/* ── Formulario: Correo electrónico ── */
function initEmailForm() {
    const form = document.getElementById('settings-email-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newEmail = document.getElementById('settings-new-email').value.trim();
        const pass = document.getElementById('settings-email-password').value;

        if (!newEmail || !pass) {
            showSettingsToast('Completá el nuevo correo y tu contraseña actual.', true);
            return;
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(newEmail)) {
            showSettingsToast('Ingresá un correo electrónico válido.', true);
            return;
        }

        pfSaveUser({ email: newEmail });
        document.getElementById('settings-current-email-value').textContent = newEmail;
        document.querySelectorAll('.nud-email').forEach(el => el.textContent = newEmail);
        form.reset();
        showSettingsToast('Correo electrónico actualizado.');
    });
}

/* ── Formulario: Contraseña ── */
function initPasswordForm() {
    const form = document.getElementById('settings-password-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const current = document.getElementById('settings-current-password').value;
        const next    = document.getElementById('settings-new-password').value;
        const confirm = document.getElementById('settings-confirm-password').value;

        if (!current || !next || !confirm) {
            showSettingsToast('Completá todos los campos de contraseña.', true);
            return;
        }
        if (next.length < 8) {
            showSettingsToast('La nueva contraseña debe tener al menos 8 caracteres.', true);
            return;
        }
        if (next !== confirm) {
            showSettingsToast('Las contraseñas nuevas no coinciden.', true);
            return;
        }

        // Nota: sin backend no se valida contra una password ni persiste
        form.reset();
        showSettingsToast('Contraseña actualizada correctamente.');
    });

    document.querySelectorAll('.settings-toggle-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.for);
            if (!input) return;
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            btn.querySelector('i').className = `ti ${isPass ? 'ti-eye-off' : 'ti-eye'}`;
        });
    });
}

/* ── Zona de peligro: eliminar cuenta ── */
function initDeleteAccount() {
    const checkbox = document.getElementById('settings-delete-confirm-check');
    const textInput = document.getElementById('settings-delete-confirm-text');
    const deleteBtn = document.getElementById('settings-delete-btn');
    if (!checkbox || !textInput || !deleteBtn) return;

    function refreshState() {
        const ready = checkbox.checked && textInput.value.trim().toUpperCase() === 'ELIMINAR';
        deleteBtn.classList.toggle('enabled', ready);
        deleteBtn.disabled = !ready;
    }

    checkbox.addEventListener('change', refreshState);
    textInput.addEventListener('input', refreshState);

    deleteBtn.addEventListener('click', () => {
        if (deleteBtn.disabled) return;
        localStorage.removeItem(PF_USER_KEY);
        localStorage.removeItem('competika_tournaments');
        showSettingsToast('Cuenta eliminada. Redirigiendo…', true);
        setTimeout(() => { window.location.href = 'index.html'; }, 1800);
    });
}

pfPrefillSettingsForm();
initSettingsNav();
initAvatarUpload();
initProfileForm();
initEmailForm();
initPasswordForm();
initDeleteAccount();