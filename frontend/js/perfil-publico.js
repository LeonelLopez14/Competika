/* COMPETIKA — perfil-publico.js: ventana con el perfil de un jugador.
   Uso: PerfilPublico.jugador(participanteId)  o  PerfilPublico.solicitante(solicitudId).
   Necesita tournament-api.js (competikaApi) y logros.js (catalogoLogros). Crea la ventana sola si la página no la tiene. */
const PerfilPublico = (function () {
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function ventana() {
        let d = document.getElementById('pp-dialog');
        if (!d) {
            d = document.createElement('dialog');
            d.id = 'pp-dialog'; d.className = 'pp-dialog'; d.setAttribute('aria-label', 'Perfil del jugador');
            d.innerHTML = '<div id="pp-perfil"></div>';
            document.body.appendChild(d);
        }
        return d;
    }

    function mostrar(r) {
        const d = ventana(), cont = d.querySelector('#pp-perfil');
        if (!r.success) {
            cont.innerHTML = `<p class="pp-bio">${esc(r.error || 'No se pudo cargar el perfil.')}</p>
              <div class="pp-acciones"><button type="button" class="pp-cerrar" id="pp-cerrar">Cerrar</button></div>`;
        } else {
            const p = r.profile;
            const logros = p.activity ? catalogoLogros(p.activity).filter(desbloqueado) : [];
            const foto = p.photo ? `${window.competikaSiteRoot || '../../..'}/${p.photo}` : '';
            cont.innerHTML = `
              <div class="pp-cab">
                ${foto ? `<img src="${esc(foto)}" alt="" class="pp-foto">` : '<span class="pp-foto pp-foto--vacia"><i class="ti ti-user"></i></span>'}
                <div><h2>${esc(p.name)}</h2>${p.username ? `<p class="pp-sub">@${esc(p.username)}</p>` : ''}</div>
              </div>
              <p class="pp-bio">${p.bio ? esc(p.bio) : 'Todavía no escribió una biografía.'}</p>
              <div class="pp-stats">
                <div><strong>${p.stats.tournaments}</strong><span>Torneos</span></div>
                <div><strong>${p.stats.titles}</strong><span>Títulos</span></div>
                <div><strong>${p.stats.matches}</strong><span>Partidos</span></div>
                <div><strong>${p.stats.wins}</strong><span>Victorias</span></div>
              </div>
              ${(p.titlesBySport || []).length ? `<h3 class="pp-subtitulo">Títulos por deporte</h3>
              <div class="pp-titulos">${p.titlesBySport.map(g => `<span class="pp-titulo"><i class="ti ti-trophy"></i> ${esc(g.sport)} <strong>${g.count}</strong></span>`).join('')}</div>` : ''}
              <h3 class="pp-subtitulo">Logros <span class="pp-cuenta">${logros.length}</span></h3>
              ${logros.length ? `<div class="pp-logros">${logros.map(a => `
                <span class="pp-logro${a.clase ? ' pp-logro--' + a.clase : ''}" title="${esc(a.subActual || a.sub)}">
                  <span class="pp-logro-icono" style="background:${a.bg};color:${a.color}"><i class="ti ${a.icon}"></i></span>${esc(a.title)}</span>`).join('')}</div>`
                : '<p class="pp-vacio">Todavía no desbloqueó logros.</p>'}
              <ul class="pp-datos">
                <li><i class="ti ti-id-badge-2"></i> ${p.card ? 'Tiene carné de deportista' : 'Sin carné de deportista'}</li>
              </ul>
              <div class="pp-acciones"><button type="button" class="pp-cerrar" id="pp-cerrar">Cerrar</button></div>`;
        }
        cont.querySelector('#pp-cerrar').addEventListener('click', () => d.close());
        if (!d.open) d.showModal();
    }

    return {
        jugador: async pid => mostrar(await competikaApi('player_profile', { api: 'teams', params: { p: pid } })),
        solicitante: async id => mostrar(await competikaApi('join_profile', { api: 'teams', params: { id } })),
    };
})();
