// admin-js/gestionar-citas.js
const URL_API = "/api";
let citasLocales = []; 
let datosTemporalesEdicion = null;

document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));
    if (!usuarioLogueado || (usuarioLogueado.rol !== 'admin' && usuarioLogueado.rol !== 'superusuario')) {
        window.location.href = '../auth/login.html';
        return;
    }
    cargarCitas('Pendiente');
    configurarFiltros();

    // ── Buscador: debe estar dentro de DOMContentLoaded para que el elemento exista ──
    const inputBusqueda = document.getElementById('inputBusqueda');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', (e) => {
            const busqueda = e.target.value.toLowerCase();
            const filtrados = citasLocales.filter(c =>
                c.cedula.toLowerCase().includes(busqueda) ||
                c.placa.toLowerCase().includes(busqueda) ||
                (c.cliente && (
                    (c.cliente.nombre && c.cliente.nombre.toLowerCase().includes(busqueda)) ||
                    (c.cliente.apellido && c.cliente.apellido.toLowerCase().includes(busqueda))
                )) ||
                (c.encargado && (
                    (c.encargado.nombre && c.encargado.nombre.toLowerCase().includes(busqueda)) ||
                    (c.encargado.apellido && c.encargado.apellido.toLowerCase().includes(busqueda))
                ))
            );
            const btnActivo = document.querySelector('.btn-filtro.activo');
            const estadoActual = btnActivo ? btnActivo.dataset.estado : 'Pendiente';
            renderizarCitas(filtrados, estadoActual);
        });
    }
});

function formatearFechaHora(fechaISO, horaISO) {
    const fechaLimpia = fechaISO ? fechaISO.split('T')[0] : 'Sin fecha';
    if (!horaISO) return `${fechaLimpia} | --:--`;
    let horaLimpia = horaISO.split('+')[0]; 
    let [horas, minutos] = horaLimpia.split(':');
    horas = parseInt(horas);
    const ampm = horas >= 12 ? 'PM' : 'AM';
    horas = horas % 12;
    horas = horas ? horas : 12;
    return `${fechaLimpia} | ${horas}:${minutos} ${ampm}`;
}

async function cargarCitas(estado) {
    try {
        const resp = await fetch(`${URL_API}/admin/citas?estado=${estado}`);
        const resultado = await resp.json();
        if (resultado.success) {
            citasLocales = resultado.data;
            renderizarCitas(citasLocales, estado);
        }
    } catch (error) {
        console.error("Error cargando citas:", error);
    }
}

function renderizarCitas(lista, estado) {
    const contenedor = document.getElementById('contenedor-citas');
    contenedor.innerHTML = '';

    if (lista.length === 0) {
        contenedor.innerHTML = `<p style="color:#888; grid-column: 1/-1; margin-top: 50px; text-align:center;">No hay citas en la sección: ${estado}</p>`;
        return;
    }

    lista.forEach(cita => {
        let nombreCliente = "Cliente Desconocido";
        if (cita.cliente) {
            const nombre = cita.cliente.nombre || '';
            const apellido = cita.cliente.apellido || '';
            nombreCliente = `${nombre} ${apellido}`.trim() || cita.cedula;
        } else {
            nombreCliente = `Cédula: ${cita.cedula}`;
        }

        let nombreEncargado = "No asignado";
        if (cita.encargado) {
            const nombreE = cita.encargado.nombre || '';
            const apellidoE = cita.encargado.apellido || '';
            nombreEncargado = `${nombreE} ${apellidoE}`.trim();
        }

        const fechaHoraAMPM = formatearFechaHora(cita.fecha, cita.hora);

        const yaEntregado = cita.entregado === true || cita.entregado === 1;

        contenedor.innerHTML += `
            <div class="card-cita-admin">
                <div class="card-header">
                    <strong>ID #${cita.id}</strong>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span class="status-badge badge-${estado.toLowerCase()}">${estado}</span>
                        ${estado === 'Finalizada' && yaEntregado ? `<span class="status-badge badge-entregado">Entregado</span>` : ''}
                    </div>
                </div>
                <p><strong>Cliente:</strong> ${nombreCliente}</p>
                <p><strong>Cédula:</strong> ${cita.cedula}</p>
                <p><strong>Vehículo:</strong> ${cita.placa} ${cita.vehiculos ? `(${cita.vehiculos.marca} ${cita.vehiculos.modelo})` : ''}</p>
                <p><strong>Encargado:</strong> <span style="color: #ffa500; font-weight: bold;">${nombreEncargado}</span></p>
                <p><strong>Motivo:</strong> ${cita.motivo}</p>
                <p><strong>Fecha/Hora:</strong> ${fechaHoraAMPM}</p>
                
                <div class="acciones-card" style="margin-top:15px; display:flex; gap:10px;">
                    ${estado === 'Pendiente' ? `
                        <button class="btn-aceptar" onclick="cambiarEstado(${cita.id}, 'Aceptada')">ACEPTAR CITA</button>
                        <button class="btn-rechazar" onclick="cambiarEstado(${cita.id}, 'Rechazada')">RECHAZAR</button>
                    ` : ''}
                    
                    ${estado === 'Aceptada' ? `
                        <button class="btn-gestionar" onclick='prepararModal(${JSON.stringify(cita)})'>GESTIONAR AVANCE</button>
                        <button class="btn-finalizar" onclick="cambiarEstado(${cita.id}, 'Finalizada')">FINALIZAR SERVICIO</button>
                    ` : ''}

                    ${estado === 'Finalizada' ? `
                        <div style="width:100%; display:flex; flex-direction:column; gap:8px; align-items:center;">
                            <p style="color: #25d366; font-weight: bold; width: 100%; text-align: center; margin:0;">✓ SERVICIO COMPLETADO</p>
                            ${!yaEntregado ? `
                                <button class="btn-entregar" onclick='marcarEntregado(${JSON.stringify(cita)})'>
                                    <i class="fas fa-car"></i> ENTREGAR VEHÍCULO
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
}

function prepararModal(cita) {
    abrirModal(cita);
}

async function cambiarEstado(id, nuevoEstado) {
    if (!confirm(`¿Estás seguro de marcar esta cita como ${nuevoEstado}?`)) return;

    const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));
    const idAdminActual = usuarioLogueado ? usuarioLogueado.cedula : null;
    const ahora = new Date().toISOString();

    let bodyData;
    let endpoint;

    if (nuevoEstado === 'Aceptada') {
        endpoint = `${URL_API}/admin/actualizar-reparacion`;
        bodyData = {
            id: id,
            nuevoEstado: 'Aceptada', 
            detalle_reparacion: "Cita aceptada. El vehículo ingresará a revisión.",
            estado_reparacion: "Confirmada", 
            progreso: 0,
            fecha_entrega: null,
            fecha_actualizacion: ahora,
            id_admin: idAdminActual 
        };
    } else {
        endpoint = `${URL_API}/admin/actualizar-cita`;
        bodyData = { 
            id, 
            nuevoEstado,
            fecha_actualizacion: ahora,
            id_admin: idAdminActual 
        };
    }

    try {
        const resp = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        const resultado = await resp.json();
        if (resultado.success) {
            alert(`Cita actualizada a: ${nuevoEstado}`);
            const btnActivo = document.querySelector('.btn-filtro.activo');
            const estadoCargar = btnActivo ? btnActivo.dataset.estado : 'Pendiente';
            cargarCitas(estadoCargar);
        } else {
            alert("Error: " + resultado.message);
        }
    } catch (error) {
        console.error("Error al actualizar:", error);
        alert("Error de conexión.");
    }
}

function configurarFiltros() {
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('activo'));
            e.target.classList.add('activo');
            cargarCitas(e.target.dataset.estado);
        });
    });
}



function abrirModal(cita) {
    document.getElementById('edit-id').value = cita.id;

    // Guardamos el historial completo en un campo oculto para acumularlo después
    document.getElementById('edit-historial-completo').value = cita.detalle_reparacion || '';

    // El campo de texto nuevo va vacío: el admin escribe solo el nuevo paso
    document.getElementById('edit-detalle').value = '';
    document.getElementById('edit-detalle').placeholder = 'Escribe la nueva actualización para el cliente...';

    // Mostrar el historial previo como referencia (solo lectura)
    const historialPrevio = cita.detalle_reparacion || '';
    const pasos = historialPrevio ? historialPrevio.split('||PASO||') : [];
    const historialRef = document.getElementById('historial-referencia');
    if (historialRef) {
        if (pasos.length > 0) {
            historialRef.innerHTML = '<strong style="color:#888; font-size:0.75rem;">HISTORIAL PREVIO:</strong>' +
                pasos.map((p, i) => `<p style="margin:4px 0; color:#666; font-size:0.85rem;">Paso #${i+1}: ${p.trim()}</p>`).join('');
        } else {
            historialRef.innerHTML = '<p style="color:#555; font-size:0.85rem;">Sin historial previo.</p>';
        }
    }

    document.getElementById('edit-estado-texto').value = cita.estado_reparacion || '';
    document.getElementById('edit-progreso').value = cita.progreso || 0;
    
    if (cita.fecha_entrega) {
        document.getElementById('edit-fecha-entrega').value = cita.fecha_entrega.split('T')[0];
    } else {
        document.getElementById('edit-fecha-entrega').value = '';
    }
    
    document.getElementById('modalGestion').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modalGestion').style.display = 'none';
}

function solicitarConfirmacion() {
    const id = document.getElementById('edit-id').value;
    const nuevoDetalle = document.getElementById('edit-detalle').value.trim();
    const historialPrevio = document.getElementById('edit-historial-completo').value.trim();
    const estadoT = document.getElementById('edit-estado-texto').value;
    const progreso = document.getElementById('edit-progreso').value;
    const entrega = document.getElementById('edit-fecha-entrega').value;
    const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));

    if(!nuevoDetalle || !estadoT) {
        alert("Por favor completa los campos de detalle y estado.");
        return;
    }

    // Acumular: si hay historial previo, añadir el nuevo paso al final con separador
    const detalleAcumulado = historialPrevio
        ? historialPrevio + '||PASO||' + nuevoDetalle
        : nuevoDetalle;

    datosTemporalesEdicion = {
        id: id,
        detalle_reparacion: detalleAcumulado,
        estado_reparacion: estadoT,
        progreso: parseInt(progreso),
        fecha_entrega: entrega || null,
        fecha_actualizacion: new Date().toISOString(),
        id_admin: usuarioLogueado ? usuarioLogueado.cedula : null 
    };

    document.getElementById('modalConfirmar').style.display = 'flex';
    document.getElementById('passConfirmacion').value = ''; 
    document.getElementById('errorAuth').style.display = 'none';
}

async function confirmarYGuardar() {
    const passIngresada = document.getElementById('passConfirmacion').value;
    const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));

    if (passIngresada === usuarioLogueado.clave) {
        try {
            const resp = await fetch(`${URL_API}/admin/actualizar-reparacion`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosTemporalesEdicion)
            });
            
            const resultado = await resp.json();
            if (resultado.success) {
                alert("✓ Información actualizada con éxito");
                cerrarModalConfirmar();
                cerrarModal();
                cargarCitas('Aceptada');
            } else {
                alert("Error al guardar: " + resultado.message);
            }
        } catch (err) { 
            alert("Error al conectar con el servidor."); 
        }
    } else {
        document.getElementById('errorAuth').style.display = 'block';
    }
}

function cerrarModalConfirmar() {
    document.getElementById('modalConfirmar').style.display = 'none';
}

// =====================================================
// FIRMA DEL TALLER (imagen del sello)
// =====================================================
const FIRMA_TALLER_BASE64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAHEAmkDASIAAhEBAxEB/8QAHgABAAEEAwEBAAAAAAAAAAAAAAgBBgcJAgMEBQr/xABEEAABAwMDAwIEBQMCAgkEAgMBAAIDBAURBgchCBIxE0EJIlFhFDJxgZEVQqEjsRbBFyQzQ1JigtHhGFOSshlyJTTw/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAH/xAAWEQEBAQAAAAAAAAAAAAAAAAAAARH/2gAMAwEAAhEDEQA/ANqaIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAuL3tY0veQABkkrko49ae/zNk9Cw/gy51yuTiyBjffhBIOK5Uc8wiiqGE/QOHK9a126a1HvvoHTmnN4LvXVFVZrm9r6qkflzoWOPB+3HKnpojVNDrDTVDfaGoZKyqhbJlpz5CD7yIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiCmFrz6kHUu83W5pTaivd32u0RiepiBzl2M/wC2FsNWuDbmgfqn4lOqqzvJFqjc1x/8LgA3H+CgnrfdvrDfNDTaHloohQOpfQjjLeG/LgFYd6eDeNuNQVu0t8afSpy6S3yO4Do85wD9vupF+ArJ19pdlRPS6ooGBtfbn94I/wC8HjB/bKC9h91VeW2VrbhQQ1jRj1GgkfQ+4XqQEREBERAREQEREBERAREQFRVVMAoKoiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiIKZyqoiDqqZPSgkkz4af9lrr6Ri259be6l4OC9lQ9naSSQS8+/7LYnVRmSnkYBklhAH7LW10cj+ndZ+6dE4ku/Ey+5z/ANoUGypcZY2TRuikaHNcMEH3CrGS5jXHyQuSD4mnbdU2d1Vb3M/6sJDLA7PGHHJC+2uD3FnzY491zQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQdVTkU8mDz2la1ulusmt/XluZTGI980j84+nqH/AHWyipAfDIBgkNP7cLWdsa/8N8RnXTO4sD/VeGeO7kINmcR+QDB8LsXmpaiOZjXNODjlejygo4dzS0+CMKrRgAZzhVVAMe6CqIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiIODw0NJwOVrJ0rI2zfE3vcXd2Nq45PbzwDhbN5AC05WsXdJjtN/EttFb2hjLhTs8eCezB/wBkGzVgiaG9jPODwF3LppfngikJHLGnA/Rd6AqEgYz7qqoeUFVTJzjHCqiAiIgI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jLqA2N051Abf12hNSZjZOO+nqGjLoZB4cEHm6Ydds3I2P0vqVrwXS0TI385ILRjn7rKQJx4WKOmrZut2G22pdvKi6i4NpJXuilxj5SchZYAJ8Y90AfKcexQtdnjwqB3t9fKo0nPy/wCUAjPgqjMkYajhg9wGf3VCe5uQcEeyCvIOcefbKCR2R8nBXFhaCPP0XIHBGAf3Qc8nuI90cO4ceyoCO45GPuuTWgeMoGMDGThUyA7AIyuWAfPugxkgBBQtPthUd3k/KQuSe+UHH/Ux7ZXFxfwTwfsuzyqFjSckcoOLcn5scqpBJJ/5rkBgYyuJa75sYyfCBxgDGVQNcMk4JPv9lzwcYygGAgpkeRyCqOwR/suXaMYQAAYQUIBVQMDGVVEBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBUwFVEFMBU7B7cLkiDj2BUEYAA+i5og4hoH3Ve3kHPhVRBTCqiICIiCiqiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIg//9k=';

// =====================================================
// VEHÍCULO ENTREGADO - CONSTANCIA PDF (FONDO BLANCO)
// =====================================================

async function marcarEntregado(cita) {
    const confirmar = confirm(`¿Confirmas la entrega del vehículo con placa ${cita.placa} al cliente?`);
    if (!confirmar) return;

    const constanciaData = {
        id: cita.id,
        fecha_entrega: new Date().toISOString(),
        cedula: cita.cedula,
        placa: cita.placa,
        vehiculo: cita.vehiculos ? `${cita.vehiculos.marca} ${cita.vehiculos.modelo}` : cita.placa,
        servicio: cita.motivo || 'Servicio General',
        detalle: cita.detalle_reparacion || 'Servicio completado exitosamente.',
        cliente: cita.cliente ? `${cita.cliente.nombre || ''} ${cita.cliente.apellido || ''}`.trim() : cita.cedula
    };

    // 1. Generar PDF (fondo blanco) y obtener base64
    const pdfBase64 = generarConstanciaPDF(constanciaData);

    // 2. Enviar al servidor: cambia estado + crea notificación con PDF embebido
    try {
        const resp = await fetch(`${URL_API}/admin/entregar-vehiculo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: cita.id,
                cedula_cliente: cita.cedula,
                placa: cita.placa,
                pdf_base64: pdfBase64,
                fecha_actualizacion: new Date().toISOString()
            })
        });
        const resultado = await resp.json();
        if (!resultado.success) {
            console.warn('Error en servidor al entregar:', resultado.message);
        }
    } catch (e) {
        console.warn('No se pudo notificar al servidor:', e);
    }

    // 3. Descargar PDF en el navegador del admin
    const link = document.createElement('a');
    link.href = 'data:application/pdf;base64,' + pdfBase64;
    link.download = `Constancia_Entrega_${cita.placa}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();

    alert(`✅ Constancia generada.\nEl cliente recibirá una notificación para descargarla desde su historial.`);

    setTimeout(() => cargarCitas('Finalizada'), 1500);
}

function generarConstanciaPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const H = 297;

    // ── Fondo BLANCO ──
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');

    // ── Franja superior naranja ──
    doc.setFillColor(255, 102, 0);
    doc.rect(0, 0, W, 10, 'F');

    // ── Franja inferior naranja ──
    doc.setFillColor(255, 102, 0);
    doc.rect(0, H - 10, W, 10, 'F');

    // ── Borde naranja interior ──
    doc.setDrawColor(255, 102, 0);
    doc.setLineWidth(0.8);
    doc.rect(10, 14, W - 20, H - 28, 'S');

    // ── Logo / Firma empresa (imagen del sello) ──
    try {
        doc.addImage('data:image/jpeg;base64,' + FIRMA_TALLER_BASE64, 'JPEG', W/2 - 35, 18, 70, 22);
    } catch(e) {
        doc.setTextColor(255, 102, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('AUTOMOTRIZ JOSE GREGORIO C.A.', W/2, 30, { align: 'center' });
    }

    // ── RIF y datos empresa ──
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('RIF: J-40766703-3  |  Taller Mecánico Automotriz', W/2, 44, { align: 'center' });

    // ── Separador naranja ──
    doc.setDrawColor(255, 102, 0);
    doc.setLineWidth(1.2);
    doc.line(20, 48, W - 20, 48);

    // ── Título constancia ──
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSTANCIA DE ENTREGA DE VEHÍCULO', W/2, 59, { align: 'center' });

    // ── Separador fino ──
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(20, 64, W - 20, 64);

    // ── Número de constancia y fecha ──
    const fechaEntrega = new Date(data.fecha_entrega);
    const fechaStr = fechaEntrega.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });
    const horaStr = fechaEntrega.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

    doc.setFontSize(9);
    doc.setTextColor(255, 102, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`N° CONSTANCIA: #${data.id}-${Date.now().toString().slice(-4)}`, 20, 72);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de emisión: ${fechaStr}  |  Hora: ${horaStr}`, W - 20, 72, { align: 'right' });

    // ── Texto introductorio ──
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Por medio de la presente, el Taller Automotriz José Gregorio C.A. hace constar que se ha', W/2, 82, { align: 'center' });
    doc.text('realizado la entrega formal del vehículo descrito a continuación, habiendo sido atendido', W/2, 88, { align: 'center' });
    doc.text('satisfactoriamente por nuestro equipo técnico especializado.', W/2, 94, { align: 'center' });

    // ── Cuadro datos del cliente (fondo gris muy claro) ──
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(255, 102, 0);
    doc.setLineWidth(0.5);
    doc.roundedRect(18, 100, W - 36, 52, 3, 3, 'FD');

    // Cabecera del cuadro
    doc.setFillColor(255, 102, 0);
    doc.roundedRect(18, 100, W - 36, 10, 3, 3, 'F');
    doc.rect(18, 105, W - 36, 5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE Y VEHÍCULO', W/2, 107, { align: 'center' });

    const col1 = 26;
    const col2 = W/2 + 5;
    const rowH = 9;
    let rowY = 118;

    const campos = [
        ['Cliente:', data.cliente, 'Cédula:', data.cedula],
        ['Vehículo:', data.vehiculo, 'Placa:', data.placa],
        ['Servicio realizado:', data.servicio, 'ID Orden:', `#${data.id}`],
    ];

    campos.forEach(([l1, v1, l2, v2]) => {
        doc.setTextColor(255, 102, 0);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(l1, col1, rowY);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'normal');
        doc.text(String(v1), col1 + 32, rowY);

        doc.setTextColor(255, 102, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(l2, col2, rowY);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'normal');
        doc.text(String(v2), col2 + 28, rowY);

        rowY += rowH;
    });

    // ── Cuadro detalle reparación ──
    doc.setFillColor(253, 253, 253);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.roundedRect(18, 158, W - 36, 50, 3, 3, 'FD');

    doc.setFillColor(240, 240, 240);
    doc.roundedRect(18, 158, W - 36, 9, 3, 3, 'F');
    doc.rect(18, 162, W - 36, 5, 'F');

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPCIÓN DEL SERVICIO REALIZADO', W/2, 165, { align: 'center' });

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const detLines = doc.splitTextToSize(data.detalle || 'Servicio completado exitosamente.', W - 50);
    doc.text(detLines, W/2, 174, { align: 'center' });

    // ── Estado de entrega ──
    doc.setFillColor(0, 160, 80);
    doc.roundedRect(W/2 - 35, 213, 70, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ ENTREGADO', W/2, 221, { align: 'center' });

    // ── Sección firmas ──
    // Firma Responsable (imagen del sello a la izquierda)
    try {
        doc.addImage('data:image/jpeg;base64,' + FIRMA_TALLER_BASE64, 'JPEG', 25, 228, 60, 20);
    } catch(e) {
        // Si falla, solo la línea
    }
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.4);
    doc.line(22, 250, 92, 250);

    // Firma Cliente (espacio en blanco a la derecha)
    doc.line(118, 250, 188, 250);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma del Responsable del Taller', 57, 255, { align: 'center' });
    doc.text('Firma del Cliente / Receptor', 153, 255, { align: 'center' });

    // ── Pie de página ──
    doc.setDrawColor(255, 102, 0);
    doc.setLineWidth(0.5);
    doc.line(20, 261, W - 20, 261);

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7);
    doc.text('Este documento es una constancia oficial emitida por Automotriz José Gregorio C.A. — RIF: J-40766703-3', W/2, 266, { align: 'center' });
    doc.text('Cualquier reclamo debe presentarse dentro de los 30 días siguientes a la fecha de entrega.', W/2, 270, { align: 'center' });

    // Retornar base64 sin encabezado data URI
    return doc.output('datauristring').split(',')[1];
}
