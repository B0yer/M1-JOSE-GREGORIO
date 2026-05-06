// js/imbox.js — JOSE GREGORIO C.A.
// Estrategia definitiva:
//   - La campana se inyecta como div HERMANO INMEDIATO del .menu-toggle (lado izquierdo)
//   - El navbar usa justify-content:space-between, por lo que hamburguesa+campana
//     quedan juntos a la izquierda y el logo a la derecha
//   - El panel flotante usa position:fixed (no absolute) para no ser tapado por
//     ningún elemento hijo del navbar con overflow o z-index conflictivo

(function () {
    'use strict';

    const POLL_INTERVAL = 30000;
    let pollTimer = null;

    function getUsuario() {
        try { return JSON.parse(localStorage.getItem('usuarioLogueado')); }
        catch { return null; }
    }

    function getRol(u) {
        if (!u || !u.rol) return '';
        return u.rol.trim().replace(/'/g, '').toLowerCase();
    }

    // ── CSS dinámico: ruta absoluta, funciona en cualquier subcarpeta ─────────
    function inyectarCSS() {
        if (document.getElementById('inbox-css-link')) return;
        const link  = document.createElement('link');
        link.id     = 'inbox-css-link';
        link.rel    = 'stylesheet';
        link.href   = '/css/imbox.css';
        document.head.appendChild(link);
    }

    // ── Inyectar campana al LADO IZQUIERDO (junto a la hamburguesa) ───────────
    function inyectarInbox() {
        // Esperar a que el navbar exista (puede llamarse tarde en páginas internas)
        const navbar = document.querySelector('.navbar');
        if (!navbar || document.getElementById('inbox-btn')) return;

        const toggle = navbar.querySelector('.menu-toggle');
        if (!toggle) return;

        // Creamos un wrapper flex que agrupa hamburguesa + campana a la izquierda
        // Para no romper el layout de space-between, envolvemos el toggle
        // existente junto con la campana en un div.navbar-left
        const navLeft = document.createElement('div');
        navLeft.className = 'navbar-left';

        // Mover el toggle dentro del navLeft
        navbar.insertBefore(navLeft, toggle);
        navLeft.appendChild(toggle);

        // Crear el wrapper de la campana
        const wrapper = document.createElement('div');
        wrapper.className = 'inbox-wrapper';
        wrapper.id = 'inbox-wrapper';
        wrapper.innerHTML = `
            <button class="inbox-btn" id="inbox-btn"
                    title="Notificaciones" aria-label="Abrir notificaciones">
                <i class="fas fa-bell"></i>
                <span class="inbox-badge" id="inbox-badge" style="display:none;">0</span>
            </button>`;

        // Panel se pone en el BODY (fuera del navbar) para evitar cualquier
        // problema de clipping/z-index/overflow del navbar
        const panel = document.createElement('div');
        panel.className = 'inbox-panel';
        panel.id = 'inbox-panel';
        panel.setAttribute('aria-hidden', 'true');
        panel.innerHTML = `
            <div class="inbox-header">
                <span>🔔 Notificaciones</span>
                <button class="inbox-mark-all" id="inbox-mark-all"
                        title="Marcar todas como leídas">
                    <i class="fas fa-check-double"></i>
                </button>
            </div>
            <ul class="inbox-lista" id="inbox-lista">
                <li class="inbox-vacio">Cargando...</li>
            </ul>`;

        navLeft.appendChild(wrapper);
        document.body.appendChild(panel); // ← panel en el body, no en el navbar

        // Eventos
        document.getElementById('inbox-btn').addEventListener('click', togglePanel);
        document.getElementById('inbox-mark-all').addEventListener('click', marcarTodasLeidas);
        document.addEventListener('click', (e) => {
            const p = document.getElementById('inbox-panel');
            const b = document.getElementById('inbox-btn');
            if (!p || !b) return;
            if (!p.contains(e.target) && !b.contains(e.target)) cerrarPanel();
        });
    }

    // ── Posicionar el panel flotante bajo la campana (usando getBoundingClientRect) ──
    function posicionarPanel() {
        const btn   = document.getElementById('inbox-btn');
        const panel = document.getElementById('inbox-panel');
        if (!btn || !panel) return;

        const rect = btn.getBoundingClientRect();
        panel.style.top  = (rect.bottom + 10) + 'px';
        panel.style.left = rect.left + 'px';
    }

    function togglePanel() {
        const panel = document.getElementById('inbox-panel');
        if (!panel) return;
        panel.classList.contains('inbox-panel--open') ? cerrarPanel() : abrirPanel();
    }

    function abrirPanel() {
        posicionarPanel();
        const panel = document.getElementById('inbox-panel');
        panel.classList.add('inbox-panel--open');
        panel.setAttribute('aria-hidden', 'false');
        marcarTodasLeidas();
    }

    function cerrarPanel() {
        const panel = document.getElementById('inbox-panel');
        if (!panel) return;
        panel.classList.remove('inbox-panel--open');
        panel.setAttribute('aria-hidden', 'true');
    }

    // ── Fetch notificaciones ──────────────────────────────────────────────────
    async function fetchNotificaciones() {
        const usuario = getUsuario();
        if (!usuario) return;

        const rol = getRol(usuario);
        const url = (rol === 'admin' || rol === 'superusuario')
            ? '/api/notificaciones?tipo=admin'
            : `/api/notificaciones?tipo=cliente&cedula=${encodeURIComponent(usuario.cedula)}`;

        try {
            const res  = await fetch(url);
            const json = await res.json();
            if (json.success) {
                renderNotificaciones(json.data);
                actualizarBadge(json.data);
            }
        } catch (err) {
            console.warn('Inbox: error al obtener notificaciones', err);
        }
    }

    function renderNotificaciones(lista) {
        const ul = document.getElementById('inbox-lista');
        if (!ul) return;
        if (!lista || lista.length === 0) {
            ul.innerHTML = '<li class="inbox-vacio"><i class="fas fa-inbox"></i><br>Sin notificaciones</li>';
            return;
        }
        ul.innerHTML = lista.map(n => `
            <li class="inbox-item ${n.leido ? 'inbox-item--leida' : ''}" data-id="${n.id}">
                <div class="inbox-item-icono">${iconoPorMensaje(n.mensaje)}</div>
                <div class="inbox-item-cuerpo">
                    <p class="inbox-item-texto">${n.mensaje}</p>
                    <span class="inbox-item-fecha">${formatearFecha(n.fecha)}</span>
                </div>
                ${!n.leido ? '<span class="inbox-punto"></span>' : ''}
            </li>`).join('');
    }

    function actualizarBadge(lista) {
        const badge = document.getElementById('inbox-badge');
        if (!badge) return;
        const noLeidas = (lista || []).filter(n => !n.leido).length;
        if (noLeidas > 0) {
            badge.textContent = noLeidas > 99 ? '99+' : noLeidas;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    async function marcarTodasLeidas() {
        const usuario = getUsuario();
        if (!usuario) return;
        const rol = getRol(usuario);
        const url = (rol === 'admin' || rol === 'superusuario')
            ? '/api/notificaciones/marcar-leidas?tipo=admin'
            : `/api/notificaciones/marcar-leidas?tipo=cliente&cedula=${encodeURIComponent(usuario.cedula)}`;
        try {
            await fetch(url, { method: 'PUT' });
            await fetchNotificaciones();
        } catch (err) {
            console.warn('Inbox: error al marcar leídas', err);
        }
    }

    function iconoPorMensaje(msg) {
        if (!msg) return '🔔';
        const m = msg.toLowerCase();
        if (m.includes('aceptada') || m.includes('confirmada')) return '✅';
        if (m.includes('rechazada') || m.includes('cancelada'))  return '❌';
        if (m.includes('entregado') || m.includes('finaliz'))    return '🏁';
        if (m.includes('reparación') || m.includes('reparacion'))return '🔧';
        if (m.includes('nueva cita') || m.includes('solicit'))   return '📋';
        return '🔔';
    }

    function formatearFecha(isoStr) {
        if (!isoStr) return '';
        try {
            return new Date(isoStr).toLocaleString('es-VE', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });
        } catch { return isoStr; }
    }

    function init() {
        const usuario = getUsuario();
        if (!usuario) return;
        inyectarCSS();
        inyectarInbox();
        fetchNotificaciones();
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(fetchNotificaciones, POLL_INTERVAL);
    }

    // menu-desplegable.js ya habrá creado el navbar antes de añadir este script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 50));
    } else {
        setTimeout(init, 50);
    }

    window.inboxRefresh = fetchNotificaciones;
})();
