/* js/mis-vehiculos.js */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar sesión
    const usuarioGuardado = localStorage.getItem('usuarioLogueado');
    if (!usuarioGuardado) {
        window.location.href = '../auth/login.html';
        return;
    }
    const usuario = JSON.parse(usuarioGuardado);

    const listaBody = document.getElementById('lista-vehiculos-body');
    const modal = document.getElementById('modal-confirmacion');
    const placaABorrarSpan = document.getElementById('placa-a-borrar');
    const btnCancelar = document.getElementById('btn-cancelar-borrado');
    const btnConfirmar = document.getElementById('btn-confirmar-borrado');

    let placaSeleccionada = '';

    // 2. Cargar vehículos desde el servidor
    async function cargarVehiculos() {
        try {
            const respuesta = await fetch(`/api/mis-vehiculos?cedula=${usuario.cedula}`);
            const resultado = await respuesta.json();

            if (resultado.success) {
                const vehiculos = resultado.data;

                if (vehiculos.length === 0) {
                    listaBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">No tienes vehículos registrados.</td></tr>`;
                    return;
                }

                listaBody.innerHTML = ''; // Limpiamos la tabla
                
                vehiculos.forEach(carro => {
                    const fila = document.createElement('tr');
                    
                    // Aquí aplicamos tus 3 recomendaciones de manera visual
                    fila.innerHTML = `
                        <td style="font-weight: bold; color: #ff6600;">${carro.placa}</td>
                        <td>${carro.marca} ${carro.modelo}</td>
                        <td>${carro.año}</td>
                        <td><span class="badge badge-activo">Activo</span></td>
                        <td>
                            <a href="mis-citas.html?placa=${carro.placa}" class="btn-accion btn-cita">Pedir Cita</a>
                            <button class="btn-accion btn-borrar" data-placa="${carro.placa}">Eliminar</button>
                        </td>
                    `;
                    listaBody.appendChild(fila);
                });

                // Asignar eventos a los botones de borrar generados
                document.querySelectorAll('.btn-borrar').forEach(boton => {
                    boton.addEventListener('click', (e) => {
                        placaSeleccionada = e.target.getAttribute('data-placa');
                        placaABorrarSpan.textContent = placaSeleccionada;
                        modal.style.display = 'flex'; // Mostramos el modal
                    });
                });

            } else {
                alert("Error al cargar vehículos.");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }

    // 3. Lógica del Modal (Confirmación de Borrado)
    btnCancelar.addEventListener('click', () => {
        modal.style.display = 'none';
        placaSeleccionada = '';
    });

    btnConfirmar.addEventListener('click', async () => {
        try {
            const respuesta = await fetch(`/api/eliminar-vehiculo?placa=${placaSeleccionada}`, {
                method: 'DELETE'
            });
            const resultado = await respuesta.json();

            if (resultado.success) {
                alert("Vehículo eliminado correctamente.");
                modal.style.display = 'none';
                cargarVehiculos(); // Recargamos la lista
            } else {
                alert("No se pudo eliminar el vehículo.");
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
        }
    });

    // Iniciar la carga al abrir la página
    cargarVehiculos();
});