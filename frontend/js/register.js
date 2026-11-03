// ═══════════════════════════════════════════════════════════════════════
// REGISTRO 
// ═══════════════════════════════════════════════════════════════════════
const params = new URLSearchParams(window.location.search);
const error = params.get('error');
if (error) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = error;
    errorDiv.style.display = 'block';
}
// Conservar lo escrito si el registro falla (la contraseña nunca se guarda)
const form = document.querySelector('#register-container .form-box');
const CLAVE_BORRADOR = 'competika_registro';
if (form) {
    try {
        if (error) {
            const guardado = JSON.parse(sessionStorage.getItem(CLAVE_BORRADOR) || '{}');
            Object.keys(guardado).forEach((nombre) => {
                const campo = form.elements[nombre];
                if (!campo) return;
                if (campo.type === 'checkbox') campo.checked = guardado[nombre];
                else campo.value = guardado[nombre];
            });
        } else {
            sessionStorage.removeItem(CLAVE_BORRADOR);
        }
    } catch (e) { /* sin almacenamiento: el formulario queda vacío */ }

    form.addEventListener('submit', () => {
        try {
            const datos = {};
            Array.from(form.elements).forEach((campo) => {
                if (!campo.name || campo.type === 'password' || campo.type === 'submit') return;
                datos[campo.name] = campo.type === 'checkbox' ? campo.checked : campo.value;
            });
            sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(datos));
        } catch (e) { /* ignorar */ }
    });
}
const perfil = document.getElementById('profile');
const carneRow = document.getElementById('carne-row');
if (perfil && carneRow) {
    const sync = () => { carneRow.hidden = perfil.value !== 'participante'; };
    perfil.addEventListener('change', sync);
    sync();
}
