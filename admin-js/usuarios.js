const URL_API = "http://127.0.0.1:3000/api";
let clientesLocales = [];

document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));
    
    // Verificación de seguridad de rol
    if (!usuarioLogueado || (usuarioLogueado.rol !== 'admin' && usuarioLogueado.rol !== 'superusuario')) {
        window.location.href = '../auth/login.html';
        return;
    }

    cargarClientes();
    configurarBuscador();
});

async function cargarClientes() {
    try {
        const resp = await fetch(`${URL_API}/admin/usuarios`);
        const resultado = await resp.json();

        if (resultado.success) {
            clientesLocales = resultado.data;
            renderizarTabla(clientesLocales);
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        document.getElementById('cuerpoTabla').innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Error al conectar con el servidor.</td></tr>`;
    }
}

function renderizarTabla(lista) {
    const cuerpoTabla = document.getElementById('cuerpoTabla');
    cuerpoTabla.innerHTML = '';

    if (lista.length === 0) {
        cuerpoTabla.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:50px;">No hay resultados.</td></tr>`;
        return;
    }

    lista.forEach(cliente => {
        const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`;
        
        // Lógica de WhatsApp: 0424... -> 58424...
        const telLimpio = cliente.telefono ? cliente.telefono.trim().replace(/\s+/g, '') : '';
        const telFormateado = telLimpio.startsWith('0') ? '58' + telLimpio.substring(1) : telLimpio;
        const mensajeWA = encodeURIComponent(`Buenas tardes ${cliente.nombre}, le escribo de parte del taller automotriz Jose Gregorio para consultar un detalle con usted.`);
        const linkWA = `https://wa.me/${telFormateado}?text=${mensajeWA}`;

        cuerpoTabla.innerHTML += `
            <tr>
                <td><strong style="color: #fff;">${cliente.cedula}</strong></td>
                <td>
                    ${nombreCompleto}<br>
                    <small style="color: #ff6600;">${cliente.total_vehiculos} vehíc. | ${cliente.total_citas} citas</small>
                </td>
                <td>${cliente.correo}</td>
                <td>${cliente.telefono || '---'}</td>
                <td>
                    <div style="display:flex; gap:12px; justify-content:center; align-items:center;">
                        <button class="btn-historial" onclick="verHistorial('${cliente.cedula}')" title="Ver Citas" style="background:none; border:1px solid #ff6600; color:#ff6600; padding:5px 10px; border-radius:4px; cursor:pointer;">
                            <i class="fas fa-history"></i>
                        </button>
                        
                        ${cliente.telefono ? `
                            <a href="${linkWA}" target="_blank" title="Contactar WhatsApp" style="color:#25D366; font-size:1.4rem;">
                                <i class="fab fa-whatsapp"></i>
                            </a>
                        ` : ''}

                        <button onclick="eliminarUsuario('${cliente.cedula}', '${nombreCompleto}')" title="Eliminar Cliente" style="background:none; border:none; color:#ff4444; cursor:pointer; font-size:1.1rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

function configurarBuscador() {
    const inputBusqueda = document.getElementById('inputBusqueda');
    inputBusqueda.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const filtrados = clientesLocales.filter(c => {
            const completo = `${c.nombre} ${c.apellido}`.toLowerCase();
            return c.cedula.toLowerCase().includes(termino) || 
                   completo.includes(termino) || 
                   c.correo.toLowerCase().includes(termino);
        });
        renderizarTabla(filtrados);
    });
}

function verHistorial(cedula) {
    sessionStorage.setItem('admin_ver_cedula', cedula);
    window.location.href = '../cliente/historial.html';
}

async function eliminarUsuario(cedula, nombre) {
    const confirmar = confirm(`¿Está seguro de eliminar a ${nombre}? Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));
    const nombreAdmin = usuarioLogueado 
        ? `${usuarioLogueado.nombre} ${usuarioLogueado.apellido || ''}`.trim()
        : 'Admin';
    const cedulaAdmin = usuarioLogueado?.cedula || '';

    try {
        const params = new URLSearchParams({ 
            cedula, 
            nombre_admin: nombreAdmin,
            cedula_admin: cedulaAdmin
        });

        const resp = await fetch(`${URL_API}/admin/eliminar-usuario?${params.toString()}`, {
            method: 'DELETE'
        });
        const data = await resp.json();

        if (data.success) {
            alert("Usuario eliminado correctamente.");
            cargarClientes(); 
        } else {
            alert(data.message); 
        }
    } catch (error) {
        alert("Error al conectar con el servidor.");
    }
}
