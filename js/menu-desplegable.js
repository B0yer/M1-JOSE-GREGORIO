// js/menu-desplegable.js

// 1. Definimos el Header (Barra superior)
const headerHTML = `
<nav class="navbar">
    <div class="menu-toggle" onclick="toggleMenu()">
        <span></span><span></span><span></span>
    </div>
    <div class="contenedor-identidad">
        <div class="empresa-nombre">JOSE GREGORIO<small>C.A.</small></div>
        <div class="rif-texto">RIF: J407677593</div>
    </div>
</nav>`;

// 2. Función para generar el Sidebar dependiendo del ROL
function generarSidebar() {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));
    
    const rolLimpio = usuario && usuario.rol ? usuario.rol.trim().replace(/'/g, '') : '';
    
    const esAdmin = usuario && (rolLimpio === 'admin' || rolLimpio === 'superusuario');
    const esSuper = usuario && (rolLimpio === 'superusuario');

    let opcionesMenu = `<li><a href="/index.html">Inicio</a></li>`;

    if (esAdmin) {
        opcionesMenu += `
            <li>
                <a href="/admin/gestionar-citas.html">Gestionar citas</a>
            </li>
            <li>
                <a href="/admin/usuarios.html">Panel de Clientes</a>
            </li>
        `;
        if (esSuper) {
            opcionesMenu += `
                <li>
                    <a href="/admin/admins.html">Panel de Usuarios</a>
                </li>
                <li>
                    <a href="/admin/auditoria.html">Auditoría de Actividad</a>
                </li>
            `;
        }
    } else {
        opcionesMenu += `
            <li><a href="/index.html#servicios">Nuestros Servicios</a></li>
            <li class="link-privado"><a href="/cliente/registrar-vehiculo.html">Registrar Vehículo</a></li>
            <li class="link-privado"><a href="/cliente/mis-vehiculos.html">Mis Vehículos</a></li>
            <li class="link-privado"><a href="/cliente/mis-citas.html">Mis Citas Activas</a></li>
            <li class="link-privado"><a href="/cliente/estado-reparacion.html">Estado de Reparación</a></li>
            <li class="link-privado"><a href="/cliente/historial.html">Historial de Servicios</a></li>
            <li class="link-privado">
                <a href="https://drive.google.com/file/d/1Ud7KOgKv_gsIKNzwh_nV1qUDwIX3JGu7/view?usp=drive_link" target="_blank">
                    Manual de Usuario
                </a>
            </li>
        `;
    }

    opcionesMenu += `
        <li class="link-privado"><a href="/cliente/configuracion.html">Mi Cuenta</a></li>
    `;

    return `
    <aside class="sidebar" id="sidebar">
        <span class="close-btn" onclick="toggleMenu()">&times;</span>
        
        <div id="contenedor-usuario" style="display:none; padding: 20px; border-bottom: 1px solid #333;">
            <p style="color: #888; margin:0; font-size: 12px; text-transform: uppercase;">
                ${esSuper ? 'Súper Usuario' : (esAdmin ? 'Panel Administrativo' : 'Bienvenido')}
            </p>
            <strong id="nombre-usuario-menu" style="color: #ff6600; font-size: 18px;"></strong>
        </div>

        <ul>
            ${opcionesMenu}
            
            <li class="link-publico"><a href="/auth/login.html">Iniciar Sesión</a></li>
            <li class="link-publico"><a href="/auth/registro.html">Registrarse</a></li>
            
            <li style="border-top: 1px solid #333; margin-top: 15px; padding: 15px 25px;">
                <p style="color: #ff6600; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Contacto Directo</p>
                <a href="https://wa.me/584241234567" target="_blank" style="padding: 5px 0; font-size: 14px; color: #25d366; display: block; text-decoration: none;">WhatsApp</a>
                <a href="tel:+582431234567" style="padding: 5px 0; font-size: 14px; display: block; text-decoration: none; color: #ccc;">Llamar al Taller</a>
            </li>

            <li class="link-privado">
                <a href="#" id="btnCerrarSesion" style="color: #cc0000; font-weight: bold; margin-top: 10px;">
                    Cerrar Sesión
                </a>
            </li>
        </ul>
    </aside>`;
}

// 3. Inyectar componentes y configurar visibilidad
document.addEventListener("DOMContentLoaded", () => {
    const hContainer = document.getElementById('header-dinamico');
    const sContainer = document.getElementById('sidebar-dinamico');

    if (hContainer) hContainer.innerHTML = headerHTML;
    if (sContainer) sContainer.innerHTML = generarSidebar();

    const usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));
    const contenedorUser = document.getElementById('contenedor-usuario');
    const nombreUserMenu = document.getElementById('nombre-usuario-menu');

    if (usuario) {
        if (contenedorUser) contenedorUser.style.display = 'block';
        if (nombreUserMenu) nombreUserMenu.textContent = usuario.nombre;
        
        document.querySelectorAll('.link-publico').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.link-privado').forEach(el => {
            el.style.setProperty('display', 'block', 'important');
        });

        // ── Cargar imbox.js DESPUÉS de que el navbar ya existe en el DOM ──
        // Solo para usuarios logueados, y solo si no se cargó antes
        if (!document.getElementById('imbox-script')) {
            const s = document.createElement('script');
            s.id  = 'imbox-script';
            s.src = '/js/imbox.js';
            document.body.appendChild(s);
        }

    } else {
        document.querySelectorAll('.link-privado').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.link-publico').forEach(el => el.style.display = 'block');
    }
});

// 4. Lógica de cierre de sesión
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btnCerrarSesion') {
        e.preventDefault();
        localStorage.removeItem('usuarioLogueado');
        const rutaActual = window.location.pathname;
        if (rutaActual.includes('/admin/') || rutaActual.includes('/cliente/')) {
            window.location.href = '../auth/login.html';
        } else {
            window.location.href = 'auth/login.html';
        }
    }
});

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}
