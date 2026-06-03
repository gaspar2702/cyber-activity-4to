// ============================================================
//  api.js — CyberCTF · Supabase REST Client
//  Replace SUPABASE_URL and SUPABASE_KEY with your project's
//  values from: Project Settings → API
// ============================================================

const SUPABASE_URL = "https://kpywveceznobreogzjbg.supabase.co";
const SUPABASE_KEY = "sb_publishable_8zH73yOsHqCRcjaF3JaWlA_sTl-Jd34";

const _h = {
    "apikey":        SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type":  "application/json"
};

/* ── helpers ─────────────────────────────────────────── */
async function _get(path) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: _h });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

async function _post(path, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method: 'POST',
        headers: { ..._h, "Prefer": "return=representation" },
        body: JSON.stringify(body)
    });
    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw Object.assign(new Error(err.message || "POST error"), { code: err.code });
    }
    return r.json();
}

async function _patch(path, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method: 'PATCH',
        headers: { ..._h, "Prefer": "return=minimal" },
        body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
}

/* ── public API ─────────────────────────────────────── */

/**
 * Register a new student. Returns user object.
 * Throws if username already taken.
 */
async function registrarUsuario(username) {
    try {
        const data = await _post('usuarios', { username, puntaje: 0 });
        return data[0];
    } catch (e) {
        if (e.code === '23505') throw new Error("El nombre de usuario ya existe.");
        throw new Error("Error al registrar el usuario.");
    }
}

/**
 * Fetch sorted leaderboard.
 */
async function obtenerLeaderboard() {
    try {
        return await _get('usuarios?select=username,puntaje&order=puntaje.desc');
    } catch (e) {
        console.error(e);
        return [];
    }
}

/**
 * Fetch all challenges (no flag exposed).
 */
async function obtenerDesafios() {
    try {
        return await _get('desafios?select=id,nombre,categoria,puntos&order=id.asc');
    } catch (e) {
        console.error(e);
        return [];
    }
}

/**
 * Fetch solved challenge IDs for a given user.
 */
async function obtenerResueltos(username) {
    try {
        const logs = await _get(
            `logs_envios?username=eq.${encodeURIComponent(username)}&exitoso=eq.true&select=desafio_id`
        );
        return logs.map(l => l.desafio_id);
    } catch (e) {
        console.error(e);
        return [];
    }
}

/**
 * Validate a flag submission.
 * Returns { exitoso: bool, mensaje: string, puntos?: number }
 */
async function validarFlag(username, desafioId, flagIngresada) {
    try {
        // 1. Get challenge
        const desafios = await _get(
            `desafios?id=eq.${encodeURIComponent(desafioId)}&select=flag,puntos,nombre`
        );
        if (desafios.length === 0)
            return { exitoso: false, mensaje: "Desafío no encontrado." };

        const { flag, puntos, nombre } = desafios[0];
        const correcto = flag.trim().toLowerCase() === flagIngresada.trim().toLowerCase();

        // 2. Log attempt
        await fetch(`${SUPABASE_URL}/rest/v1/logs_envios`, {
            method: 'POST',
            headers: { ..._h, "Prefer": "return=minimal" },
            body: JSON.stringify({
                username,
                desafio_id: desafioId,
                exitoso: correcto
            })
        });

        if (!correcto)
            return { exitoso: false, mensaje: "Flag incorrecta. Sigue intentando." };

        // 3. Check if already solved
        const previos = await _get(
            `logs_envios?username=eq.${encodeURIComponent(username)}&desafio_id=eq.${encodeURIComponent(desafioId)}&exitoso=eq.true&select=id&limit=2`
        );

        if (previos.length > 1) {
            // already solved before (the log above + 1 prior)
            return { exitoso: true, mensaje: "¡Flag correcta! (ya resuelto antes, sin puntos extra)", puntos: 0 };
        }

        // 4. Add points
        const [usuario] = await _get(
            `usuarios?username=eq.${encodeURIComponent(username)}&select=puntaje`
        );
        await _patch(
            `usuarios?username=eq.${encodeURIComponent(username)}`,
            { puntaje: usuario.puntaje + puntos }
        );

        return { exitoso: true, mensaje: `¡Flag correcta! +${puntos} pts — ${nombre}`, puntos };

    } catch (e) {
        console.error(e);
        return { exitoso: false, mensaje: "Error de conexión. Intenta de nuevo." };
    }
}

/**
 * Fetch a single user's data (score).
 */
async function obtenerUsuario(username) {
    try {
        const data = await _get(
            `usuarios?username=eq.${encodeURIComponent(username)}&select=username,puntaje,created_at`
        );
        return data[0] || null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

// ============================================================
//  SEED DATA HELPER — run once from browser console to
//  populate the desafios table:
//     seedDesafios()
// ============================================================
const CHALLENGES_SEED = [
    { id:"01", nombre:"Inspect Element",    categoria:"Web",      flag:"flag{html_comment_found}",     puntos:100 },
    { id:"02", nombre:"The Invisible",      categoria:"Web",      flag:"flag{css_oculto}",              puntos:100 },
    { id:"03", nombre:"Locked Out",         categoria:"Web",      flag:"flag{button_unlocked}",         puntos:100 },
    { id:"04", nombre:"Console Log",        categoria:"Web",      flag:"flag{console_is_your_friend}",  puntos:100 },
    { id:"05", nombre:"Cookie Jar",         categoria:"Web",      flag:"flag{admin_cookie_true}",       puntos:150 },
    { id:"06", nombre:"Local Vault",        categoria:"Web",      flag:"flag{localstorage_bypass}",     puntos:150 },
    { id:"07", nombre:"The Network",        categoria:"Web",      flag:"flag{x_secret_header}",         puntos:150 },
    { id:"08", nombre:"Bad Logic",          categoria:"Web",      flag:"flag{hardcoded_p4ssw0rd}",      puntos:150 },
    { id:"09", nombre:"CSS Content",        categoria:"Web",      flag:"flag{pseudo_element_secret}",   puntos:200 },
    { id:"10", nombre:"Obfuscation",        categoria:"Web",      flag:"flag{deobfuscated_js}",         puntos:200 },
    { id:"11", nombre:"Base64",             categoria:"Crypto",   flag:"flag{decodificado_b64}",        puntos:150 },
    { id:"12", nombre:"Caesar",             categoria:"Crypto",   flag:"flag{veni_vidi_vici}",          puntos:150 },
    { id:"13", nombre:"Binary",             categoria:"Crypto",   flag:"flag{binary_to_ascii}",         puntos:150 },
    { id:"14", nombre:"Hex",                categoria:"Crypto",   flag:"flag{hex_decoded_ok}",          puntos:150 },
    { id:"15", nombre:"Vigenère",           categoria:"Crypto",   flag:"flag{vigenere_cracked}",        puntos:200 },
    { id:"16", nombre:"Morse",              categoria:"Crypto",   flag:"flag{morse_decoded}",           puntos:150 },
    { id:"17", nombre:"JS Reverse",         categoria:"Crypto",   flag:"flag{reverse_engineered}",      puntos:250 },
    { id:"18", nombre:"The Robot",          categoria:"OSINT",    flag:"flag{robots_disallow}",         puntos:200 },
    { id:"19", nombre:"Wayback",            categoria:"OSINT",    flag:"flag{wayback_machine_found}",   puntos:200 },
    { id:"20", nombre:"Social Breadcrumbs", categoria:"OSINT",    flag:"flag{instagram_bio_found}",     puntos:200 },
    { id:"21", nombre:"Google Dork",        categoria:"OSINT",    flag:"flag{google_dork_master}",      puntos:250 },
    { id:"22", nombre:"EXIF Web",           categoria:"OSINT",    flag:"flag{exif_gps_coords}",         puntos:250 },
    { id:"23", nombre:"DNS Web",            categoria:"OSINT",    flag:"flag{dns_txt_record}",          puntos:250 },
    { id:"24", nombre:"ls -la",             categoria:"Terminal", flag:"flag{hidden_file_listed}",      puntos:250 },
    { id:"25", nombre:"cat",                categoria:"Terminal", flag:"flag{secret_file_read}",        puntos:250 },
    { id:"26", nombre:"grep",               categoria:"Terminal", flag:"flag{grep_found_password}",     puntos:250 },
    { id:"27", nombre:"Fake nmap",          categoria:"Terminal", flag:"flag{open_port_22_80_443}",     puntos:250 },
    { id:"28", nombre:"Directory",          categoria:"Terminal", flag:"flag{admin_backup_accessed}",   puntos:300 },
    { id:"29", nombre:"whoami",             categoria:"Terminal", flag:"flag{current_user_root}",       puntos:300 },
    { id:"30", nombre:"ssh",                categoria:"Terminal", flag:"flag{ssh_root_connected}",      puntos:350 },
];

async function seedDesafios() {
    console.log("Seeding challenges...");
    for (const ch of CHALLENGES_SEED) {
        try {
            await _post('desafios', ch);
            console.log(`✓ ${ch.id} — ${ch.nombre}`);
        } catch (e) {
            console.warn(`⚠ ${ch.id} — ${e.message}`);
        }
    }
    console.log("Done!");
}
