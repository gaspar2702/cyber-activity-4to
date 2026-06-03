# CyberCTF — Actividad de Ciberseguridad 4to Medio

Plataforma de 30 desafíos CTF para estudiantes de 4to medio.
Hosting estático en **GitHub Pages** + base de datos en **Supabase**.

---

## Estructura de Archivos

```
/
├── index.html         Login de operadores
├── dashboard.html     Panel principal + lista de 30 desafíos
├── leaderboard.html   Tabla de clasificación global (auto-refresco 30s)
├── terminal.html      Emulador de terminal Linux (desafíos 24–30)
├── style.css          Hoja de estilos (tema terminal / hacker)
├── api.js             Cliente REST para Supabase + datos de los 30 desafíos
└── robots.txt         Para desafío OSINT #18 y clave Vigenère #15
```

---

## Setup en Supabase (hacer una vez)

### 1. Crear las tablas

Ejecuta este SQL en **Supabase → SQL Editor**:

```sql
-- Tabla de usuarios
create table if not exists usuarios (
  id          uuid primary key default gen_random_uuid(),
  username    text unique not null,
  puntaje     int4 not null default 0,
  created_at  timestamptz default now()
);

-- Tabla de desafíos
create table if not exists desafios (
  id        text primary key,
  nombre    text not null,
  categoria text not null,
  flag      text not null,
  puntos    int4 not null
);

-- Tabla de logs de envíos
create table if not exists logs_envios (
  id          int8 generated always as identity primary key,
  username    text,
  desafio_id  text,
  exitoso     bool,
  timestamp   timestamptz default now()
);
```

### 2. Configurar Row Level Security (RLS)

```sql
-- Habilitar RLS en todas las tablas
alter table usuarios    enable row level security;
alter table desafios    enable row level security;
alter table logs_envios enable row level security;

-- Policies para la anon key (acceso público de solo lectura + escritura controlada)
create policy "anon read usuarios"    on usuarios    for select using (true);
create policy "anon insert usuarios"  on usuarios    for insert with check (true);
create policy "anon update usuarios"  on usuarios    for update using (true);

create policy "anon read desafios"    on desafios    for select using (true);

create policy "anon insert logs"      on logs_envios for insert with check (true);
create policy "anon read logs"        on logs_envios for select using (true);
```

### 3. Poblar la tabla de desafíos

Abre el sitio desplegado y en la consola del navegador (F12) ejecuta:

```javascript
seedDesafios()
```

Esto inserta los 30 desafíos con sus flags y puntajes.

### 4. Actualizar credenciales en api.js

```javascript
const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_KEY = "TU-ANON-KEY";
```

---

## Deploy en GitHub Pages

1. Sube todos los archivos al repositorio.
2. Ve a **Settings → Pages → Source: main / (root)**.
3. El sitio queda en `https://[usuario].github.io/[repo]/`.
4. Agrega `robots.txt` en la raíz (ya incluido).

---

## Desafíos por Categoría

| Cat | IDs | Pts c/u |
|-----|-----|---------|
| Web | 01–10 | 100–200 |
| Crypto | 11–17 | 150–250 |
| OSINT | 18–23 | 200–250 |
| Terminal | 24–30 | 250–350 |

**Puntaje máximo total: 5,950 pts**

---

## Notas para el Profesor

- Las flags están almacenadas en Supabase. Puedes cambiarlas desde el dashboard de Supabase.
- El archivo `api.js` contiene `CHALLENGES_SEED` con todas las flags y puntos — modifícalos antes del evento.
- El terminal simulado es completamente client-side, no hay servidor real.
- El leaderboard se actualiza automáticamente cada 30 segundos.
- Para resetear el puntaje de un alumno: `UPDATE usuarios SET puntaje = 0 WHERE username = 'nombre'`.
