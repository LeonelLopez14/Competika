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

    /* ── Sesión (api/session.php) ── */
    const siteRoot = scriptSrc.replace(/\/frontend\/js\/navbar-user\.js.*$/, '');
    const navUser = document.querySelector('.navbar-user');
    const guestItems = Array.from(document.querySelectorAll('.navbar-list a[href$="login/login.html"], .navbar-list a[href$="register/register.html"], .mobile-menu-list a[href$="login/login.html"], .mobile-menu-list a[href$="register/register.html"]')).map(a => a.closest('li'));
    const memberItems = Array.from(document.querySelectorAll('.mobile-menu-list a[href$="profile/profile.html"], .mobile-menu-list a[href$="profile_configuration/profile_configuration.html"]')).map(a => a.closest('li'));
    const defaultAvatar = document.querySelector('.nav-avatar-img')?.getAttribute('src') || '';
    const LOGIN = siteRoot + '/frontend/paginas/login/login.html';
    const REGISTER = siteRoot + '/frontend/paginas/register/register.html';
    const PROFILE = siteRoot + '/frontend/paginas/profile/profile.html';
    const SETTINGS = siteRoot + '/frontend/paginas/profile_configuration/profile_configuration.html';
    const DASHBOARD = siteRoot + '/frontend/paginas/tournament_dashboard/tournament_dashboard.html';
    const VIEW = siteRoot + '/frontend/paginas/tournament_view/tournament_view.html';
    const JUDGE = siteRoot + '/frontend/paginas/judge/judge.html';
    const ADMIN = siteRoot + '/frontend/paginas/admin/admin.html';

    [navUser, ...guestItems, ...memberItems].forEach(el => { if (el) el.style.visibility = 'hidden'; });

    function setText(selector, value) {
        document.querySelectorAll(selector).forEach(el => { el.textContent = value; });
    }

    function setAvatar(url) {
        const src = url ? siteRoot + '/' + url : defaultAvatar;
        document.querySelectorAll('.nav-avatar-img, .pf-avatar').forEach(img => { img.src = src; });
    }

    function setMenu(items) {
        document.querySelectorAll('.nav-user-dropdown').forEach(dd => {
            const actuales = dd.querySelectorAll('.nud-item');
            for (let i = actuales.length; i < items.length; i++) dd.appendChild(actuales[actuales.length - 1].cloneNode(true));
            dd.querySelectorAll('.nud-item').forEach((a, i) => {
                const it = items[i];
                a.style.display = it ? '' : 'none';
                if (!it) return;
                a.href = it.href;
                a.classList.toggle('nud-item--danger', !!it.danger);
                a.innerHTML = `<i class="ti ${it.icon}"></i>`;
                a.appendChild(document.createTextNode(it.text));
            });
        });
    }

    /** Enlaces de la barra y del menú móvil según el rol (juez, admin). */
    function setRoleLinks(links) {
        document.querySelectorAll('[data-role-link]').forEach(li => li.remove());
        const lists = [
            [document.querySelector('.navbar-list'), 'nav-links'],
            [document.querySelector('.mobile-menu-list'), ''],
        ];
        lists.forEach(([ul, cls]) => {
            if (!ul) return;
            const ref = Array.from(ul.children).find(li => li.querySelector('a[href$="login/login.html"]'));
            links.forEach(l => {
                const li = document.createElement('li');
                li.dataset.roleLink = '';
                if (cls) li.className = cls;
                const a = document.createElement('a');
                a.href = l.href;
                a.textContent = l.text;
                if (location.pathname.endsWith(new URL(l.href, location.href).pathname)) a.setAttribute('aria-current', 'page');
                li.appendChild(a);
                ul.insertBefore(li, ref || null);
            });
        });
    }

    function renderSession(s) {
        const logged = !!(s && s.logged);
        guestItems.forEach(li => { if (li) { li.style.display = logged ? 'none' : ''; li.style.visibility = ''; } });
        memberItems.forEach(li => { if (li) { li.style.display = logged ? '' : 'none'; li.style.visibility = ''; } });
        if (navUser) { navUser.style.display = ''; navUser.style.visibility = ''; }
        const bell = document.getElementById('notif-wrap');

        if (!logged) {
            setRoleLinks([]);
            if (/\/frontend\/paginas\/(profile|profile_configuration|judge|admin)\//.test(location.pathname)) {
                location.replace(LOGIN);
                return;
            }
            // Invitado
            if (bell) bell.style.display = 'none';
            setText('.nav-avatar-name', 'Invitado');
            setText('.nud-name', 'Invitado');
            setText('.nud-email', 'Navegando sin cuenta');
            setAvatar(null);
            document.querySelectorAll('.nav-avatar-link').forEach(a => { a.href = LOGIN; a.setAttribute('aria-label', 'Iniciar sesión'); });
            setMenu([
                { href: LOGIN, icon: 'ti-login', text: 'Iniciar sesión' },
                { href: REGISTER, icon: 'ti-user-plus', text: 'Registrarse' },
            ]);
            return;
        }

        if (bell) bell.style.display = '';
        const initial = s.apellido ? ' ' + s.apellido.charAt(0).toUpperCase() + '.' : '';
        setText('.nud-name, .pf-name', (s.nombre + ' ' + s.apellido).trim());
        setText('.nud-email, .pf-email', s.email);
        setText('.nav-avatar-name', s.nombre + initial);
        setAvatar(s.foto);
        document.querySelectorAll('.nav-avatar-link').forEach(a => { a.href = PROFILE; a.setAttribute('aria-label', 'Ir a mi perfil'); });
        const roles = s.roles || {};
        setMenu([
            { href: PROFILE, icon: 'ti-user', text: 'Mi Perfil' },
            { href: SETTINGS, icon: 'ti-settings', text: 'Configuración' },
            ...(roles.juez ? [{ href: JUDGE, icon: 'ti-gavel', text: 'Mis arbitrajes' }] : []),
            ...(roles.admin ? [{ href: ADMIN, icon: 'ti-shield-lock', text: 'Administración' }] : []),
            { href: siteRoot + '/controller/logout.php', icon: 'ti-logout', text: 'Cerrar sesión', danger: true },
        ]);
        setRoleLinks([
            ...(roles.juez ? [{ href: JUDGE, text: 'Arbitrajes' }] : []),
            ...(roles.admin ? [{ href: ADMIN, text: 'Admin' }] : []),
        ]);
        [['organizador', roles.organizador], ['participante', roles.participante], ['juez', roles.juez]].forEach(([rol, on]) => {
            document.querySelectorAll('.pf-role--' + rol).forEach(el => { el.style.display = on ? '' : 'none'; });
        });
        startNotifications();
    }

    /* ── Notificaciones (tiempo real con SSE, o cada 30 s) ── */
    const NOTIF_API = siteRoot + '/api/notifications.php';
    const ICONS = {
        nuevo_inscripto: 'ti-user-plus', inscripcion: 'ti-door-enter', partido: 'ti-calendar-event',
        resultado: 'ti-trophy', recordatorio: 'ti-alarm', torneo_estado: 'ti-tournament', torneo_revision: 'ti-hourglass',
        torneo_cancelado: 'ti-circle-x', partido_cancelado: 'ti-calendar-x', baja: 'ti-user-minus', arbitraje: 'ti-gavel', juez: 'ti-gavel', solicitud_juez: 'ti-file-description',
        anuncio: 'ti-speakerphone', contacto: 'ti-mail', invitacion: 'ti-mail-forward', seguridad: 'ti-shield-lock',
    };
    let notifs = [];
    let unread = 0;
    let started = false;
    let receivedAt = Date.now();

    function haceTexto(seg) {
        if (seg < 60) return 'Hace un momento';
        if (seg < 3600) return `Hace ${Math.floor(seg / 60)} min`;
        if (seg < 86400) return `Hace ${Math.floor(seg / 3600)} h`;
        const d = Math.floor(seg / 86400);
        return d === 1 ? 'Hace 1 día' : `Hace ${d} días`;
    }

    function linkDe(n) {
        if (n.tipo === 'nuevo_inscripto' && n.torneoId) return `${DASHBOARD}?t=${encodeURIComponent(n.torneoId)}`;
        if (n.tipo === 'torneo_revision') return ADMIN + '#torneos';
        if (n.tipo === 'arbitraje') return JUDGE;
        if (n.tipo === 'solicitud_juez') return ADMIN;
        if (n.tipo === 'contacto') return ADMIN + '#mensajes';
        if (n.tipo === 'seguridad') return SETTINGS;
        if (n.tipo === 'juez') return SETTINGS;
        if (n.torneoId) return `${VIEW}?t=${encodeURIComponent(n.torneoId)}`;     // página pública del torneo
        return PROFILE;
    }

    function renderNotifications() {
        const list = document.getElementById('notif-list');
        const badge = document.getElementById('notif-badge');
        if (list) {
            list.textContent = '';
            if (!notifs.length) {
                const empty = document.createElement('div');
                empty.className = 'nnd-empty';
                empty.textContent = 'No tenés notificaciones.';
                list.appendChild(empty);
            }
            const extra = Math.floor((Date.now() - receivedAt) / 1000);
            notifs.forEach(n => {
                const item = document.createElement('a');
                item.className = 'nnd-item' + (n.leida ? '' : ' nnd-item--unread');
                item.href = linkDe(n);
                item.style.textDecoration = 'none';
                item.innerHTML = `<span class="nnd-icon"><i class="ti ${ICONS[n.tipo] || 'ti-bell'}"></i></span>
                    <span class="nnd-body"><span class="nnd-title"></span><span class="nnd-time"></span></span>`;
                item.querySelector('.nnd-title').textContent = n.mensaje;          // texto, nunca HTML
                item.querySelector('.nnd-time').textContent = haceTexto(n.hace + extra);
                item.addEventListener('click', () => {
                    if (!n.leida) {
                        n.leida = true; unread = Math.max(0, unread - 1);
                        navigator.sendBeacon?.(`${NOTIF_API}?action=read`, new Blob([JSON.stringify({ id: n.id })], { type: 'application/json' }));
                    }
                });
                list.appendChild(item);
            });
        }
        if (badge) {
            badge.textContent = unread > 9 ? '9+' : String(unread);
            badge.style.display = unread > 0 ? '' : 'none';
        }
    }

    async function loadNotifications() {
        try {
            const r = await fetch(`${NOTIF_API}?action=list`, { credentials: 'same-origin', cache: 'no-store' });
            const d = await r.json();
            if (!d.success) return;
            notifs = d.items; unread = d.unread; receivedAt = Date.now();
            renderNotifications();
        } catch (e) { /* sin conexión: se reintenta en el próximo ciclo */ }
    }

    function addNotification(n) {
        if (notifs.some(x => x.id === n.id)) return;
        const extra = Math.floor((Date.now() - receivedAt) / 1000);
        notifs.forEach(x => { x.hace += extra; });
        receivedAt = Date.now();
        notifs.unshift(n);
        notifs = notifs.slice(0, 30);
        if (!n.leida) unread++;
        renderNotifications();
        const badge = document.getElementById('notif-badge');
        badge?.animate?.([{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 400 });
    }

    async function startNotifications() {
        if (started) return;
        started = true;
        await loadNotifications();
        const after = notifs.reduce((m, n) => Math.max(m, n.id), 0);
        if ('EventSource' in window) {
            const es = new EventSource(`${NOTIF_API}?action=stream&after=${after}`);
            es.addEventListener('notif', e => { try { addNotification(JSON.parse(e.data)); } catch (err) { /* dato inválido */ } });
            es.onerror = () => {
                if (es.readyState === EventSource.CLOSED) setInterval(loadNotifications, 30000);
            };
        } else {
            setInterval(loadNotifications, 30000);
        }
        setInterval(renderNotifications, 60000);           // refresca el "Hace X min"
    }

    document.getElementById('notif-mark-all')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        notifs.forEach(n => { n.leida = true; });
        unread = 0;
        renderNotifications();
        try { await fetch(`${NOTIF_API}?action=read_all`, { method: 'POST', credentials: 'same-origin' }); } catch (err) { /* reintento al recargar */ }
    });

    // Redes del pie de página: las que quedan vacías no se muestran
    const REDES = {
        instagram: '',
        x:         '',
        tiktok:    '',
        discord:   '',
    };
    document.querySelectorAll('.footer-social').forEach(cont => {
        cont.querySelectorAll('.footer-social-link').forEach(a => {
            const red = Object.keys(REDES).find(k => a.querySelector(`.ti-brand-${k}`));
            const url = red ? REDES[red] : '';
            if (!url) { a.remove(); return; }
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        });
        if (!cont.querySelector('.footer-social-link')) cont.hidden = true;
    });

    // Otras páginas (perfil, configuración, formulario) reutilizan esta misma consulta
    window.competikaSiteRoot = siteRoot;
    window.competikaSessionReady = fetch(siteRoot + '/api/session.php', { credentials: 'same-origin', cache: 'no-store' })
        .then(r => r.json())
        .catch(() => ({ logged: false }));
    window.competikaSessionReady.then(renderSession);
    window.competikaRefreshSession = () => fetch(siteRoot + '/api/session.php', { credentials: 'same-origin', cache: 'no-store' })
        .then(r => r.json()).then(s => { renderSession(s); return s; });
})();
