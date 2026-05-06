document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // 1. VERIFICACIÓN DE SESIÓN
    // =========================================================
    const usuarioRaw = localStorage.getItem('usuarioLogueado');
    if (!usuarioRaw) {
        window.location.href = '../auth/login.html';
        return;
    }

    let user = JSON.parse(usuarioRaw);
    user = normalizarUsuario(user);

    const modal = document.getElementById('modal-seguridad');
    let modoAccion = ""; // "ver" o "guardar"

    // Diccionario para transformar palabras clave en preguntas completas
    const mapaPreguntas = {
        "mascota": "¿Cuál es el nombre de tu mascota?",
        "modelo": "¿Cuál es el modelo de tu primer vehículo?"
    };

    function obtenerPreguntaCompleta(key) {
        const claveLimpia = key ? key.toLowerCase().trim() : "";
        return mapaPreguntas[claveLimpia] || key; 
    }

    // =========================================================
    // 2. NORMALIZAR USUARIO
    // =========================================================
    function normalizarUsuario(obj) {
        const normalizado = {};
        for (const key in obj) {
            const valor = obj[key];
            normalizado[key] = typeof valor === 'string' ? valor.trim() : valor;
        }
        return normalizado;
    }

    // =========================================================
    // 3. CARGAR TODOS LOS DATOS EN EL FORMULARIO
    // =========================================================
    function renderData() {
        setVal('edit-nombre',   user.nombre    || user.Nombre    || "");
        setVal('edit-apellido', user.apellido  || user.Apellido  || "");
        setVal('edit-telefono', user.telefono  || user.Telefono  || "");
        setVal('edit-correo',   user.correo    || user.Correo    || "");
        setVal('edit-cedula',   user.cedula    || user.Cedula    || "");

        document.getElementById('edit-clave').value = "********";
        document.getElementById('edit-clave').type  = "password";

        // Mostrar preguntas completas en lugar de solo el campo
        setVal('show-pregunta1', obtenerPreguntaCompleta(user.pregunta1 || user.Pregunta1 || "(No definida)"));
        setVal('show-pregunta2', obtenerPreguntaCompleta(user.pregunta2 || user.Pregunta2 || "(No definida)"));

        const r1 = document.getElementById('show-respuesta1');
        const r2 = document.getElementById('show-respuesta2');
        r1.value = "********"; r1.type = "password";
        r2.value = "********"; r2.type = "password";
    }

    function setVal(id, valor) {
        const el = document.getElementById(id);
        if (el) el.value = valor;
    }

    // Validación en tiempo real para el teléfono (solo números)
    document.getElementById('edit-telefono').oninput = function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    };

    // =========================================================
    // 4. BOTÓN: VER DATOS SENSIBLES
    // =========================================================
    document.getElementById('btn-ver-seguridad').onclick = () => {
        modoAccion = "ver";
        document.getElementById('modal-titulo').innerText = "Ver Datos Sensibles";
        document.getElementById('modal-desc').innerText   = "Introduce tu contraseña para revelar tu clave y respuestas de seguridad.";
        document.getElementById('campo-respuesta-seguridad').style.display = 'none';
        limpiarModal();
        modal.style.display = 'flex';
    };

    // =========================================================
    // 5. BOTÓN: HABILITAR EDICIÓN
    // =========================================================
    document.getElementById('btn-editar').onclick = function () {
        const camposEditables = ['edit-nombre', 'edit-apellido', 'edit-telefono', 'edit-correo', 'edit-clave'];
        camposEditables.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.disabled = false;
        });
        this.style.display = 'none';
        document.getElementById('btn-cancelar-edicion').style.display = 'flex';
        document.getElementById('btn-guardar-main').style.display = 'flex';
    };

    // BOTÓN: CANCELAR EDICIÓN
    document.getElementById('btn-cancelar-edicion').onclick = function() {
        const camposEditables = ['edit-nombre', 'edit-apellido', 'edit-telefono', 'edit-correo', 'edit-clave'];
        camposEditables.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.disabled = true;
        });
        this.style.display = 'none';
        document.getElementById('btn-guardar-main').style.display = 'none';
        document.getElementById('btn-editar').style.display = 'flex';
        renderData(); 
    };

    // =========================================================
    // 6. SUBMIT: GUARDAR CAMBIOS
    // =========================================================
    document.getElementById('form-perfil').onsubmit = (e) => {
        e.preventDefault();

        // Validar longitud de teléfono
        const telVal = document.getElementById('edit-telefono').value.trim();
        if (telVal.length !== 11) {
            mostrarToast("El teléfono debe tener exactamente 11 dígitos.", "error");
            return;
        }

        modoAccion = "guardar";
        const preguntaUsuario = user.pregunta1 || user.Pregunta1 || "No definida";

        document.getElementById('modal-titulo').innerText = "Confirmar Cambios";
        document.getElementById('modal-desc').innerText   = "Verifica tu identidad para actualizar tu perfil.";
        document.getElementById('label-pregunta').innerText = obtenerPreguntaCompleta(preguntaUsuario);
        document.getElementById('campo-respuesta-seguridad').style.display = 'block';
        limpiarModal();
        modal.style.display = 'flex';
    };

    // =========================================================
    // 7. CONFIRMAR EN EL MODAL
    // =========================================================
    document.getElementById('btn-confirmar-final').onclick = async () => {
        const passEscrita  = document.getElementById('confirm-clave').value.trim();
        const respEscrita  = document.getElementById('confirm-respuesta').value.trim().toLowerCase();
        const claveGuardada = (user.clave || user.Clave || "").toString().trim();

        if (passEscrita !== claveGuardada) {
            mostrarToast("La contraseña ingresada no coincide.", "error");
            return;
        }

        if (modoAccion === "ver") {
            const inputClave = document.getElementById('edit-clave');
            inputClave.type  = "text";
            inputClave.value = claveGuardada;

            const r1 = document.getElementById('show-respuesta1');
            const r2 = document.getElementById('show-respuesta2');
            r1.type  = "text";
            r1.value = user.respuesta1 || user.Respuesta1 || "(Sin respuesta)";
            r2.type  = "text";
            r2.value = user.respuesta2 || user.Respuesta2 || "(Sin respuesta)";

            modal.style.display = 'none';
            mostrarToast("Datos revelados.", "success");

        } else if (modoAccion === "guardar") {
            const respGuardada = (user.respuesta1 || user.Respuesta1 || "").trim().toLowerCase();

            if (respEscrita !== respGuardada) {
                mostrarToast("La respuesta de seguridad es incorrecta.", "error");
                return;
            }

            modal.style.display = 'none';
            await enviarActualizacion();
        }
    };

    // =========================================================
    // 8. PETICIÓN PUT AL BACKEND
    // =========================================================
    async function enviarActualizacion() {
        const inputClave = document.getElementById('edit-clave');
        const claveActual = (user.clave || user.Clave || "").toString().trim();

        const nuevaClave = (inputClave.value !== "********" && inputClave.value.trim() !== "") 
                           ? inputClave.value.trim() 
                           : claveActual;

        const nuevosDatos = {
            cedula:   (user.cedula   || user.Cedula   || "").toString().trim(),
            nombre:   document.getElementById('edit-nombre').value.trim(),
            apellido: document.getElementById('edit-apellido').value.trim(),
            telefono: document.getElementById('edit-telefono').value.trim(),
            correo:   document.getElementById('edit-correo').value.trim(),
            clave:    nuevaClave
        };

        try {
            const response = await fetch('/api/actualizar-perfil', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevosDatos)
            });

            const res = await response.json();

            if (res.success) {
                const usuarioActualizado = normalizarUsuario({ ...user, ...nuevosDatos });
                localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioActualizado));
                mostrarToast("¡Perfil actualizado con éxito!", "success");
                setTimeout(() => location.reload(), 1800);
            } else {
                mostrarToast("Error: " + res.message, "error");
            }
        } catch (err) {
            console.error(err);
            mostrarToast("Error al conectar con el servidor.", "error");
        }
    }

    // =========================================================
    // 9. CERRAR MODAL / HELPERS
    // =========================================================
    document.getElementById('btn-cancelar-modal').onclick = () => modal.style.display = 'none';

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    function limpiarModal() {
        document.getElementById('confirm-clave').value    = "";
        document.getElementById('confirm-respuesta').value = "";
    }

    function mostrarToast(mensaje, tipo = "success") {
        const anterior = document.querySelector('.toast');
        if (anterior) anterior.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;
        toast.innerHTML = `<i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${mensaje}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    renderData();
});

function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.querySelector('i').className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        btn.querySelector('i').className = 'fas fa-eye';
    }
}