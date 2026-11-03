// Botón "ojito" para mostrar u ocultar la contraseña en los campos tipo password.
(function () {
    document.querySelectorAll('.input-group > input[type="password"]').forEach(function (input) {
        var group = input.parentElement;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'password-toggle';
        btn.setAttribute('aria-label', 'Mostrar contraseña');
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = '<i class="ti ti-eye"></i>';
        input.classList.add('has-password-toggle');
        group.appendChild(btn);

        btn.addEventListener('click', function () {
            var visible = input.type === 'password';
            input.type = visible ? 'text' : 'password';
            btn.setAttribute('aria-pressed', String(visible));
            btn.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
            btn.firstElementChild.className = visible ? 'ti ti-eye-off' : 'ti ti-eye';
            input.focus();
        });
    });
})();
