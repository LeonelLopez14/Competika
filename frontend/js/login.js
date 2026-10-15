const params = new URLSearchParams(window.location.search);
// Aviso de éxito (por ejemplo, después de cambiar la contraseña)
const ok = params.get('ok');
if (ok) {
    const box = document.createElement('div');
    box.className = 'form-ok';
    box.setAttribute('role', 'status');
    box.textContent = ok;
    document.getElementById('error-message')?.before(box);
}
const error = params.get('error');
if (error) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = error;
    errorDiv.style.display = 'block';
}
// Si se llegó al login desde otra página (ej. inscribirse en un torneo), volver ahí al entrar
const next = params.get('next');
const loginForm = document.querySelector('#login .form-box');
if (next && loginForm) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'next';
    input.value = next;
    loginForm.appendChild(input);
}
