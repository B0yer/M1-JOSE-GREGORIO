/* js/login.js */

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evitamos que la página se recargue

            // 1. Capturamos los datos del formulario
            const correo = document.getElementById('correo').value.trim();
            const clave = document.getElementById('clave').value.trim();

            try {
                // 2. Petición al servidor (Ruta que ya tienes en index.js o server.js)
                const respuesta = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ correo, clave })
                });

                const resultado = await respuesta.json();

                if (resultado.success) {
                    // 3. Guardamos el objeto usuario completo en el navegador
                    // Esto incluye: nombre, cedula, rol, etc.
                    localStorage.setItem('usuarioLogueado', JSON.stringify(resultado.usuario));

                    // 4. LÓGICA DE REDIRECCIÓN POR ROL
                    // Verificamos si el campo 'rol' es administrativo
                    const rol = resultado.usuario.rol;

                    if (rol === 'admin' || rol === 'superadmin') {
                        // Si es trabajador o dueño, va a la carpeta de gestión
                        alert(`¡Bienvenido al Panel de Control, ${resultado.usuario.nombre}!`);
                        window.location.href = '../admin/gestionar-citas.html';
                    } else {
                        // Si es un cliente normal, va al inicio
                        alert(`¡Hola ${resultado.usuario.nombre}! Bienvenido de nuevo.`);
                        window.location.href = '../index.html';
                    }

                } else {
                    // Si las credenciales son incorrectas
                    alert(`❌ Error: ${resultado.message}`);
                }

            } catch (error) {
                console.error("Error en la conexión:", error);
                alert("💥 Hubo un fallo al intentar conectar con el servidor. Verifica que el servidor Express esté corriendo.");
            }
        });
    }
});