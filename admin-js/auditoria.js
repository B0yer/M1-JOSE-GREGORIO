const URL_API = "[https://m1-jose-gregorio-c2pe.vercel.app/api](https://m1-jose-gregorio-c2pe.vercel.app/api)";

// ─── Configuración de íconos y colores por tipo de evento ───────────────────
const TIPO_CONFIG = {
    cita: {
        icono: 'fas fa-calendar-check',
        color: '#ff6600',
        label: 'Cita'
    },
    usuario: {
        icono: 'fas fa-user-times',
        color: '#ff4444',
        label: 'Usuario'
    },
    sistema: {
        icono: 'fas fa-cog',
        color: '#00cc88',
        label: 'Sistema'
    }
};

// Íconos específicos por acción (para distinguir vehículo de registro de usuario)
const ACCION_ICONO = {
    'Vehículo registrado': 'fas fa-car',
    'Vehículo entregado':  'fas fa-car-side',
    'Registro de usuario': 'fas fa-user-plus',
    'Nueva cita creada':   'fas fa-calendar-plus',
    'Cita Aceptada':       'fas fa-calendar-check',
    'Cita Rechazada':      'fas fa-calendar-times',
    'Cita Finalizada':     'fas fa-flag-checkered',
    'Reparación actualizada':'fas fa-wrench'
};

// ─── Inicialización ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que sea superusuario
    const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));
    const rolLimpio = usuarioLogueado?.rol?.trim().replace(/'/g, '');

    if (!usuarioLogueado || rolLimpio !== 'superusuario') {
        alert('⛔ Acceso denegado. Esta sección es exclusiva para el Superusuario.');
        window.location.href = '../auth/login.html';
        return;
    }

    cargarAuditoria();
    configurarFiltros();
});

// ─── Carga de datos con filtros ──────────────────────────────────────────────
async function cargarAuditoria() {
    const busqueda   = document.getElementById('inputBusqueda')?.value.trim() || '';
    const tipo       = document.getElementById('selectTipo')?.value || 'todos';
    const fechaDesde = document.getElementById('fechaDesde')?.value || '';
    const fechaHasta = document.getElementById('fechaHasta')?.value || '';

    // Construir URL con parámetros
    const params = new URLSearchParams();
    if (busqueda)   params.append('busqueda', busqueda);
    if (tipo && tipo !== 'todos') params.append('tipo', tipo);
    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);

    mostrarCargando();

    try {
        const resp = await fetch(`${URL_API}/admin/auditoria?${params.toString()}`);
        const resultado = await resp.json();

        if (resultado.success) {
            renderizarAuditoria(resultado.data);
            actualizarContador(resultado.data.length);
        } else {
            mostrarError('Error al cargar los registros: ' + resultado.message);
        }
    } catch (error) {
        console.error("Error en auditoría:", error);
        mostrarError('No se pudo conectar con el servidor.');
    }
}

// ─── Renderizado de la tabla ─────────────────────────────────────────────────
function renderizarAuditoria(registros) {
    const tabla = document.getElementById('cuerpoAuditoria');
    tabla.innerHTML = '';

    if (registros.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding: 50px; color: #888;">
                    <i class="fas fa-inbox" style="font-size: 2rem; display:block; margin-bottom:10px;"></i>
                    No se encontraron registros con esos filtros.
                </td>
            </tr>
        `;
        return;
    }

    registros.forEach(item => {
        // Si el tipo es 'cita' pero el responsable es 'Sistema', mostrarlo como sistema
        const tipoVisual = (item.tipo === 'cita' && item.responsable === 'Sistema') ? 'sistema' : item.tipo;
        const config  = TIPO_CONFIG[tipoVisual] || TIPO_CONFIG.sistema;
        const fecha   = formatearFecha(item.fecha);

        // Ícono específico por acción (si existe), si no el del tipo
        const iconoFinal = ACCION_ICONO[item.accion] || config.icono;

        const badgeTipo = `
            <span class="badge-tipo" style="background: ${config.color}20; color: ${config.color}; border: 1px solid ${config.color}40;">
                <i class="${iconoFinal}"></i> ${config.label}
            </span>
        `;

        tabla.innerHTML += `
            <tr class="fila-auditoria fila-tipo-${tipoVisual}">
                <td class="celda-fecha">
                    <span class="fecha-dia">${fecha.dia}</span>
                    <span class="fecha-hora">${fecha.hora}</span>
                </td>
                <td class="celda-responsable">
                    <strong style="color: ${item.responsable === 'Sistema' ? '#00cc88' : '#ff6600'};">
                        ${item.responsable || 'Sistema'}
                    </strong>
                </td>
                <td>
                    ${badgeTipo}
                    <div class="accion-texto">${item.accion}</div>
                </td>
                <td class="celda-detalles">${item.detalles || '—'}</td>
                <td class="celda-afectado">
                    ${item.usuario_afectado
                        ? `<span style="color: #ff6600; font-size:0.85rem;">${item.usuario_afectado}</span>`
                        : '<span style="color:#666;">—</span>'
                    }
                </td>
            </tr>
        `;
    });
}

// ─── Configurar botones de filtro ────────────────────────────────────────────
function configurarFiltros() {
    document.getElementById('btnFiltrar')?.addEventListener('click', () => {
        cargarAuditoria();
    });

    document.getElementById('btnLimpiar')?.addEventListener('click', () => {
        document.getElementById('inputBusqueda').value = '';
        document.getElementById('selectTipo').value = 'todos';
        document.getElementById('fechaDesde').value = '';
        document.getElementById('fechaHasta').value = '';
        cargarAuditoria();
    });

    // También filtrar al presionar Enter en el buscador
    document.getElementById('inputBusqueda')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') cargarAuditoria();
    });
}

// ─── Utilidades ──────────────────────────────────────────────────────────────
function formatearFecha(isoString) {
    if (!isoString) return { dia: '—', hora: '—' };
    const fecha = new Date(isoString);
    const dia  = fecha.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    return { dia, hora };
}

function actualizarContador(cantidad) {
    const el = document.getElementById('contadorResultados');
    if (el) {
        el.textContent = `${cantidad} registro${cantidad !== 1 ? 's' : ''} encontrado${cantidad !== 1 ? 's' : ''}`;
    }
}

function mostrarCargando() {
    const tabla = document.getElementById('cuerpoAuditoria');
    tabla.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding: 40px; color: #888;">
                <i class="fas fa-spinner fa-spin"></i> Cargando registros...
            </td>
        </tr>
    `;
    const el = document.getElementById('contadorResultados');
    if (el) el.textContent = 'Cargando...';
}

function mostrarError(mensaje) {
    const tabla = document.getElementById('cuerpoAuditoria');
    tabla.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding: 40px; color: #ff4444;">
                <i class="fas fa-exclamation-triangle"></i> ${mensaje}
            </td>
        </tr>
    `;
    actualizarContador(0);
}
