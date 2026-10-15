/* COMPETIKA — contact.js: formulario de contacto. */
(function () {
const form = document.getElementById('contacto-form');
if (!form) return;
const $ = id => document.getElementById(id);
const API = new URL('../../api/contact.php?action=send', document.currentScript.src).href;
const estado = $('contacto-estado');
const mostrar = (texto, tipo) => { estado.textContent = texto; estado.className = 'contacto-estado ' + tipo; };

(window.competikaSessionReady || Promise.resolve(null)).then(s => {
    if (!s || !s.logged) return;
    if (!$('c-nombre').value) $('c-nombre').value = `${s.nombre || ''} ${s.apellido || ''}`.trim();
    if (!$('c-email').value) $('c-email').value = s.email || '';
});

form.addEventListener('submit', async e => {
    e.preventDefault();
    for (const id of ['c-nombre', 'c-email', 'c-asunto', 'c-mensaje']) {
        const el = $(id);
        el.value = el.value.trim();
        if (!el.checkValidity()) {
            mostrar(id === 'c-mensaje' ? 'Escribí un mensaje de al menos 10 caracteres.' : `Revisá el campo «${el.labels[0].textContent}».`, 'error');
            el.focus();
            return;
        }
    }
    const btn = $('contacto-enviar');
    btn.disabled = true;
    mostrar('Enviando…', '');
    try {
        const res = await fetch(API, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: $('c-nombre').value, email: $('c-email').value,
                asunto: $('c-asunto').value, mensaje: $('c-mensaje').value, website: $('c-website').value,
            }),
        });
        const r = await res.json();
        if (!r.success) { mostrar(r.error || 'No se pudo enviar el mensaje.', 'error'); return; }
        mostrar(r.message || '¡Mensaje enviado!', 'ok');
        $('c-asunto').value = '';
        $('c-mensaje').value = '';
    } catch {
        mostrar('No se pudo conectar con el servidor.', 'error');
    } finally {
        btn.disabled = false;
    }
});
})();
