// Configuración de Supabase (Reemplaza con tus datos de Project Settings -> API)
const SUPABASE_URL = "https://kpywveceznobreogzjbg.supabase.co";
const SUPABASE_KEY = "sb_publishable_8zH73yOsHqCRcjaF3JaWlA_sTl-Jd34";

const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
};

/**
 * Registra un nuevo estudiante en la base de datos
 */
async function registrarUsuario(username) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
            method: 'POST',
            headers: {
                ...headers,
                "Prefer": "return=representation"
            },
            body: JSON.stringify({ username: username, puntaje: 0 })
        });
        
        if (!response.ok) {
            const err = await response.json();
            if (err.code === "23505") {
                throw new Error("El nombre de usuario ya existe.");
            }
            throw new Error("Error al registrar el usuario.");
        }
        
        const data = await response.json();
        return data[0];
    } catch (error) {
        console.error(error);
        throw error;
    }
}

/**
 * Obtiene la lista completa de usuarios ordenada por puntaje (para el Leaderboard)
 */
async function obtenerLeaderboard() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?select=username,puntaje&order=puntaje.desc`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) throw new Error("No se pudo obtener el leaderboard.");
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
}

/**
 * Valida la flag introducida por el estudiante de manera segura del lado del servidor/API
 */
async function validarFlag(username, desafioId, flagIngresada) {
    try {
        // 1. Verificar si el desafío existe y la flag coincide
        const resDesafio = await fetch(`${SUPABASE_URL}/rest/v1/desafios?id=eq.${desafioId}&select=flag,puntos`, {
            method: 'GET',
            headers: headers
        });
        const desafios = await resDesafio.json();
        
        if (desafios.length === 0) return { exitoso: false, mensaje: "Desafío no encontrado." };
        
        const desafio = desafios[0];
        const esCorrecto = (desafio.flag.trim() === flagIngresada.trim());

        // 2. Registrar el intento en la tabla de logs
        await fetch(`${SUPABASE_URL}/rest/v1/logs_envios`, {
            method: 'POST',
            headers: headers
        });

        if (esCorrecto) {
            // Verificar si el usuario ya resolvió este desafío previamente para evitar doble puntaje
            const resLogs = await fetch(`${SUPABASE_URL}/rest/v1/logs_envios?username=eq.${username}&desafio_id=eq.${desafioId}&exitoso=eq.true&select=id`, {
                method: 'GET',
                headers: headers
            });
            const logsPrevios = await resLogs.json();

            if (logsPrevios.length === 0) {
                // Actualizar puntaje del usuario sumando los puntos del desafío
                // Para simplificar desde cliente con anon key, leemos el puntaje actual primero
                const resUser = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?username=eq.${username}&select=puntaje`, {
                    method: 'GET',
                    headers: headers
                });
                const userData = await resUser.json();
                const nuevoPuntaje = userData[0].puntaje + desafio.puntos;

                await fetch(`${SUPABASE_URL}/rest/v1/usuarios?username=eq.${username}`, {
                    method: 'PATCH',
                    headers: headers,
                    body: JSON.stringify({ puntaje: nuevoPuntaje })
                });
            }
            return { exitoso: true, mensaje: "¡Flag Correcta!" };
        } else {
            return { exitoso: false, mensaje: "Flag Incorrecta." };
        }
    } catch (error) {
        console.error(error);
        return { exitoso: false, mensaje: "Error de conexión con el servidor." };
    }
}
