/* js/mis-citas.js */

document.addEventListener('DOMContentLoaded', () => {
    const usuarioGuardado = localStorage.getItem('usuarioLogueado');
    if (!usuarioGuardado) {
        window.location.href = '../auth/login.html';
        return;
    }
    const usuario = JSON.parse(usuarioGuardado);

    const selectVehiculo = document.getElementById('selectVehiculo');
    const selectServicio = document.getElementById('selectServicio');
    const listaCitasBody = document.getElementById('lista-citas-body');
    const formNuevaCita = document.getElementById('formNuevaCita');
    const inputFecha = document.getElementById('fechaCita');

    // Limitar calendario a fecha actual
    const hoy = new Date().toISOString().split('T')[0];
    inputFecha.min = hoy;

    // --- FUNCIONES DE FORMATEO ---
    
    function formatearFecha(fechaString) {
        if (!fechaString) return "---";
        return fechaString.split('T')[0];
    }

    function formatearHora12h(horaString) {
        if (!horaString) return "---";
        let [horas, minutos] = horaString.split(':');
        horas = parseInt(horas);
        
        const ampm = horas >= 12 ? 'PM' : 'AM';
        horas = horas % 12;
        horas = horas ? horas : 12;
        
        return `${horas}:${minutos} ${ampm}`;
    }

    // --- FUNCIÓN PARA OBTENER CLASE DE COLOR ---
    function obtenerClaseEstado(estado) {
        const est = estado ? estado.trim() : 'Pendiente';
        switch (est) {
            case 'Pendiente': return 'badge-pendiente';
            case 'Aceptada': return 'badge-aceptada';
            case 'Rechazada': return 'badge-rechazada';
            case 'Finalizada': return 'badge-finalizada';
            default: return 'badge-defecto';
        }
    }

    // --- 1. CARGAR VEHÍCULOS DEL USUARIO ---
    async function cargarVehiculos() {
        try {
            const respuesta = await fetch(`/api/mis-vehiculos?cedula=${usuario.cedula}`);
            const resultado = await respuesta.json();

            if (resultado.success) {
                selectVehiculo.innerHTML = '<option value="" disabled selected>Selecciona un vehículo</option>';
                resultado.data.forEach(vehiculo => {
                    const option = document.createElement('option');
                    option.value = vehiculo.placa;
                    option.textContent = `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})`;
                    selectVehiculo.appendChild(option);
                });
            }
        } catch (error) { console.error("Error cargando vehículos:", error); }
    }

    // --- 2. CARGAR SERVICIOS DISPONIBLES ---
    async function cargarServicios() {
        try {
            const respuesta = await fetch('/api/servicios');
            const resultado = await respuesta.json();

            if (resultado.success) {
                selectServicio.innerHTML = '<option value="" disabled selected>Selecciona un servicio</option>';
                resultado.data.forEach(servicio => {
                    const option = document.createElement('option');
                    option.value = servicio.id;
                    option.textContent = `${servicio.servicio} - $${servicio.precio}`;
                    selectServicio.appendChild(option);
                });
            }
        } catch (error) { console.error("Error cargando servicios:", error); }
    }

    // --- 3. CARGAR HISTORIAL DE CITAS (CON FILTRO DE 24H Y ORDEN POR ESTADO) ---
    async function cargarCitas() {
        try {
            const respuesta = await fetch(`/api/mis-citas?cedula=${usuario.cedula}`);
            const resultado = await respuesta.json();

            if (resultado.success) {
                const ahora = new Date();
                const unDiaEnMilisegundos = 24 * 60 * 60 * 1000;

                // 🛠️ FILTRAR: Ocultar Finalizadas/Rechazadas después de 24 horas del CAMBIO de estado
                const citasMostrables = resultado.data.filter(cita => {
                    // Si es Pendiente o Aceptada, se muestra siempre
                    if (cita.estado === 'Pendiente' || cita.estado === 'Aceptada') return true;

                    // Para Finalizada o Rechazada, usamos fecha_actualización si existe
                    if (cita.fecha_actualizacion) {
                        const tiempoTranscurrido = ahora - new Date(cita.fecha_actualizacion);
                        return tiempoTranscurrido < unDiaEnMilisegundos;
                    }

                    // Respaldo por si no tiene fecha_actualizacion (usa la fecha de la cita)
                    const fechaCita = new Date(`${cita.fecha.split('T')[0]}T${cita.hora}`);
                    return (ahora - fechaCita) < unDiaEnMilisegundos;
                });

                // 🛠️ ORDENAR: Jerarquía de atención + Fecha
                const prioridadEstado = {
                    'Aceptada': 1,
                    'Rechazada': 2,
                    'Pendiente': 3,
                    'Finalizada': 4
                };

                const citasOrdenadas = citasMostrables.sort((a, b) => {
                    const pA = prioridadEstado[a.estado] || 5;
                    const pB = prioridadEstado[b.estado] || 5;

                    if (pA !== pB) return pA - pB;

                    const fechaA = new Date(`${a.fecha.split('T')[0]}T${a.hora}`);
                    const fechaB = new Date(`${b.fecha.split('T')[0]}T${b.hora}`);
                    return fechaB - fechaA;
                });

                renderizarTablaCitas(citasOrdenadas);
            }
        } catch (error) { console.error("Error cargando citas:", error); }
    }

    function renderizarTablaCitas(citas) {
        listaCitasBody.innerHTML = '';

        if (citas.length === 0) {
            listaCitasBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: #888;">No hay citas activas o recientes.</td>
                </tr>`;
            return;
        }

        citas.forEach(cita => {
            const tr = document.createElement('tr');
            
            const fechaFormateada = formatearFecha(cita.fecha);
            const horaFormateada = formatearHora12h(cita.hora);
            
            const vehiculoTexto = cita.vehiculos
                ? `<strong>${cita.vehiculos.marca} ${cita.vehiculos.modelo}</strong>`
                : `<strong>${cita.placa}</strong>`;
                
            const servicioTexto = cita.servicios
                ? cita.servicios.servicio
                : "Servicio General";

            const claseBadge = obtenerClaseEstado(cita.estado);

            tr.innerHTML = `
                <td>${fechaFormateada} <br> <span style="color:#aaa; font-size:0.85rem;">${horaFormateada}</span></td>
                <td>
                    ${vehiculoTexto}
                    <div style="color: #888; font-size: 0.85em;">Placa: ${cita.placa}</div>
                </td>
                <td>${servicioTexto}</td>
                <td><span class="status-badge ${claseBadge}">${cita.estado || 'Pendiente'}</span></td>
            `;
            listaCitasBody.appendChild(tr);
        });
    }

    // --- 4. SOLICITAR NUEVA CITA ---
    formNuevaCita.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fechaIngresada = inputFecha.value;
        const horaIngresada = document.getElementById('horaCita').value;

        const dateObj = new Date(`${fechaIngresada}T00:00`);
        const diaSemana = dateObj.getDay();

        if (diaSemana === 0 || diaSemana === 6) {
            alert("❌ El taller no labora los fines de semana (Sábados/Domingos).");
            return;
        }

        const [horas, minutos] = horaIngresada.split(':').map(Number);
        const minutosTotales = (horas * 60) + minutos;
        const esHorarioValido = (minutosTotales >= 480 && minutosTotales <= 720) ||
                                (minutosTotales >= 780 && minutosTotales <= 960);

        if (!esHorarioValido) {
            alert("❌ Horario fuera de atención.\nAtención: 8:00 AM - 12:00 PM y 1:00 PM - 4:00 PM.");
            return;
        }

        const motivoTexto = document.getElementById('motivoCita').value.trim();

        const datosCita = {
            cédula: usuario.cedula,
            placa: selectVehiculo.value,
            id: parseInt(selectServicio.value),
            fecha: fechaIngresada,
            hora: horaIngresada,
            motivo: motivoTexto,
            estado: 'Pendiente',
            fecha_actualizacion: new Date().toISOString() // Marcamos creación
        };

        try {
            const respuesta = await fetch('/api/registrar-cita', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosCita)
            });

            const resultado = await respuesta.json();

            if (resultado.success) {
                alert("¡Éxito! Tu cita ha sido solicitada correctamente.");
                formNuevaCita.reset();
                await cargarCitas();
            } else {
                alert(`❌ Error: ${resultado.message}`);
            }
        } catch (error) { console.error("Error en registro:", error); }
    });

    cargarVehiculos();
    cargarServicios();
    cargarCitas();
});