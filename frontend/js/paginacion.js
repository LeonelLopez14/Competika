// Paginador reutilizable: muestra una lista de a "porPagina" elementos con botones Anterior / Siguiente.
//   const pag = crearPaginador({ contenedor: <ul>, porPagina: 5, pintar: item => '<li>…</li>', vacio: '<li>No hay nada</li>' });
//   pag.mostrar(listaCompleta);
window.crearPaginador = function (opc) {
    const contenedor = opc.contenedor;
    const porPagina = opc.porPagina || 5;
    let items = [];
    let pagina = 1;

    const nav = document.createElement('nav');
    nav.className = 'tv-pager';
    nav.setAttribute('aria-label', 'Paginación');
    nav.hidden = true;
    contenedor.after(nav);

    function dibujar() {
        const total = Math.max(1, Math.ceil(items.length / porPagina));
        pagina = Math.min(Math.max(1, pagina), total);
        const desde = (pagina - 1) * porPagina;
        contenedor.innerHTML = items.length ? items.slice(desde, desde + porPagina).map(opc.pintar).join('') : (opc.vacio || '');
        nav.hidden = total <= 1;
        nav.innerHTML =
            `<button type="button" class="tv-btn tv-btn--ghost" data-ir="-1"${pagina === 1 ? ' disabled' : ''}><i class="ti ti-chevron-left"></i> Anterior</button>` +
            `<span class="tv-pager-info">Página ${pagina} de ${total}</span>` +
            `<button type="button" class="tv-btn tv-btn--ghost" data-ir="1"${pagina === total ? ' disabled' : ''}>Siguiente <i class="ti ti-chevron-right"></i></button>`;
    }

    nav.addEventListener('click', (e) => {
        const b = e.target.closest('[data-ir]');
        if (!b || b.disabled) return;
        pagina += Number(b.dataset.ir);
        dibujar();
    });

    return {
        // Si la lista cambia (por ejemplo, al guardar un resultado) se queda en la misma página, salvo que ya no exista
        mostrar(nuevos) { items = nuevos; dibujar(); }
    };
};
