/* js/registrar-vehiculo.js */

document.addEventListener('DOMContentLoaded', () => {
    const formVehiculo = document.getElementById('formVehiculo');

    // Verificamos si el usuario de verdad inició sesión
    const usuarioGuardado = localStorage.getItem('usuarioLogueado');
    
    if (!usuarioGuardado) {
        alert("Debes iniciar sesión para registrar un vehículo.");
        window.location.href = '../auth/login.html';
        return;
    }

    const usuario = JSON.parse(usuarioGuardado);

    if (formVehiculo) {
        formVehiculo.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Capturamos los datos del formulario
            const placa = document.getElementById('placa').value.trim().toUpperCase();
            const marca = document.getElementById('marca').value.trim();
            const modelo = document.getElementById('modelo').value.trim();
            const anno = document.getElementById('anno').value;

            // Construimos el objeto con los nombres exactos de tu tabla en Supabase
            const datosVehiculo = {
                placa,
                marca,
                modelo,
                año: parseInt(anno), // Tu columna en Supabase se llama 'año'
                cedula: usuario.cedula // Tu columna en Supabase se llama 'cedula'
            };

            try {
                // Hacemos la petición a la API
                const respuesta = await fetch('/api/registrar-vehiculo', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(datosVehiculo)
                });

                const resultado = await respuesta.json();

                if (resultado.success) {
                    alert("¡Éxito! Vehículo registrado correctamente.");
                    window.location.href = '../index.html';
                } else {
                    alert(`❌ Error: ${resultado.message}`);
                }

            } catch (error) {
                console.error("Error en la conexión:", error);
                alert("💥 No se pudo conectar con el servidor.");
            }
        });
    }
});