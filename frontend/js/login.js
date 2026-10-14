const params = new URLSearchParams(window.location.search);
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
