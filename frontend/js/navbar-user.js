/* =====================================================
   COMPETIKA — navbar-user.js
   ===================================================== */
(function () {
    const scriptSrc = document.currentScript ? document.currentScript.src : '';

    function setupDropdown(wrapId, btnId) {
        const wrap = document.getElementById(wrapId);
        const btn  = document.getElementById(btnId);
        if (!wrap || !btn) return;

        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const willOpen = !wrap.classList.contains('open');
            document.querySelectorAll('.nav-dropdown-wrap.open').forEach(other => {
                other.classList.remove('open');
                other.querySelector('[aria-haspopup]')?.setAttribute('aria-expanded', 'false');
            });
            if (willOpen) {
                wrap.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    }

    setupDropdown('user-menu-wrap', 'user-menu-btn');
    setupDropdown('notif-wrap', 'notif-btn');

    document.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-dropdown-wrap.open').forEach(wrap => {
            if (!wrap.contains(e.target)) {
                wrap.classList.remove('open');
                wrap.querySelector('[aria-haspopup]')?.setAttribute('aria-expanded', 'false');
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.nav-dropdown-wrap.open').forEach(wrap => {
                wrap.classList.remove('open');
                wrap.querySelector('[aria-haspopup]')?.setAttribute('aria-expanded', 'false');
            });
        }
    });

    /* ── Notificaciones de ejemplo ── */
    const notifications = [
        { icon: 'ti-mail-opened', title: 'Fuiste invitado a jugar en <strong>Liga Municipal Baloncesto</strong>.', time: 'Hace 2 h', unread: true },
        { icon: 'ti-alarm-snooze', title: 'Tu partido vs <strong>Atlético Sur</strong> es mañana a las 09:00 h.', time: 'Hace 5 h', unread: true },
        { icon: 'ti-trophy', title: 'Ganaste tu partido vs <strong>FC Norte</strong> 3-1.', time: 'Hace 1 día', unread: true },
        { icon: 'ti-tournament', title: '<strong>Copa Regional Fútbol 2026</strong> ya tiene la fase de grupos definida.', time: 'Hace 2 días', unread: false },
        { icon: 'ti-award', title: 'Alcanzaste el logro “Top Jugador 2025”.', time: 'Hace 4 días', unread: false }
    ];

    function renderNotifications() {
        const list  = document.getElementById('notif-list');
        const badge = document.getElementById('notif-badge');
        if (!list) return;

        list.innerHTML = notifications.length
            ? notifications.map(n => `
                <div class="nnd-item ${n.unread ? 'nnd-item--unread' : ''}">
                    <span class="nnd-icon"><i class="ti ${n.icon}"></i></span>
                    <span class="nnd-body">
                        <span class="nnd-title">${n.title}</span>
                        <span class="nnd-time">${n.time}</span>
                    </span>
                </div>
            `).join('')
            : `<div class="nnd-empty">No tenés notificaciones nuevas.</div>`;

        const unreadCount = notifications.filter(n => n.unread).length;
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    document.getElementById('notif-mark-all')?.addEventListener('click', () => {
        notifications.forEach(n => n.unread = false);
        renderNotifications();
    });

    renderNotifications();

    /* ── Sesión: siempre desde el servidor (api/session.php) ──
       Así, al iniciar sesión con otra cuenta o editar el perfil, el navbar
       muestra la cuenta actual. Nada de la cuenta se guarda en localStorage. */
    const siteRoot = scriptSrc.replace(/\/frontend\/js\/navbar-user\.js.*$/, '');
    const navUser = document.querySelector('.navbar-user');
    const guestItems = Array.from(document.querySelectorAll('.navbar-list a[href$="login/login.html"], .navbar-list a[href$="register/register.html"], .mobile-menu-list a[href$="login/login.html"], .mobile-menu-list a[href$="register/register.html"]')).map(a => a.closest('li'));
    const memberItems = Array.from(document.querySelectorAll('.mobile-menu-list a[href$="profile/profile.html"], .mobile-menu-list a[href$="profile_configuration/profile_configuration.html"]')).map(a => a.closest('li'));
    const defaultAvatar = document.querySelector('.nav-avatar-img')?.getAttribute('src') || '';

    [navUser, ...guestItems, ...memberItems].forEach(el => { if (el) el.style.visibility = 'hidden'; });

    function setText(selector, value) {
        document.querySelectorAll(selector).forEach(el => { el.textContent = value; });
    }

    function setAvatar(url) {
        const src = url ? siteRoot + '/' + url : defaultAvatar;
        document.querySelectorAll('.nav-avatar-img, .pf-avatar').forEach(img => { img.src = src; });
    }

    function renderGuest() {
        // Modo invitado: se muestra el menú de cuenta como "Invitado", con accesos para entrar o registrarse
        navUser.style.display = '';
        navUser.style.visibility = '';
        document.getElementById('notif-wrap')?.style.setProperty('display', 'none');
        setText('.nav-avatar-name', 'Invitado');
        setText('.nud-name', 'Invitado');
        setText('.nud-email', 'Navegando sin cuenta');
        setAvatar(null);
        const login = siteRoot + '/frontend/paginas/login/login.html';
        const register = siteRoot + '/frontend/paginas/register/register.html';
        document.querySelectorAll('.nav-avatar-link').forEach(a => { a.href = login; a.setAttribute('aria-label', 'Iniciar sesión'); });
        document.querySelectorAll('.nav-user-dropdown').forEach(dd => {
            const items = dd.querySelectorAll('.nud-item');
            if (items[0]) { items[0].href = login; items[0].innerHTML = '<i class="ti ti-login"></i>Iniciar sesión'; }
            if (items[1]) { items[1].href = register; items[1].innerHTML = '<i class="ti ti-user-plus"></i>Crear cuenta'; }
            if (items[2]) { items[2].href = siteRoot + '/controller/logout.php'; items[2].innerHTML = '<i class="ti ti-logout"></i>Salir del modo invitado'; }
        });
    }

    function renderSession(s) {
        const logged = !!(s && s.logged);
        const guest = !logged && !!(s && s.invitado);
        guestItems.forEach(li => { if (li) { li.style.display = logged ? 'none' : ''; li.style.visibility = ''; } });
        memberItems.forEach(li => { if (li) { li.style.display = logged ? '' : 'none'; li.style.visibility = ''; } });
        if (navUser) {
            navUser.style.display = logged ? '' : 'none';
            navUser.style.visibility = '';
        }
        if (!logged) {
            if (/\/frontend\/paginas\/(profile|profile_configuration)\//.test(location.pathname)) {
                location.replace(siteRoot + '/frontend/paginas/login/login.html');
                return;
            }
            if (guest && navUser) renderGuest();
            return;
        }
        const initial = s.apellido ? ' ' + s.apellido.charAt(0).toUpperCase() + '.' : '';
        setText('.nud-name, .pf-name', (s.nombre + ' ' + s.apellido).trim());
        setText('.nud-email, .pf-email', s.email);
        setText('.nav-avatar-name', s.nombre + initial);
        setAvatar(s.foto);
        document.querySelectorAll('.nud-item--danger').forEach(a => { a.href = siteRoot + '/controller/logout.php'; });
        const roles = s.roles || {};
        [['organizador', roles.organizador], ['participante', roles.participante], ['juez', roles.juez]].forEach(([rol, on]) => {
            document.querySelectorAll('.pf-role--' + rol).forEach(el => { el.style.display = on ? '' : 'none'; });
        });
    }

    // Otras páginas (perfil, configuración) reutilizan esta misma consulta
    window.competikaSiteRoot = siteRoot;
    window.competikaSessionReady = fetch(siteRoot + '/api/session.php', { credentials: 'same-origin', cache: 'no-store' })
        .then(r => r.json())
        .catch(() => ({ logged: false }));
    window.competikaSessionReady.then(renderSession);
    window.competikaRefreshSession = () => fetch(siteRoot + '/api/session.php', { credentials: 'same-origin', cache: 'no-store' })
        .then(r => r.json()).then(s => { renderSession(s); return s; });
})();
