// js/recuperar-clave.js

const URL_API = "[https://m1-jose-gregorio-c2pe.vercel.app/api](https://m1-jose-gregorio-c2pe.vercel.app/api)";

// Estado compartido entre pasos
let cedulaActual    = '';
let preguntaCorrecta = '';  // 'pregunta1' o 'pregunta2'

// ─────────────────────────────────────────
// Utilidades de UI
// ─────────────────────────────────────────
function mostrarError(id, texto) {
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

function irAPaso(numeroPaso) {
    document.querySelectorAll('.paso').forEach(p => p.classList.remove('activo'));
    document.getElementById('paso' + numeroPaso).classList.add('activo');

    for (let i = 1; i <= 3; i++) {
        const punto = document.getElementById('punto' + i);
        punto.classList.remove('activo', 'completado');
        if (i < numeroPaso)  punto.classList.add('completado');
        if (i === numeroPaso) punto.classList.add('activo');
    }
}

// ─────────────────────────────────────────
// Ojitos (mostrar / ocultar contraseña)
// ─────────────────────────────────────────
function configurarOjo(btnId, inputId) {
    const btn   = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener('click', () => {
        const mostrar = input.type === 'password';
        input.type  = mostrar ? 'text' : 'password';
        btn.textContent = mostrar ? '🙈' : '👁';
    });
}

configurarOjo('ojoClave',     'nuevaClave');
configurarOjo('ojoConfirmar', 'confirmarClave');

// ─────────────────────────────────────────
// PASO 1 — Verificar cédula
// ─────────────────────────────────────────
document.getElementById('cedulaRecuperar').addEventListener('keypress', (e) => {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
});

// También permitir enviar con Enter
document.getElementById('cedulaRecuperar').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btnVerificarCedula').click();
});

document.getElementById('btnVerificarCedula').addEventListener('click', async () => {
    const cedula = document.getElementById('cedulaRecuperar').value.trim();
    mostrarError('errorCedula', '');

    if (cedula.length < 6 || isNaN(cedula)) {
        mostrarError('errorCedula', 'Ingresa una cédula válida (6 a 9 dígitos).');
        return;
    }

    try {
        const res  = await fetch(`${BASE_URL}/api/recuperar/verificar-cedula`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ cedula })
        });

        const data = await res.json();

        if (!data.success) {
            mostrarError('errorCedula', 'Cédula no encontrada en el sistema.');
            return;
        }

        // Guardamos estado y pasamos al paso 2
        cedulaActual     = cedula;
        preguntaCorrecta = data.campoPregunta;

        // Mostrar la pregunta tal como viene del servidor (texto completo)
        document.getElementById('textoPregunta').textContent = data.textoPregunta;
        irAPaso(2);

    } catch (err) {
        mostrarError('errorCedula', 'Error de conexión con el servidor.');
    }
});

// ─────────────────────────────────────────
// PASO 2 — Verificar respuesta de seguridad
// ─────────────────────────────────────────
document.getElementById('respuestaSeguridad').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btnVerificarRespuesta').click();
});

document.getElementById('btnVerificarRespuesta').addEventListener('click', async () => {
    const respuesta = document.getElementById('respuestaSeguridad').value.trim();
    mostrarError('errorRespuesta', '');

    if (!respuesta) {
        mostrarError('errorRespuesta', 'Debes ingresar una respuesta.');
        return;
    }

    try {
        const res  = await fetch(`${BASE_URL}/api/recuperar/verificar-respuesta`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ cedula: cedulaActual, campoPregunta: preguntaCorrecta, respuesta })
        });

        const data = await res.json();

        if (!data.success) {
            mostrarError('errorRespuesta', 'Respuesta incorrecta. Inténtalo de nuevo.');
            document.getElementById('respuestaSeguridad').value = '';
            document.getElementById('respuestaSeguridad').focus();
            return;
        }

        irAPaso(3);
        document.getElementById('nuevaClave').focus();

    } catch (err) {
        mostrarError('errorRespuesta', 'Error de conexión con el servidor.');
    }
});

// ─────────────────────────────────────────
// PASO 3 — Validación en tiempo real
// ─────────────────────────────────────────
const textos = {
    'req-longitud':  ' Mínimo 8 caracteres',
    'req-mayuscula': ' Al menos 1 letra mayúscula',
    'req-numero':    ' Al menos 1 número',
    'req-especial':  ' Al menos 1 carácter especial (@, #, !, etc.)'
};

document.getElementById('nuevaClave').addEventListener('input', () => {
    const val = document.getElementById('nuevaClave').value;
    actualizarRequisito('req-longitud',  val.length >= 8);
    actualizarRequisito('req-mayuscula', /[A-Z]/.test(val));
    actualizarRequisito('req-numero',    /\d/.test(val));
    actualizarRequisito('req-especial',  /[\W_]/.test(val));
});

function actualizarRequisito(id, cumple) {
    const el = document.getElementById(id);
    el.classList.remove('ok', 'fail');
    el.classList.add(cumple ? 'ok' : 'fail');
    el.textContent = (cumple ? '✔' : '✗') + textos[id];
}

// ─────────────────────────────────────────
// PASO 3 — Guardar nueva contraseña
// ─────────────────────────────────────────
document.getElementById('btnGuardarClave').addEventListener('click', async () => {
    const nuevaClave    = document.getElementById('nuevaClave').value;
    const confirmarClave = document.getElementById('confirmarClave').value;

    mostrarError('errorClaveConfirm', '');

    const fuerte = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!fuerte.test(nuevaClave)) {
        alert('La contraseña no cumple los requisitos de seguridad. Revisa las indicaciones.');
        return;
    }

    if (nuevaClave !== confirmarClave) {
        mostrarError('errorClaveConfirm', 'Las contraseñas no coinciden.');
        return;
    }

    try {
        const res  = await fetch(`${BASE_URL}/api/recuperar/nueva-clave`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ cedula: cedulaActual, nuevaClave })
        });

        const data = await res.json();

        if (data.success) {
            alert('✅ Contraseña actualizada exitosamente. Ahora puedes iniciar sesión.');
            window.location.href = 'login.html';
        } else {
            alert('❌ Error al actualizar: ' + data.message);
        }

    } catch (err) {
        alert('Error de conexión con el servidor.');
    }
});
