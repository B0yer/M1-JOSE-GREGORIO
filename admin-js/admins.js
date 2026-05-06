// admin-js/admins.js
const URL_API = "http://127.0.0.1:3000/api";
let adminsLocales = [];
let cedulaSeleccionada = '';

document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));

    // Solo superusuarios pueden entrar
    if (!usuarioLogueado || usuarioLogueado.rol.trim().replace(/'/g, '') !== 'superusuario') {
        window.location.href = '../index.html';
        return;
    }

    cargarAdmins();
});

// ─── Carga la lista de admins y superusuarios ───────────────────────────────
async function cargarAdmins() {
    try {
        // Usamos la ruta dedicada que ya excluye clientes
        const resp = await fetch(`${URL_API}/admin/lista-personal`);
        const resultado = await resp.json();

        if (resultado.success) {
            adminsLocales = resultado.data;
            renderizarTablaAdmins(adminsLocales);
        }
    } catch (error) {
        console.error("Error al cargar administradores:", error);
        document.getElementById('cuerpoTablaAdmins').innerHTML =
            `<tr><td colspan="5" style="color:red; text-align:center; padding:40px;">
                Error al conectar con el servidor.
             </td></tr>`;
    }
}

// ─── Renderiza la tabla ─────────────────────────────────────────────────────
function renderizarTablaAdmins(lista) {
    const cuerpo = document.getElementById('cuerpoTablaAdmins');
    cuerpo.innerHTML = '';

    if (lista.length === 0) {
        cuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:50px; color:#888;">
            No hay administradores registrados.
        </td></tr>`;
        return;
    }

    lista.forEach(admin => {
        const rolLimpio  = admin.rol ? admin.rol.trim().replace(/'/g, '') : 'admin';
        const badgeClass = `badge-rol rol-${rolLimpio}`;

        cuerpo.innerHTML += `
            <tr>
                <td><strong style="color:#fff;">${admin.cedula}</strong></td>
                <td>${admin.nombre} ${admin.apellido}</td>
                <td>${admin.correo}</td>
                <td><span class="${badgeClass}">${rolLimpio}</span></td>
                <td style="text-align:center;">
                    <button class="btn-edit"
                        onclick="abrirModal('${admin.cedula}', '${admin.nombre} ${admin.apellido}')">
                        <i class="fas fa-user-shield"></i> Cambiar Rol
                    </button>
                </td>
            </tr>
        `;
    });
}

// ─── Modal ──────────────────────────────────────────────────────────────────
function abrirModal(cedula, nombre) {
    cedulaSeleccionada = cedula;
    document.getElementById('modalNombreAdmin').textContent = `Usuario: ${nombre}`;
    document.getElementById('modalRol').style.display = 'flex';
}

function cerrarModal() {
    cedulaSeleccionada = '';
    document.getElementById('modalRol').style.display = 'none';
}

// Cerrar al hacer clic en el fondo oscuro
document.addEventListener('click', (e) => {
    if (e.target.id === 'modalRol') cerrarModal();
});

// ─── Confirmar cambio de rol ────────────────────────────────────────────────
async function confirmarRol(nuevoRol) {
    if (!cedulaSeleccionada) return;

    const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));
    const nombreAdmin = usuarioLogueado
        ? `${usuarioLogueado.nombre} ${usuarioLogueado.apellido || ''}`.trim()
        : 'Superusuario';
    const cedulaAdmin = usuarioLogueado?.cedula || '';

    try {
        const resp = await fetch(`${URL_API}/admin/cambiar-rol`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cedula:       cedulaSeleccionada,
                nuevo_rol:    nuevoRol,          // ← campo que espera index.js
                nombre_admin: nombreAdmin,
                cedula_admin: cedulaAdmin
            })
        });

        const data = await resp.json();
        cerrarModal();

        if (data.success) {
            alert(`Rol actualizado a "${nuevoRol}" correctamente.`);
            cargarAdmins();
        } else {
            alert(data.message || 'Error al actualizar el rol.');
        }
    } catch (error) {
        cerrarModal();
        alert("Error al conectar con el servidor.");
    }
}
