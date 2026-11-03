/* COMPETIKA — player-search.js: pestaña "Jugadores" de la página de búsqueda.
   Busca por nombre o @usuario (api/teams.php?action=search_players), de a 8 por página, y abre el perfil con PerfilPublico. */
(function () {
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const corto = n => String(n || '').trim().split(/\s+/).slice(0, 2).join(' ');   // primer nombre y primer apellido
    const iniciales = n => corto(n).split(' ').map(x => x[0] || '').join('').toUpperCase();

    // Secciones de la pestaña "Torneos": se esconden al pasar a "Jugadores"
    const TORNEOS = ['deportes-seccion', 'divisor', 'torneos-seccion'];
    let texto = '', pagina = 1, esperar = null, numero = 0;

    function cambiarPestana(tab) {
        const jugadores = tab === 'jugadores';
        document.querySelectorAll('.buscar-tab').forEach(b => {
            const on = b.dataset.tab === tab;
            b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on));
        });
        TORNEOS.forEach(id => { const e = $(id); if (e) e.style.display = jugadores ? 'none' : ''; });
        $('jugadores-seccion').style.display = jugadores ? '' : 'none';
        $('buscar-titulo').textContent = jugadores ? 'BUSCAR JUGADORES' : 'BUSCAR TORNEOS';
        $('buscar-descripcion').textContent = jugadores ? 'Encontrá a otros jugadores y mirá sus títulos y logros.' : 'Inscribite o seguí los deportes que más te gustan.';
        if (jugadores) { $('jug-buscador').focus(); if (!texto) mostrarEstado('Escribí al menos 2 letras para buscar.'); }
    }

    function mostrarEstado(msg) { $('jug-estado').textContent = msg; $('jug-lista').innerHTML = ''; $('jug-pager').hidden = true; }

    async function buscar() {
        if (texto.length < 2) { mostrarEstado('Escribí al menos 2 letras para buscar.'); return; }
        const mio = ++numero;
        $('jug-estado').textContent = 'Buscando…';
        const r = await competikaApi('search_players', { api: 'teams', params: { q: texto, page: pagina } });
        if (mio !== numero) return;   // llegó tarde: ya se pidió otra búsqueda
        if (!r.success) { mostrarEstado(r._status === 401 ? 'Iniciá sesión para buscar jugadores.' : (r.error || 'No se pudo buscar.')); return; }
        if (!r.players.length) { mostrarEstado('No encontramos jugadores con ese nombre.'); return; }
        const paginas = Math.max(1, Math.ceil(r.total / r.perPage));
        $('jug-estado').textContent = `${r.total} jugador${r.total === 1 ? '' : 'es'}`;
        $('jug-lista').innerHTML = r.players.map(p => {
            const foto = p.photo ? `${window.competikaSiteRoot || '../../..'}/${p.photo}` : '';
            return `<li><button type="button" class="jug-fila" data-pid="${p.pid}">
                ${foto ? `<img class="jug-avatar" src="${esc(foto)}" alt="">` : `<span class="jug-avatar">${esc(iniciales(p.name))}</span>`}
                <span class="jug-datos"><span class="jug-nombre">${esc(corto(p.name))}</span>${p.username ? `<span class="jug-usuario">@${esc(p.username)}</span>` : ''}</span>
                <span class="jug-torneos">${p.tournaments} torneo${p.tournaments === 1 ? '' : 's'}</span></button></li>`;
        }).join('');
        const pager = $('jug-pager');
        pager.hidden = paginas <= 1;
        pager.innerHTML = `<button type="button" data-ir="-1"${pagina <= 1 ? ' disabled' : ''}>Anterior</button><span>Página ${pagina} de ${paginas}</span><button type="button" data-ir="1"${pagina >= paginas ? ' disabled' : ''}>Siguiente</button>`;
    }

    document.querySelectorAll('.buscar-tab').forEach(b => b.addEventListener('click', () => cambiarPestana(b.dataset.tab)));
    $('jug-buscador').addEventListener('input', e => {
        texto = e.target.value.trim(); pagina = 1;
        clearTimeout(esperar); esperar = setTimeout(buscar, 300);   // espera a que termine de escribir
    });
    $('jug-lista').addEventListener('click', e => { const f = e.target.closest('[data-pid]'); if (f) PerfilPublico.jugador(f.dataset.pid); });
    $('jug-pager').addEventListener('click', e => {
        const b = e.target.closest('[data-ir]'); if (!b || b.disabled) return;
        pagina += Number(b.dataset.ir); buscar();
    });
})();
