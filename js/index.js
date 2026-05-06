const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();
 
const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
 
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// ==========================================
// 🔒 FUNCIÓN AUXILIAR: REGISTRAR AUDITORÍA
// ==========================================
async function registrarAuditoria({ usuario_afectado, accion, detalles, responsable, tipo }) {
    try {
        await supabase.from('auditoria').insert([{
            usuario_afectado: usuario_afectado || null,
            accion,
            detalles,
            responsable: responsable || 'Sistema',
            tipo // 'cita' | 'usuario' | 'registro' | 'sistema'
        }]);
    } catch (err) {
        console.error("⚠️ Error al registrar auditoría:", err.message);
    }
}

// ==========================================
// 🔔 FUNCIÓN AUXILIAR: CREAR NOTIFICACIÓN
// ==========================================
async function crearNotificacion({ usuario_destino, mensaje }) {
    try {
        const { error } = await supabase.from('notificaciones').insert([{
            usuario_destino: String(usuario_destino),
            mensaje,
            leido: false
        }]);
        if (error) console.error("⚠️ Error al crear notificación:", error.message);
    } catch (err) {
        console.error("⚠️ Error inesperado en notificación:", err.message);
    }
}

// ==========================================
// 1. RUTA DE REGISTRO
// ==========================================
app.post('/api/registro', async (req, res) => {
    const { 
        cedula, nombre, apellido, telefono, 
        correo, clave, pregunta1, respuesta1, 
        pregunta2, respuesta2 
    } = req.body;
 
    try {
        // ── Verificar si la cédula ya está registrada ──
        const { data: existente } = await supabase
            .from('usuarios')
            .select('cedula')
            .eq('cedula', cedula)
            .maybeSingle();

        if (existente) {
            console.log("⚠️ Intento de registro con cédula duplicada:", cedula);
            return res.status(409).json({
                success: false,
                message: 'cedula_duplicada'
            });
        }

        // ── Insertar nuevo usuario ──
        const { data, error } = await supabase
            .from('usuarios')
            .insert([{ 
                cedula, nombre, apellido, telefono, 
                correo, clave, pregunta1, respuesta1, 
                pregunta2, respuesta2, rol: 'cliente' 
            }])
            .select();
 
        if (error) {
            console.error("❌ Error de Supabase:", error.message);
            return res.status(400).json({ success: false, message: error.message });
        }

        // 🔒 AUDITORÍA
        await registrarAuditoria({
            usuario_afectado: `${nombre} ${apellido} (${cedula})`,
            accion: 'Registro de usuario',
            detalles: `Nuevo cliente registrado: ${nombre} ${apellido} (${correo})`,
            responsable: 'Sistema',
            tipo: 'sistema'
        });
 
        console.log("✅ Usuario registrado con éxito:", cedula);
        res.json({ success: true, message: "¡Registro guardado con éxito!" });
 
    } catch (err) {
        console.error("💥 Error inesperado en el servidor:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});
 
// ==========================================
// 2. RUTA DE LOGIN
// ==========================================
app.post('/api/login', async (req, res) => {
    const { correo, clave } = req.body;
 
    try {
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('correo', correo)
            .eq('clave', clave)
            .single(); 
 
        if (error || !usuario) {
            console.log("❌ Intento de login fallido para:", correo);
            return res.status(401).json({ 
                success: false, 
                message: "Correo o clave incorrectos" 
            });
        }
 
        console.log("✅ Inicio de sesión exitoso:", usuario.nombre);
        res.json({ 
            success: true, 
            message: "¡Bienvenido de nuevo!",
            usuario: usuario 
        });
 
    } catch (err) {
        console.error("💥 Error inesperado en el servidor:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});
 
// ==========================================
// 3. RUTA PARA REGISTRAR VEHÍCULO
// ==========================================
app.post('/api/registrar-vehiculo', async (req, res) => {
    const { placa, marca, modelo, año, cedula } = req.body;
 
    try {
        const { data, error } = await supabase
            .from('vehiculos')
            .insert([{ placa, marca, modelo, año: parseInt(año), cedula }])
            .select();
 
        if (error) {
            console.error("❌ Error de Supabase al registrar vehículo:", error.message);
            return res.status(400).json({ success: false, message: error.message });
        }

        // 🔒 AUDITORÍA
        const { data: clienteData } = await supabase
            .from('usuarios')
            .select('nombre, apellido')
            .eq('cedula', cedula)
            .single();
        const nomCliente = clienteData
            ? `${clienteData.nombre} ${clienteData.apellido}`
            : cedula;

        await registrarAuditoria({
            usuario_afectado: `${nomCliente} (${cedula})`,
            accion: 'Vehículo registrado',
            detalles: `${nomCliente} registró el vehículo ${marca} ${modelo} (Placa: ${placa}, Año: ${año})`,
            responsable: 'Sistema',
            tipo: 'sistema'
        });
 
        console.log("✅ Vehículo registrado con éxito. Placa:", placa);
        res.json({ success: true, message: "¡Vehículo guardado en la base de datos!" });
 
    } catch (err) {
        console.error("💥 Error inesperado en el servidor:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});
 
// ==========================================
// 4. RUTA PARA OBTENER VEHÍCULOS DE UN USUARIO
// ==========================================
app.get('/api/mis-vehiculos', async (req, res) => {
    const { cedula } = req.query;
 
    try {
        const { data, error } = await supabase
            .from('vehiculos')
            .select('*')
            .eq('cedula', cedula);
 
        if (error) return res.status(400).json({ success: false, message: error.message });
        res.json({ success: true, data });
 
    } catch (err) {
        res.status(500).json({ success: false, message: "Error en el servidor" });
    }
});
 
// ==========================================
// 5. RUTA PARA ELIMINAR UN VEHÍCULO
// ==========================================
app.delete('/api/eliminar-vehiculo', async (req, res) => {
    const { placa } = req.query;
 
    try {
        const { error } = await supabase
            .from('vehiculos')
            .delete()
            .eq('placa', placa);
 
        if (error) return res.status(400).json({ success: false, message: error.message });
        res.json({ success: true, message: "Vehículo eliminado" });
 
    } catch (err) {
        res.status(500).json({ success: false, message: "Error en el servidor" });
    }
});
 
// ==========================================
// 6. RUTA: OBTENER LOS SERVICIOS
// ==========================================
app.get('/api/servicios', async (req, res) => {
    try {
        const { data, error } = await supabase.from('servicios').select('*');
        if (error) return res.status(400).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error en el servidor" });
    }
});
 
// ==========================================
// 7. RUTA: OBTENER LAS CITAS DE UN USUARIO
// ==========================================
app.get('/api/mis-citas', async (req, res) => {
    const { cedula } = req.query;
 
    try {
        const { data, error } = await supabase
            .from('citas')
            .select(`*, servicios ( servicio ), vehiculos ( marca, modelo, año )`)
            .eq('cedula', cedula); 
 
        if (error) return res.status(400).json({ success: false, message: error.message });
        res.json({ success: true, data });
 
    } catch (err) {
        res.status(500).json({ success: false, message: "Error en el servidor" });
    }
});

// ==========================================
// 8. RUTA: REGISTRAR UNA NUEVA CITA
// ==========================================
app.post('/api/registrar-cita', async (req, res) => {
    const { cédula, placa, id, fecha, hora, motivo, estado } = req.body;

    try {
        const { data: citaExistente } = await supabase
            .from('citas')
            .select('id')
            .eq('placa', placa)
            .in('estado', ['Pendiente', 'Confirmada'])
            .maybeSingle(); 
 
        if (citaExistente) {
            return res.status(400).json({ 
                success: false, 
                message: "Este vehículo ya tiene una cita activa pendiente de revisión." 
            });
        }
 
        const { error } = await supabase
            .from('citas')
            .insert([{ cedula: cédula, placa, id_servicios: id, fecha, hora, motivo, estado }]);
 
        if (error) return res.status(400).json({ success: false, message: error.message });

        // 🔒 AUDITORÍA
        const { data: clienteData } = await supabase
            .from('usuarios')
            .select('nombre, apellido')
            .eq('cedula', cédula)
            .single();
        const nomCliente = clienteData 
            ? `${clienteData.nombre} ${clienteData.apellido}` 
            : cédula;

        await registrarAuditoria({
            usuario_afectado: `${nomCliente} (${cédula})`,
            accion: 'Nueva cita creada',
            detalles: `${nomCliente} agendó una cita para la placa ${placa} el ${fecha} a las ${hora}`,
            responsable: 'Sistema',
            tipo: 'sistema'
        });

        // 🔔 NOTIFICACIÓN a admin/superusuario por ROL
        // usuario_destino='admin' es la clave fija que el GET filtra por tipo=admin
        // Todos los usuarios con rol admin o superusuario ven este aviso
        await supabase.from('notificaciones').insert([{
            usuario_destino: 'admin',
            mensaje: `📋 Nueva cita solicitada por ${nomCliente} para la placa ${placa} el ${fecha} a las ${hora}.`,
            leido: false
        }]);
 
        res.json({ success: true, message: "Cita solicitada con éxito" });
 
    } catch (err) {
        console.error("Error en registro de cita:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});
 
// ==========================================
// 9. RUTA: ACTUALIZAR PERFIL DE USUARIO
// ==========================================
app.put('/api/actualizar-perfil', async (req, res) => {
    const { cedula, nombre, apellido, telefono, correo, clave } = req.body;
 
    try {
        const { error } = await supabase
            .from('usuarios')
            .update({ nombre, apellido, telefono, correo, clave })
            .eq('cedula', cedula);
 
        if (error) return res.status(400).json({ success: false, message: error.message });
 
        console.log(`✅ Usuario ${cedula} actualizado exitosamente.`);
        res.json({ success: true, message: "Datos actualizados en la nube" });
 
    } catch (err) {
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});

// ==========================================
// 10. RUTA: OBTENER TODAS LAS CITAS POR ESTADO (PARA ADMIN)
// ==========================================
app.get('/api/admin/citas', async (req, res) => {
    const { estado } = req.query;
 
    try {
        const { data, error } = await supabase
            .from('citas')
            .select(`
                *,
                cliente:usuarios!citas_cedula_fkey ( nombre, apellido ),
                encargado:usuarios!citas_id_admin_fkey ( nombre, apellido ),
                vehiculos ( marca, modelo )
            `)
            .eq('estado', estado || 'Pendiente')
            .order('fecha', { ascending: true });
 
        if (error) {
            console.error("❌ Error de relación (FK) en Supabase:", error.message);
            return res.status(400).json({ success: false, message: "Error al obtener datos de relación: " + error.message });
        }
 
        console.log(`✅ Citas cargadas con éxito para el estado: ${estado}`);
        res.json({ success: true, data });
 
    } catch (err) {
        console.error("💥 Error inesperado en el servidor (Ruta 10):", err);
        res.status(500).json({ success: false, message: "Error interno del servidor al procesar las citas" });
    }
});
 
// ==========================================
// 11. RUTA: ACTUALIZAR ESTADO DE CITA 
// ==========================================
app.put('/api/admin/actualizar-cita', async (req, res) => {
    const { id, nuevoEstado, fecha_actualizacion, id_admin } = req.body;
 
    try {
        const { error } = await supabase
            .from('citas')
            .update({ estado: nuevoEstado, fecha_actualizacion, id_admin })
            .eq('id', id);
 
        if (error) return res.status(400).json({ success: false, message: error.message });

        const { data: citaData }  = await supabase.from('citas').select('cedula').eq('id', id).single();
        const { data: adminData } = await supabase.from('usuarios').select('nombre, apellido, cedula').eq('cedula', id_admin).single();
        const { data: clienteData } = citaData?.cedula
            ? await supabase.from('usuarios').select('nombre, apellido').eq('cedula', citaData.cedula).single()
            : { data: null };

        const cedCliente = citaData?.cedula || null;
        const nomCliente = clienteData
            ? `${clienteData.nombre} ${clienteData.apellido}`
            : (cedCliente || 'Desconocido');
        const nomAdmin = adminData
            ? `${adminData.nombre} ${adminData.apellido} (${adminData.cedula})`
            : `Admin ID: ${id_admin}`;

        await registrarAuditoria({
            usuario_afectado: cedCliente ? `${nomCliente} (${cedCliente})` : null,
            accion: `Cita ${nuevoEstado}`,
            detalles: `${nomAdmin} actualizó la cita #${id} del cliente ${nomCliente} al estado: ${nuevoEstado}`,
            responsable: nomAdmin,
            tipo: 'cita'
        });

        // 🔔 NOTIFICACIÓN al cliente sobre el cambio de estado de su cita
        if (cedCliente) {
            const iconoEstado = {
                'Aceptada':  '✅',
                'Rechazada': '❌',
                'Cancelada': '❌',
                'Confirmada':'✅',
                'Finalizada':'🏁'
            }[nuevoEstado] || '🔔';

            await crearNotificacion({
                usuario_destino: cedCliente,
                mensaje: `${iconoEstado} Tu cita #${id} ha sido ${nuevoEstado.toLowerCase()} por el taller.`
            });
        }
 
        res.json({ success: true, message: `Cita ${nuevoEstado} con éxito` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error en el servidor" });
    }
});
 
// ==========================================
// 12. RUTA: ACTUALIZAR DETALLES DE REPARACIÓN
// ==========================================
app.put('/api/admin/actualizar-reparacion', async (req, res) => {
    const { 
        id, detalle_reparacion, estado_reparacion, progreso, 
        fecha_entrega, nuevoEstado, fecha_actualizacion, id_admin
    } = req.body;
 
    try {
        const { error } = await supabase
            .from('citas')
            .update({ 
                detalle_reparacion, estado_reparacion,  
                progreso: parseInt(progreso),
                fecha_entrega: fecha_entrega || null,
                estado: nuevoEstado || 'Aceptada',
                fecha_actualizacion,
                id_admin
            })
            .eq('id', id);
 
        if (error) {
            console.error("❌ Error Supabase:", error.message);
            return res.status(400).json({ success: false, message: error.message });
        }

        const { data: citaData }  = await supabase.from('citas').select('cedula').eq('id', id).single();
        const { data: adminData } = await supabase.from('usuarios').select('nombre, apellido, cedula').eq('cedula', id_admin).single();
        const { data: clienteData } = citaData?.cedula
            ? await supabase.from('usuarios').select('nombre, apellido').eq('cedula', citaData.cedula).single()
            : { data: null };

        const cedCliente = citaData?.cedula || null;
        const nomCliente = clienteData
            ? `${clienteData.nombre} ${clienteData.apellido}`
            : (cedCliente || 'Desconocido');
        const nomAdmin = adminData
            ? `${adminData.nombre} ${adminData.apellido} (${adminData.cedula})`
            : `Admin ID: ${id_admin}`;

        await registrarAuditoria({
            usuario_afectado: cedCliente ? `${nomCliente} (${cedCliente})` : null,
            accion: 'Reparación actualizada',
            detalles: `${nomAdmin} actualizó la reparación de la cita #${id} del cliente ${nomCliente}. Estado: ${nuevoEstado || 'Aceptada'} | Progreso: ${progreso}%`,
            responsable: nomAdmin,
            tipo: 'cita'
        });

        // 🔔 NOTIFICACIÓN al cliente sobre actualización de reparación
        if (cedCliente) {
            const esFinalizada = (nuevoEstado || '').toLowerCase().includes('finaliz') ||
                                 (estado_reparacion || '').toLowerCase().includes('entregado');

            const mensajeNotif = esFinalizada
                ? `🏁 Tu vehículo (cita #${id}) está listo y ha sido entregado. ¡Gracias por confiar en nosotros!`
                : `🔧 Tu reparación (cita #${id}) ha sido actualizada. Progreso: ${progreso}% — Estado: ${estado_reparacion || nuevoEstado || 'En proceso'}.`;

            await crearNotificacion({
                usuario_destino: cedCliente,
                mensaje: mensajeNotif
            });
        }
 
        res.json({ success: true, message: "Reparación actualizada correctamente" });
    } catch (err) {
        console.error("💥 Error en el servidor:", err);
        res.status(500).json({ success: false, message: "Error en el servidor" });
    }
});

// ==========================================
// 13. RUTA: OBTENER TODOS LOS USUARIOS (UNIFICADA)
// ==========================================
app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select(`
                cedula, nombre, apellido, correo, telefono, rol,
                vehiculos(count),
                citas!citas_cedula_fkey(count)
            `);
 
        if (error) {
            console.error("❌ Error de Supabase:", error.message);
            return res.status(400).json({ success: false, message: error.message });
        }
 
        const clientesFormateados = data
            .filter(u => {
                if (!u.rol) return false;
                const rolLimpio = u.rol.trim().replace(/'/g, '');
                return rolLimpio === 'cliente';
            })
            .map(u => ({
                cedula: u.cedula,
                nombre: u.nombre,
                apellido: u.apellido,
                correo: u.correo,
                telefono: u.telefono,
                total_vehiculos: u.vehiculos[0]?.count || 0,
                total_citas: u.citas[0]?.count || 0
            }));
 
        res.json({ success: true, data: clientesFormateados });
    } catch (err) {
        console.error("💥 Error en el servidor:", err);
        res.status(500).json({ success: false, message: "Error en el servidor" });
    }
});

// ==========================================
// 14. ELIMINAR USUARIO
// ==========================================
app.delete('/api/admin/eliminar-usuario', async (req, res) => {
    const { cedula, nombre_admin, cedula_admin } = req.query;
    try {
        const { data: clienteData } = await supabase
            .from('usuarios')
            .select('nombre, apellido, correo')
            .eq('cedula', cedula)
            .single();

        const { error } = await supabase.from('usuarios').delete().eq('cedula', cedula);

        if (error) return res.status(400).json({ success: false, message: "No se puede eliminar: tiene registros asociados." });

        const nombreCliente = clienteData 
            ? `${clienteData.nombre} ${clienteData.apellido}` 
            : cedula;

        const responsableStr = nombre_admin
            ? (cedula_admin ? `${nombre_admin} (${cedula_admin})` : nombre_admin)
            : 'Admin';

        await registrarAuditoria({
            usuario_afectado: `${nombreCliente} (${cedula})`,
            accion: 'Usuario eliminado',
            detalles: `Se eliminó al cliente ${nombreCliente} (Cédula: ${cedula})`,
            responsable: responsableStr,
            tipo: 'usuario'
        });

        res.json({ success: true, message: "Usuario eliminado" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error en el servidor" });
    }
});

// ==========================================
// 15. OBTENER LISTA DE ADMINISTRADORES
// ==========================================
app.get('/api/admin/lista-personal', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('cedula, nombre, apellido, correo, telefono, rol')
            .not('rol', 'eq', 'cliente'); 

        if (error) throw error;

        const listaLimpia = data.map(u => ({
            ...u,
            rol: u.rol ? u.rol.trim().replace(/'/g, '') : 'admin'
        }));

        res.json({ success: true, data: listaLimpia });
    } catch (err) {
        console.error("❌ Error al obtener personal:", err.message);
        res.status(500).json({ success: false, message: "Error al obtener lista de personal" });
    }
});

// ==========================================
// 16. AUDITORÍA — RUTA PRINCIPAL (SOLO SUPERUSUARIO)
// ==========================================
app.get('/api/admin/auditoria', async (req, res) => {
    const { fecha_desde, fecha_hasta, busqueda, tipo } = req.query;

    try {
        let query = supabase
            .from('auditoria')
            .select('*')
            .order('fecha', { ascending: false });

        if (fecha_desde) query = query.gte('fecha', fecha_desde);
        if (fecha_hasta) {
            const hasta = new Date(fecha_hasta);
            hasta.setHours(23, 59, 59, 999);
            query = query.lte('fecha', hasta.toISOString());
        }

        if (tipo && tipo !== 'todos' && tipo !== 'sistema') {
            query = tipo === 'cita'
                ? query.eq('tipo', 'cita')
                : query.eq('tipo', tipo);
        }

        const { data, error } = await query;
        if (error) throw error;

        let resultado = data;

        if (tipo === 'sistema') {
            resultado = data.filter(item =>
                item.tipo === 'sistema' || item.responsable === 'Sistema'
            );
        } else if (tipo === 'cita') {
            resultado = data.filter(item =>
                item.tipo === 'cita' && item.responsable !== 'Sistema'
            );
        }

        if (busqueda && busqueda.trim() !== '') {
            const termino = busqueda.trim().toLowerCase();
            resultado = resultado.filter(item =>
                (item.usuario_afectado && item.usuario_afectado.toLowerCase().includes(termino)) ||
                (item.responsable && item.responsable.toLowerCase().includes(termino)) ||
                (item.detalles && item.detalles.toLowerCase().includes(termino)) ||
                (item.accion && item.accion.toLowerCase().includes(termino))
            );
        }

        res.json({ success: true, data: resultado, total: resultado.length });
    } catch (err) {
        console.error("❌ Error en auditoría:", err.message);
        res.status(500).json({ success: false, message: "Error al obtener auditoría: " + err.message });
    }
});

// Ruta legacy de auditoría de citas (se mantiene por compatibilidad)
app.get('/api/admin/auditoria-citas', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('citas')
            .select(`
                id, fecha, estado, id_cliente, id_admin,
                usuarios!citas_id_cliente_fkey(nombre, apellido),
                encargado:usuarios!citas_id_admin_fkey(nombre, apellido)
            `)
            .not('id_admin', 'is', null)
            .order('fecha', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error("❌ Error en auditoría:", err.message);
        res.status(500).json({ success: false, message: "Error en auditoría" });
    }
});

// ==========================================
// 17. CAMBIAR ROL DE USUARIO (MODULO SUPERUSUARIO)
// ==========================================
app.put('/api/admin/cambiar-rol', async (req, res) => {
    const { cedula, nuevo_rol, nombre_admin, cedula_admin } = req.body;

    const rolesValidos = ['cliente', 'admin', 'superusuario'];
    if (!rolesValidos.includes(nuevo_rol)) {
        return res.status(400).json({ success: false, message: "Rol no válido" });
    }

    try {
        const { data, error } = await supabase
            .from('usuarios')
            .update({ rol: nuevo_rol })
            .eq('cedula', cedula)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        await registrarAuditoria({
            usuario_afectado: cedula,
            accion: 'CAMBIO DE ROL',
            detalles: `Se actualizó el nivel de acceso a: ${nuevo_rol.toUpperCase()}`,
            responsable: nombre_admin || 'Superusuario',
            tipo: 'usuario'
        });

        res.json({ 
            success: true, 
            message: `El usuario ahora tiene el rol de ${nuevo_rol}.` 
        });

    } catch (err) {
        console.error("❌ Error al cambiar rol:", err.message);
        res.status(500).json({ 
            success: false, 
            message: "Error al procesar el cambio de rol" 
        });
    }
});

// ==========================================
// 18. RECUPERACIÓN DE CONTRASEÑA — PASO 1
// ==========================================
app.post('/api/recuperar/verificar-cedula', async (req, res) => {
    const { cedula } = req.body;

    if (!cedula || cedula.length < 6 || isNaN(cedula)) {
        return res.status(400).json({ success: false, message: 'Cédula inválida.' });
    }

    try {
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('cedula, pregunta1, pregunta2')
            .eq('cedula', cedula)
            .single();

        if (error || !usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const usarPregunta1 = Math.random() < 0.5;
        const campoPregunta = usarPregunta1 ? 'pregunta1' : 'pregunta2';
        const textoPregunta = usarPregunta1 ? usuario.pregunta1 : usuario.pregunta2;

        res.json({ success: true, campoPregunta, textoPregunta });

    } catch (err) {
        console.error('💥 Error en verificar-cedula:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// ==========================================
// 19. RECUPERACIÓN DE CONTRASEÑA — PASO 2
// ==========================================
app.post('/api/recuperar/verificar-respuesta', async (req, res) => {
    const { cedula, campoPregunta, respuesta } = req.body;

    if (!cedula || !campoPregunta || !respuesta) {
        return res.status(400).json({ success: false, message: 'Datos incompletos.' });
    }

    if (!['pregunta1', 'pregunta2'].includes(campoPregunta)) {
        return res.status(400).json({ success: false, message: 'Campo de pregunta inválido.' });
    }

    const campoRespuesta = campoPregunta === 'pregunta1' ? 'respuesta1' : 'respuesta2';

    try {
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select(campoRespuesta)
            .eq('cedula', cedula)
            .single();

        if (error || !usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const respuestaGuardada  = (usuario[campoRespuesta] || '').trim().toLowerCase();
        const respuestaIngresada = respuesta.trim().toLowerCase();

        if (respuestaGuardada !== respuestaIngresada) {
            return res.status(401).json({ success: false, message: 'Respuesta incorrecta.' });
        }

        res.json({ success: true, message: 'Respuesta correcta.' });

    } catch (err) {
        console.error('💥 Error en verificar-respuesta:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// ==========================================
// 20. RECUPERACIÓN DE CONTRASEÑA — PASO 3
// ==========================================
app.post('/api/recuperar/nueva-clave', async (req, res) => {
    const { cedula, nuevaClave } = req.body;

    if (!cedula || !nuevaClave) {
        return res.status(400).json({ success: false, message: 'Datos incompletos.' });
    }

    const fuerte = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!fuerte.test(nuevaClave)) {
        return res.status(400).json({ success: false, message: 'La contraseña no cumple los requisitos de seguridad.' });
    }

    try {
        const { error } = await supabase
            .from('usuarios')
            .update({ clave: nuevaClave })
            .eq('cedula', cedula);

        if (error) {
            console.error('❌ Error al actualizar clave:', error.message);
            return res.status(400).json({ success: false, message: error.message });
        }

        await registrarAuditoria({
            usuario_afectado: cedula,
            accion: 'Recuperación de contraseña',
            detalles: `El usuario con cédula ${cedula} restableció su contraseña mediante preguntas de seguridad.`,
            responsable: 'Sistema',
            tipo: 'sistema'
        });

        console.log('✅ Contraseña actualizada para cédula:', cedula);
        res.json({ success: true, message: '¡Contraseña actualizada con éxito!' });

    } catch (err) {
        console.error('💥 Error en nueva-clave:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// ==========================================
// 21. NOTIFICACIONES — OBTENER (CLIENTE O ADMIN)
// ==========================================
// GET /api/notificaciones?tipo=cliente&cedula=12345678
// GET /api/notificaciones?tipo=admin
app.get('/api/notificaciones', async (req, res) => {
    const { tipo, cedula } = req.query;

    try {
        let query = supabase
            .from('notificaciones')
            .select('*')
            .order('fecha', { ascending: false })
            .limit(50);

        if (tipo === 'cliente') {
            if (!cedula) return res.status(400).json({ success: false, message: 'Cédula requerida para clientes.' });
            query = query.eq('usuario_destino', String(cedula));
        } else if (tipo === 'admin') {
            // Para admin/superusuario: notificaciones dirigidas a 'admin'
            query = query.eq('usuario_destino', 'admin');
        } else {
            return res.status(400).json({ success: false, message: 'Tipo inválido. Use cliente o admin.' });
        }

        const { data, error } = await query;
        if (error) throw error;

        res.json({ success: true, data: data || [] });

    } catch (err) {
        console.error("❌ Error al obtener notificaciones:", err.message);
        res.status(500).json({ success: false, message: "Error al obtener notificaciones" });
    }
});

// ==========================================
// 22. NOTIFICACIONES — MARCAR COMO LEÍDAS
// ==========================================
// PUT /api/notificaciones/marcar-leidas?tipo=cliente&cedula=12345678
// PUT /api/notificaciones/marcar-leidas?tipo=admin
app.put('/api/notificaciones/marcar-leidas', async (req, res) => {
    const { tipo, cedula } = req.query;

    try {
        let query = supabase
            .from('notificaciones')
            .update({ leido: true })
            .eq('leido', false);

        if (tipo === 'cliente') {
            if (!cedula) return res.status(400).json({ success: false, message: 'Cédula requerida.' });
            query = query.eq('usuario_destino', String(cedula));
        } else if (tipo === 'admin') {
            query = query.eq('usuario_destino', 'admin');
        } else {
            return res.status(400).json({ success: false, message: 'Tipo inválido.' });
        }

        const { error } = await query;
        if (error) throw error;

        res.json({ success: true, message: 'Notificaciones marcadas como leídas.' });

    } catch (err) {
        console.error("❌ Error al marcar notificaciones:", err.message);
        res.status(500).json({ success: false, message: "Error al actualizar notificaciones" });
    }
});

// ==========================================
// 23. NOTIFICACIONES — CREAR MANUALMENTE (USO INTERNO / ADMIN)
// ==========================================
// POST /api/notificaciones  { usuario_destino, mensaje }
app.post('/api/notificaciones', async (req, res) => {
    const { usuario_destino, mensaje } = req.body;

    if (!usuario_destino || !mensaje) {
        return res.status(400).json({ success: false, message: 'usuario_destino y mensaje son requeridos.' });
    }

    try {
        const { error } = await supabase.from('notificaciones').insert([{
            usuario_destino: String(usuario_destino),
            mensaje,
            leido: false
        }]);

        if (error) throw error;
        res.json({ success: true, message: 'Notificación creada.' });
    } catch (err) {
        console.error("❌ Error al crear notificación:", err.message);
        res.status(500).json({ success: false, message: "Error al crear notificación" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://127.0.0.1:${PORT}`);
});