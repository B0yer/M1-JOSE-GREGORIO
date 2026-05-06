// js/registro-validador.js

// ─────────────────────────────────────────
// Ojitos — mostrar / ocultar contraseña
// ─────────────────────────────────────────
document.querySelectorAll('.btn-ojo').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        const mostrar   = input.type === 'password';
        input.type      = mostrar ? 'text' : 'password';
        btn.textContent = mostrar ? '🙈' : '👁';
    });
});

// ─────────────────────────────────────────
// Bloqueo de letras en campos numéricos
// ─────────────────────────────────────────
['cedula', 'telefono'].forEach(id => {
    document.getElementById(id).addEventListener('keypress', e => {
        if (!/[0-9]/.test(e.key)) e.preventDefault();
    });
});

// ─────────────────────────────────────────
// Utilidad: mostrar / ocultar error inline
// ─────────────────────────────────────────
function setError(id, texto) {
    const el = document.getElementById(id);
    if (!el) return;
    if (texto) {
        el.textContent = texto;
        el.classList.add('visible');
    } else {
        el.textContent = '';
        el.classList.remove('visible');
    }
}

// ─────────────────────────────────────────
// Envío del formulario
// ─────────────────────────────────────────
const formulario = document.getElementById('formRegistro');

formulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Limpiar errores previos
    setError('errorCedula', '');

    // Recolección de datos
    const datos = {
        cedula:        document.getElementById('cedula').value.trim(),
        nombre:        document.getElementById('nombre').value.trim(),
        apellido:      document.getElementById('apellido').value.trim(),
        telefono:      document.getElementById('telefono').value.trim(),
        correo:        document.getElementById('correo').value.trim(),
        correoConfirm: document.getElementById('correoConfirm').value.trim(),
        clave:         document.getElementById('inputClave').value,
        claveConfirm:  document.getElementById('inputClaveConfirm').value,
        pregunta1:     document.getElementById('pregunta1').value,
        respuesta1:    document.getElementById('respuesta1').value.trim(),
        pregunta2:     document.getElementById('pregunta2').value.trim(),
        respuesta2:    document.getElementById('respuesta2').value.trim()
    };

    // ── VALIDACIONES ──

    // 1. Cédula (6-9 dígitos numéricos)
    if (datos.cedula.length < 6 || isNaN(datos.cedula)) {
        setError('errorCedula', 'El número de documento debe tener entre 6 y 9 dígitos.');
        document.getElementById('cedula').focus();
        return;
    }

    // 2. Nombre y Apellido no vacíos (maxlength ya en HTML)
    if (!datos.nombre) {
        return alert("El campo Nombre no puede estar vacío.");
    }
    if (!datos.apellido) {
        return alert("El campo Apellido no puede estar vacío.");
    }

    // 3. Teléfono (exactamente 11 dígitos)
    if (datos.telefono.length !== 11 || isNaN(datos.telefono)) {
        return alert("El teléfono debe tener exactamente 11 dígitos numéricos.");
    }

    // 4. Coincidencia de Correo
    if (datos.correo !== datos.correoConfirm) {
        return alert("Los correos no coinciden.");
    }

    // 5. Coincidencia de Clave
    if (datos.clave !== datos.claveConfirm) {
        return alert("Las contraseñas no coinciden.");
    }

    // 6. Complejidad de Clave (mín. 8 chars, 1 mayúscula, 1 número, 1 especial)
    const fuerte = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!fuerte.test(datos.clave)) {
        return alert("La clave debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial (Ej: @, #, !).");
    }

    // 7. Pregunta 1 seleccionada
    if (!datos.pregunta1) {
        return alert("Por favor seleccione la pregunta de seguridad 1.");
    }
    if (!datos.respuesta1) {
        return alert("Debe ingresar la respuesta a la pregunta 1.");
    }

    // 8. Pregunta 2 personalizada (mín. 5 chars)
    if (datos.pregunta2.length < 5) {
        return alert("La pregunta 2 debe tener al menos 5 caracteres.");
    }
    if (!datos.respuesta2) {
        return alert("Debe ingresar la respuesta a la pregunta 2.");
    }

    // ── ENVÍO AL SERVIDOR ──
    try {
        const respuesta = await fetch('http://127.0.0.1:3000/api/registro', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(datos)
        });

        const r = await respuesta.json();

        if (r.success) {
            alert("✅ Registro guardado exitosamente.");
            window.location.href = "../index.html";
        } else {
            // Detectar cédula duplicada (error de clave única de Supabase/Postgres)
            if (r.message && (
                r.message.includes('duplicate') ||
                r.message.includes('unique')    ||
                r.message.includes('cedula')
            )) {
                setError('errorCedula', '⚠️ Ya existe un usuario registrado con este número de documento.');
                document.getElementById('cedula').focus();
            } else {
                alert("❌ Error: " + r.message);
            }
        }
    } catch (err) {
        alert("Error: El servidor no responde. Verifique su conexión.");
    }
});
