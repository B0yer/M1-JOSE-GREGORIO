/* js/historial.js */

document.addEventListener('DOMContentLoaded', async () => {
    const contenedor = document.getElementById('contenedor-historial');
    const inputBuscar = document.getElementById('input-buscar');
    
    // 1. Verificar sesión del usuario
    const usuarioGuardado = localStorage.getItem('usuarioLogueado');
    if (!usuarioGuardado) {
        window.location.href = '../auth/login.html';
        return;
    }
    const usuario = JSON.parse(usuarioGuardado);

    // Si el admin viene desde el panel de clientes, usa esa cédula
    const cedulaAdmin = sessionStorage.getItem('admin_ver_cedula');
    const esVistaAdmin = cedulaAdmin && (usuario.rol === 'admin' || usuario.rol === 'superadmin');
    const cedulaObjetivo = esVistaAdmin ? cedulaAdmin : usuario.cedula;

    // Banner de admin con botón de regreso
    if (esVistaAdmin) {
        sessionStorage.removeItem('admin_ver_cedula');
        const header = document.querySelector('.seccion-header');
        if (header) {
            const banner = document.createElement('div');
            banner.style.cssText = 'background:#1c1c1c;border:1px solid #ff6600;border-radius:8px;padding:12px 20px;margin-bottom:20px;color:#ccc;font-size:0.9rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;';
            banner.innerHTML =
                '<span>&#128065;&#65039; Viendo historial del cliente: <strong style="color:#ff6600;">' + cedulaObjetivo + '</strong></span>' +
                '<button onclick="window.location.href=\'../admin/usuarios.html\';" style="background:none;border:1px solid #ff6600;color:#ff6600;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:0.8rem;font-weight:bold;">&#8592; Volver al Panel de Clientes</button>';
            header.insertBefore(banner, header.firstChild);
        }
    }

    let serviciosOriginales = [];

    // Función para descargar constancia desde la BD
    window.descargarConstancia = async function(citaId, placa, cedula) {
        const cedulaBuscar = cedula || cedulaObjetivo;
        try {
            // Buscar en notificaciones del cliente la que tenga PDF para esta placa
            const respNotif = await fetch('/api/notificaciones?tipo=cliente&cedula=' + cedulaBuscar);
            const jsonNotif = await respNotif.json();

            if (jsonNotif.success && jsonNotif.data) {
                // Preferir la notificación que mencione la placa específica y tenga PDF
                const notifConPDF = jsonNotif.data.find(function(n) {
                    if (!n.pdf_base64) return false;
                    const msg = (n.mensaje || '').toLowerCase();
                    return msg.includes(placa.toLowerCase());
                }) || jsonNotif.data.find(function(n) {
                    // Fallback: cualquier notificación con PDF de entrega
                    if (!n.pdf_base64) return false;
                    const msg = (n.mensaje || '').toLowerCase();
                    return msg.includes('entregado') || msg.includes('constancia');
                });

                if (notifConPDF && notifConPDF.pdf_base64) {
                    const link = document.createElement('a');
                    link.href = 'data:application/pdf;base64,' + notifConPDF.pdf_base64;
                    link.download = 'Constancia_Entrega_' + placa + '_' + new Date().toISOString().split('T')[0] + '.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    return;
                }
            }
        } catch(e) {
            console.warn('Error buscando constancia:', e);
        }

        alert('No se encontró la constancia PDF. Contacte al taller para que la genere.');
    };

    // Mostrar notificaciones de entrega desde la BD
    async function mostrarNotificacionesEntrega() {
        try {
            const respNotif = await fetch('/api/notificaciones?tipo=cliente&cedula=' + cedulaObjetivo);
            const jsonNotif = await respNotif.json();
            if (!jsonNotif.success) return;

            const sinLeer = (jsonNotif.data || []).filter(function(n) {
                return !n.leido && (
                    n.mensaje.toLowerCase().includes('entregado') ||
                    n.mensaje.toLowerCase().includes('constancia')
                );
            });

            if (sinLeer.length > 0) {
                const banner = document.createElement('div');
                banner.style.cssText = 'background:#1a2e1a;border:1px solid #00ff88;border-radius:8px;padding:14px 20px;margin-bottom:20px;color:#ccc;font-size:0.9rem;';
                banner.innerHTML = sinLeer.map(function(n) {
                    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
                        '<span style="color:#00ff88;font-size:1.2rem;">🚗</span>' +
                        '<span>' + n.mensaje + '</span>' +
                        '</div>';
                }).join('');
                const header = document.querySelector('.seccion-header');
                if (header) header.insertAdjacentElement('afterend', banner);
            }
        } catch(e) {
            // Fallback al localStorage para compatibilidad
            const notifs = JSON.parse(localStorage.getItem('notif_' + cedulaObjetivo) || '[]');
            const sinLeer = notifs.filter(function(n) { return !n.leida && n.tipo === 'entrega'; });
            if (sinLeer.length > 0) {
                const banner = document.createElement('div');
                banner.style.cssText = 'background:#1a2e1a;border:1px solid #00ff88;border-radius:8px;padding:14px 20px;margin-bottom:20px;color:#ccc;font-size:0.9rem;';
                banner.innerHTML = sinLeer.map(function(n) {
                    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
                        '<span style="color:#00ff88;font-size:1.2rem;">🚗</span>' +
                        '<span>' + n.mensaje + '</span>' +
                        '</div>';
                }).join('');
                const header = document.querySelector('.seccion-header');
                if (header) header.insertAdjacentElement('afterend', banner);
                notifs.forEach(function(n) { n.leida = true; });
                localStorage.setItem('notif_' + cedulaObjetivo, JSON.stringify(notifs));
            }
        }
    }
    mostrarNotificacionesEntrega();

    window.toggleBitacora = function(id) {
        const el = document.getElementById(id);
        if (!el) return;
        const isVisible = el.style.display === 'block';
        el.style.display = isVisible ? 'none' : 'block';
        const btn = document.querySelector('button[onclick="toggleBitacora(\'' + id + '\')"]');
        if (btn) btn.textContent = isVisible ? 'Ver Bitácora' : 'Cerrar Bitácora';
    };

    function renderizarServicios(lista) {
        if (lista.length === 0) {
            contenedor.innerHTML = '<div class="cargando"><p>No se encontraron servicios finalizados.</p></div>';
            return;
        }
        contenedor.innerHTML = '';
        lista.forEach(function(rep) {
            const card = document.createElement('div');
            card.className = 'card-reparacion';
            const placa = rep.placa;
            const servicioNombre = rep.servicios ? rep.servicios.servicio : 'Servicio General';
            const vehiculoInfo = rep.vehiculos ? rep.vehiculos.marca + ' ' + rep.vehiculos.modelo : 'Vehículo';
            const fechaRaw = rep.fecha_entrega || rep.fecha;
            const fechaFormateada = new Date(fechaRaw).toLocaleDateString();
            // Parsear detalle_reparacion separado por ||PASO||
            const detalleRaw = rep.detalle_reparacion || 'Servicio finalizado exitosamente.';
            const pasos = detalleRaw.split('||PASO||').map(function(p) { return p.trim(); }).filter(function(p) { return p.length > 0; });
            const historialHTML = pasos.map(function(texto, index) {
                return '<div class="nota-registro"><span class="nota-fecha">PASO #' + (index + 1) + '</span><p class="nota-texto">' + texto + '</p></div>';
            }).join('');
        const esEntregado = rep.estado === 'Entregado' || rep.estado_reparacion === 'Entregado';
        card.innerHTML =
                '<div class="card-header">' +
                    '<div class="header-info">' +
                        '<h3>' + servicioNombre + '</h3>' +
                        '<div class="placa-tag">' + vehiculoInfo + ' | PLACA: ' + placa + '</div>' +
                    '</div>' +
                    '<span class="entrega-tag">Finalizado: ' + fechaFormateada + '</span>' +
                '</div>' +
                '<div class="progreso-info" style="margin-top:15px;display:flex;align-items:center;flex-wrap:wrap;gap:10px;">' +
                    '<span style="color:#00ff88;font-weight:bold;">&#10003; COMPLETADO</span>' +
                    '<button class="btn-detalle" onclick="toggleBitacora(\'bitacora-' + rep.id + '\')">Ver Bitácora</button>' +
                    (esEntregado && rep.id ? '<button class="btn-constancia" onclick="descargarConstancia(' + rep.id + ', \'' + placa + '\', \'' + rep.cedula + '\')">&#11015; Constancia PDF</button>' : '') +
                '</div>' +
                '<div id="bitacora-' + rep.id + '" style="display:none;margin-top:20px;">' +
                    '<div style="background:#111;padding:15px;border-radius:8px;">' +
                        '<span style="color:#ff6600;font-weight:bold;display:block;margin-bottom:10px;">Registro Histórico:</span>' +
                        '<div class="historial-container">' + historialHTML + '</div>' +
                    '</div>' +
                '</div>';
            contenedor.appendChild(card);
        });
    }

    async function cargarHistorial() {
        try {
            const respuesta = await fetch('/api/mis-citas?cedula=' + cedulaObjetivo);
            const resultado = await respuesta.json();
            if (resultado.success) {
                serviciosOriginales = resultado.data.filter(function(cita) {
                    return cita.estado_reparacion === 'Finalizado' ||
                           cita.estado_reparacion === 'Entregado' ||
                           cita.estado === 'Finalizada' ||
                           cita.estado === 'Entregado';
                }).sort(function(a, b) {
                    const fechaA = new Date(a.fecha_entrega || a.fecha || 0);
                    const fechaB = new Date(b.fecha_entrega || b.fecha || 0);
                    return fechaB - fechaA; // más reciente primero
                });
                renderizarServicios(serviciosOriginales);
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
            contenedor.innerHTML = '<p style="color:red;text-align:center;">Error de conexión al historial.</p>';
        }
    }

    inputBuscar.addEventListener('input', function(e) {
        const termino = e.target.value.toLowerCase();
        const filtrados = serviciosOriginales.filter(function(item) {
            const servicio = (item.servicios && item.servicios.servicio) ? item.servicios.servicio.toLowerCase() : '';
            const placa = item.placa.toLowerCase();
            const marcaModelo = item.vehiculos ? (item.vehiculos.marca + ' ' + item.vehiculos.modelo).toLowerCase() : '';
            return servicio.includes(termino) || placa.includes(termino) || marcaModelo.includes(termino);
        });
        renderizarServicios(filtrados);
    });

    cargarHistorial();
});
