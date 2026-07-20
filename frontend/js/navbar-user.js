/* =====================================================
   COMPETIKA — navbar-user.js
   Campana de notificaciones + menú de usuario del navbar.
   Compartido por index.html, profile.html y profile_configuration.html.
   ===================================================== */
(function () {

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

    /* ── Notificaciones de ejemplo (en un backend real vendrían de la API) ── */
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

    /* ── Reflejar datos guardados (nombre / correo / foto) en el navbar ── */
    try {
        const user = JSON.parse(localStorage.getItem('competika_user') || 'null');
        if (user) {
            if (user.fullname) document.querySelectorAll('.nud-name').forEach(el => el.textContent = user.fullname);
            if (user.email) document.querySelectorAll('.nud-email').forEach(el => el.textContent = user.email);
            if (user.avatar) document.querySelectorAll('.nav-avatar-img').forEach(img => img.src = user.avatar);
        }
    } catch (e) { /* localStorage no disponible o dato corrupto: se ignora */ }
})();