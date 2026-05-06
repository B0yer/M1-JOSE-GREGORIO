/* js/estado-reparacion.js */

document.addEventListener('DOMContentLoaded', async () => {
    const contenedor = document.getElementById('contenedor-cards');
    
    // 1. Verificar sesión del usuario
    const usuarioGuardado = localStorage.getItem('usuarioLogueado');
    if (!usuarioGuardado) {
        window.location.href = '../auth/login.html';
        return;
    }
    const usuario = JSON.parse(usuarioGuardado);

    // FUNCIÓN PARA CALCULAR EL TIEMPO RELATIVO
    function calcularTiempoRelativo(timestamp) {
        if (!timestamp) return "Sin actualizaciones recientes";
        const ahora = new Date();
        const pasado = new Date(timestamp);
        const diferenciaSegundos = Math.floor((ahora - pasado) / 1000);

        if (diferenciaSegundos < 60) return "Actualizado hace un momento";
        const minutos = Math.floor(diferenciaSegundos / 60);
        if (minutos < 60) return `Actualizado hace ${minutos} min`;
        const horas = Math.floor(minutos / 60);
        if (horas < 24) return `Actualizado hace ${horas} horas`;
        return `Actualizado el ${pasado.toLocaleDateString()}`;
    }

    async function cargarReparaciones() {
        try {
            const respuesta = await fetch(`/api/mis-citas?cedula=${usuario.cedula}`);
            const resultado = await respuesta.json();

            if (resultado.success) {
                // --- 🛠️ CORRECCIÓN DE FILTRADO ---
                // Solo mostramos las citas que están estrictamente en estado 'Aceptada'
                // Esto garantiza que al pasar a 'Finalizada' en el panel admin, desaparezca de aquí.
                const enTaller = resultado.data.filter(cita => cita.estado === 'Aceptada');

                if (enTaller.length === 0) {
                    contenedor.innerHTML = `<div class="cargando"><p>No tienes vehículos en reparación activa.</p></div>`;
                    return;
                }

                contenedor.innerHTML = ''; 

                enTaller.forEach(rep => {
                    const card = document.createElement('div');
                    card.className = 'card-reparacion';
                    const placa = rep.placa;

                    // --- LÓGICA DE BARRA DE PROGRESO ---
                    let porcentajeAuto = parseInt(rep.progreso) || 0;
                    if (porcentajeAuto < 5) porcentajeAuto = 5; 
                    if (porcentajeAuto > 100) porcentajeAuto = 100;

                    // --- LÓGICA DE HISTORIAL ACUMULATIVO (desde la base de datos) ---
                    // El campo detalle_reparacion almacena los pasos separados por '||PASO||'
                    const detalleDB = rep.detalle_reparacion || "Vehículo en revisión.";
                    const historialLocal = detalleDB.split('||PASO||').map(p => p.trim()).filter(p => p.length > 0);
                    const ultimaVez = rep.fecha_actualizacion || null;

                    // --- LÓGICA DE FECHA DE ENTREGA ---
                    let entregaHTML = '';
                    if (rep.fecha_entrega) {
                        const fechaFormateada = new Date(rep.fecha_entrega).toLocaleDateString();
                        entregaHTML = `<span class="entrega-tag">Entrega: ${fechaFormateada}</span>`;
                    } else {
                        entregaHTML = `<span class="entrega-tag pendiente">Entrega: Por definir</span>`;
                    }

                    const historialHTML = historialLocal.map((texto, index) => `
                        <div class="nota-registro">
                            <span class="nota-fecha">PASO #${index + 1}</span>
                            <p class="nota-texto">${texto}</p>
                        </div>
                    `).join('');

                    card.innerHTML = `
                        <div class="card-header">
                            <div class="header-info">
                                <h3>${rep.vehiculos ? rep.vehiculos.marca + ' ' + rep.vehiculos.modelo : "Vehículo"}</h3>
                                <div class="placa-tag">PLACA: ${placa}</div>
                            </div>
                            ${entregaHTML}
                        </div>
                        
                        <div class="progreso-info">
                            <span class="estado-texto">${rep.estado_reparacion || 'En taller'}</span>
                            <span class="porcentaje-texto">${porcentajeAuto}%</span>
                        </div>

                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${porcentajeAuto}%"></div>
                        </div>

                        <div class="detalles-box">
                            <span>Bitácora de Seguimiento:</span>
                            <div class="historial-container">
                                ${historialHTML}
                            </div>
                        </div>
                        
                        <span class="fecha-actualizacion">
                            ${calcularTiempoRelativo(ultimaVez)}
                        </span>
                    `;
                    contenedor.appendChild(card);
                });
            }
        } catch (error) {
            console.error("Error cargando reparaciones:", error);
            contenedor.innerHTML = `<p style="color: red; text-align: center;">Error de conexión con el servidor.</p>`;
        }
    }

    cargarReparaciones();
});