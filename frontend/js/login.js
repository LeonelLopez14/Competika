const params = new URLSearchParams(window.location.search);
const error = params.get('error');
if (error) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = error;
    errorDiv.style.display = 'block';
}