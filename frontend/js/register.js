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
const perfil = document.getElementById('profile');
const carneRow = document.getElementById('carne-row');
if (perfil && carneRow) {
    const sync = () => { carneRow.hidden = perfil.value !== 'participante'; };
    perfil.addEventListener('change', sync);
    sync();
}
