/* COMPETIKA — recover.js: recuperar contraseña. */
(function () {
const $ = id => document.getElementById(id);
const API = (window.competikaSiteRoot || '../../..') + '/api/password.php';
const token = new URLSearchParams(location.search).get('token');

async function post(action, body) {
    try {
        const res = await fetch(`${API}?action=${action}`, { method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        return await res.json();
    } catch (e) { return { success: false, error: 'No se pudo conectar con el servidor.' }; }
}
function error(id, msg) { const el = $(id); el.textContent = msg || ''; el.style.display = msg ? 'block' : 'none'; }

// ── Paso 1 ──
$('rc-form-pedir').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('rc-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { error('rc-error-1', 'Ingresá un correo electrónico válido.'); return; }
    error('rc-error-1', '');
    $('rc-btn-pedir').disabled = true;
    const r = await post('forgot', { email });
    $('rc-btn-pedir').disabled = false;
    if (!r.success) { error('rc-error-1', r.error); return; }
    const ok = $('rc-ok');
    ok.textContent = r.message;
    if (r.devLink) {      // modo prueba (sin servidor de correo, solo en desarrollo)
        const p = document.createElement('p');
        p.className = 'rc-dev';
        p.append('Modo prueba (el servidor no envía correos): ');
        const a = document.createElement('a');
        a.href = r.devLink; a.textContent = 'abrir el enlace'; a.className = 'form-link';
        p.append(a);
        ok.append(p);
    }
    ok.hidden = false;
    $('rc-form-pedir').hidden = true;
});

// ── Paso 2 ──
async function iniciarPaso2() {
    $('rc-pedir').hidden = true;
    $('rc-nueva').hidden = false;
    let r;
    try { r = await (await fetch(`${API}?action=check&token=${encodeURIComponent(token)}`, { credentials: 'same-origin' })).json(); } catch (e) { r = {}; }
    if (!r.valid) {
        error('rc-error-2', 'El enlace venció o ya se usó. Pedí uno nuevo.');
        $('rc-form-nueva').hidden = true;
        const p = document.createElement('p');
        p.innerHTML = '<a class="form-link" href="recover.html">Pedir un enlace nuevo</a>';
        $('rc-nueva').append(p);
    }
}
$('rc-form-nueva').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = $('rc-pass').value, confirm = $('rc-pass2').value;
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { error('rc-error-2', 'La contraseña debe tener al menos 8 caracteres, con letras y números.'); return; }
    if (password !== confirm) { error('rc-error-2', 'Las contraseñas no coinciden.'); return; }
    $('rc-btn-nueva').disabled = true;
    const r = await post('reset', { token, password, confirm });
    $('rc-btn-nueva').disabled = false;
    if (!r.success) { error('rc-error-2', r.error); return; }
    location.href = `../login/login.html?ok=${encodeURIComponent(r.message)}`;
});

if (token) iniciarPaso2();
})();
