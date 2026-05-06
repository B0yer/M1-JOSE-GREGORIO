/* ==========================================================================
   ARCHIVO DE LÓGICA PRINCIPAL - TALLER JOSÉ GREGORIO
   ========================================================================== */

/**
 * Controla la apertura y cierre del menú lateral (Sidebar)
 */
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

/**
 * Objeto global con la información detallada de cada servicio.
 * Se utiliza para alimentar dinámicamente el modal.
 */
const datosServicios = {
    'revision': {
        titulo: "Revisión (Diagnóstico y Preventivo)",
        subtitulo: "Esta categoría se enfoca en la detección de fallas y el mantenimiento que evita reparaciones costosas.",
        imagen: "galeria/s1.png",
        detalles: [
            { t: "Escaneo Computarizado", d: "Uso de tecnología de vanguardia para identificar códigos de error en la computadora del vehículo." },
            { t: "Revisión de Puntos de Control", d: "Inspección de niveles de fluidos, estado de correas, mangueras y batería." },
            { t: "Diagnóstico de Ruidos y Vibraciones", d: "Evaluación técnica para localizar anomalías en el tren delantero o motor." },
            { t: "Revisión Pre-compra", d: "Informe detallado sobre el estado real de un vehículo para un usuario interesado en adquirirlo." }
        ]
    },
    'mecanica-ligera': {
        titulo: "Mecánica Ligera (Mantenimiento Rápido)",
        subtitulo: "Servicios de rutina que no requieren el desarmado total de componentes mayores.",
        imagen: "galeria/s2.png",
        detalles: [
            { t: "Cambio de Aceite y Filtros", d: "Mantenimiento esencial para la vida útil del motor." },
            { t: "Sistema de Frenos", d: "Cambio de pastillas, rectificación de discos y bandas." },
            { t: "Tren Delantero y Suspensión", d: "Sustitución de amortiguadores, muñones, terminales y bujes." },
            { t: "Reemplazo de Bujías y Cables", d: "Tareas sencillas que mejoran el encendido." }
        ]
    },
    'entonacion': {
        titulo: "Entonación (Optimización de Desempeño)",
        subtitulo: "Específicamente diseñada para mejorar la eficiencia del combustible y la respuesta del motor.",
        imagen: "galeria/s3.png",
        detalles: [
            { t: "Limpieza de Inyectores", d: "Por ultrasonido o barrido para garantizar una combustión limpia." },
            { t: "Limpieza de Cuerpo de Aceleración", d: "Eliminación de carbón para un mínimo estable." },
            { t: "Reemplazo de Filtros de Aire y Gasolina", d: "Asegura el flujo correcto de aire y combustible." },
            { t: "Puesta a Punto", d: "Ajuste de parámetros electrónicos y mecánicos para un rendimiento óptimo." }
        ]
    },
    'mecanica-pesada': {
        titulo: "Mecánica Pesada (Trabajos de Motor y Mayor)",
        subtitulo: "Intervenciones profundas que requieren precisión técnica y herramientas especializadas.",
        imagen: "galeria/s4.png",
        detalles: [
            { t: "Reparación Completa de Motor (Overhaul)", d: "Desarmado, rectificación y armado del bloque y cámaras." },
            { t: "Reemplazo de Kit de Tiempo", d: "Cambio de correas o cadenas, tensores y bomba de agua." },
            { t: "Reparación de Transmisiones", d: "Intervención en cajas de velocidades automáticas o sincrónicas." },
            { t: "Sustitución de Empacaduras de Cámara", d: "Corrección de fugas de compresión o mezcla de fluidos." }
        ]
    }
};

/**
 * Función para abrir el modal y cargar la información del servicio seleccionado
 * @param {string} tipo - El identificador del servicio (key del objeto datosServicios)
 */
function abrirServicio(tipo) {
    const servicio = datosServicios[tipo];
    const contenedor = document.getElementById('detalle-servicio');
    
    if (!servicio) return;

    // Construcción del HTML dinámico para el modal
    contenedor.innerHTML = `
        <div class="layout-modal-dividido">

            <!-- Columna izquierda: logo encima de la imagen -->
            <div class="col-modal-izquierda">
                <div class="logo-sobre-imagen">
                    <img src="galeria/logo.png" alt="Logo José Gregorio" class="logo-modal">
                </div>
                <img src="${servicio.imagen}" class="img-modal-detalle" alt="${servicio.titulo}">
            </div>

            <!-- Columna derecha: título + lista -->
            <div class="col-modal-derecha">
                <h2 class="titulo-modal">${servicio.titulo}</h2>
                <p class="subtitulo-naranja">${servicio.subtitulo}</p>
                
                <div class="lista-detallada">
                    ${servicio.detalles.map(item => `
                        <div class="item-servicio">
                            <strong>${item.t}</strong>
                            <p>${item.d}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Botones centrados al fondo -->
        <div class="modal-footer">
            <button class="btn-retroceder" onclick="cerrarServicio()">← Regresar a Servicios</button>
            <a href="javascript:void(0)" onclick="gestionarSolicitudCita()" class="cta-button">Solicitar Cita Ahora</a>
        </div>
    `;

    const modal = document.getElementById('modalServicio');
    if (modal) {
        modal.style.display = "block";
        // Bloqueamos el scroll de la página principal
        document.body.style.overflow = "hidden";
        modal.scrollTop = 0; 
    }
}

/**
 * Cierra el modal y restablece el scroll de la página
 */
function cerrarServicio() {
    const modal = document.getElementById('modalServicio');
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

/**
 * Evento para cerrar el modal si el usuario hace clic fuera del contenido principal
 */
window.onclick = function(event) {
    const modal = document.getElementById('modalServicio');
    if (event.target == modal) {
        cerrarServicio();
    }
};

/* ==========================================================================
   Lógica para menú dinámico y control de sesión al cargar el documento
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Intentamos obtener el usuario que guardamos en el localStorage
    const usuarioGuardado = localStorage.getItem('usuarioLogueado');

    const contenedorUsuario = document.getElementById('contenedor-usuario');
    const nombreUsuarioMenu = document.getElementById('nombre-usuario-menu');
    const linksPublicos = document.querySelectorAll('.link-publico');
    const linksPrivados = document.querySelectorAll('.link-privado');
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');

    // 2. Validación: Si existe un usuario logueado en esta sesión
    if (usuarioGuardado) {
        const usuario = JSON.parse(usuarioGuardado);

        // Actualizamos la interfaz con el nombre del usuario
        if (nombreUsuarioMenu) {
            nombreUsuarioMenu.textContent = usuario.nombre;
        }
        
        // Mostramos el panel de bienvenida en el sidebar
        if (contenedorUsuario) {
            contenedorUsuario.style.display = 'block';
        }

        // Gestión de visibilidad de enlaces
        linksPublicos.forEach(link => {
            link.style.display = 'none';
        });
        
        linksPrivados.forEach(link => {
            link.style.display = 'block';
        });
    }

    // 3. Lógica para el botón de cerrar sesión
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Confirmación opcional para el usuario
            const confirmar = confirm("¿Estás seguro de que deseas cerrar tu sesión?");
            
            if (confirmar) {
                // Borramos los datos persistentes
                localStorage.removeItem('usuarioLogueado');
                
                // Notificación y recarga
                alert("Has cerrado sesión correctamente.");
                window.location.reload();
            }
        });
    }
});

/**
 * Función global para gestionar el redireccionamiento de citas.
 * Verifica si hay una sesión activa en localStorage para decidir el destino.
 */
function gestionarSolicitudCita() {
    const usuarioGuardado = localStorage.getItem('usuarioLogueado');

    if (usuarioGuardado) {
        // Si está logueado, va a sus citas
        window.location.href = 'cliente/mis-citas.html';
    } else {
        // Si no está logueado, va al inicio de sesión
        window.location.href = 'auth/login.html';
    }
}