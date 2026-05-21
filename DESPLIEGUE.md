# MaderaControl — Despliegue a producción

Guía para desplegar el repositorio **unificado** (carpetas `backend/`,
`microservicio-ia/`, `frontend/`, `database/` en la raíz).

Si todavía trabajas con las carpetas `parte-X-*` originales, mira primero
[README.md](README.md) — el código ya fue consolidado.

## Stack de producción

| Componente        | Plataforma | Carpeta del repo    |
|-------------------|------------|---------------------|
| Frontend          | Vercel     | `frontend/`         |
| Backend Node      | Railway    | `backend/`          |
| Microservicio IA  | Railway    | `microservicio-ia/` |
| Base de datos     | Railway    | `database/migrations/` (se aplican manualmente) |

Los nombres exactos de proyecto, servicios y variables están en [NOMBRES.md](NOMBRES.md).

---

## Paso 0 — Subir el repo a GitHub

```bash
cd c:/Proyectos/Claude-pr/madera-control
git init
git add .
git commit -m "feat: estructura unificada n-tier"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/madera-control.git
git push -u origin main
```

El `.gitignore` raíz ya excluye `node_modules/`, `.env`, `dist/`, `__pycache__/`,
etc. Los archivos `.env` locales **no se suben**; solo se suben los `.env.example`.

---

## Paso 1 — PostgreSQL en Railway

1. Railway → nuevo proyecto → **+ New** → **Database** → **PostgreSQL**.
2. Copiar `DATABASE_URL` (pestaña Variables del servicio Postgres).
3. Abrir **pgAdmin** (o cualquier cliente SQL) y conectar usando `DATABASE_PUBLIC_URL`.
4. Ejecutar en orden, de este repo:
   ```
   database/migrations/001_crear_tablas.sql
   database/migrations/002_datos_iniciales.sql
   database/migrations/003_v2_funcionalidades.sql
   ```
5. Verificar:
   ```sql
   SELECT COUNT(*) FROM usuarios;          -- 3
   SELECT COUNT(*) FROM descuentos_volumen; -- 3
   ```

---

## Paso 2 — Backend Node en Railway

1. Railway → mismo proyecto → **+ New** → **GitHub Repo** → seleccionar `madera-control`.
2. **Settings → Root Directory**: `backend`
3. **Settings → Build**: detecta Node automáticamente (Nixpacks). El `railway.json`
   ya define `startCommand: npm start` y `healthcheckPath: /api/health`.
4. **Variables** (Settings → Variables, copiar tal cual):

   | Variable       | Valor |
   |----------------|-------|
   | `DATABASE_URL` | (referencia) `${{Postgres.DATABASE_URL}}` |
   | `JWT_SECRET`   | una cadena larga aleatoria (cambia la del `.env.example`) |
   | `FRONTEND_URL` | URL del frontend en Vercel (paso 4) — se rellena después |
   | `NODE_ENV`     | `production` |
   | `PORT`         | (no setear — Railway la inyecta) |

5. **Deploy** → esperar a que el healthcheck `/api/health` quede en verde.
6. Copiar la URL pública del servicio (algo como
   `https://madera-control-backend-production-xxxx.up.railway.app`).

> El pool `pg` ya activa SSL automáticamente cuando `NODE_ENV=production`
> ([backend/src/config/db.js:8-16](backend/src/config/db.js#L8-L16)).

---

## Paso 3 — Microservicio IA en Railway

1. Railway → mismo proyecto → **+ New** → **GitHub Repo** → mismo repo.
2. **Settings → Root Directory**: `microservicio-ia`
3. Railway detecta Python con Nixpacks. El `Procfile` y `railway.json` definen
   `uvicorn main:app --host 0.0.0.0 --port $PORT`.
4. **Variables**:

   | Variable      | Valor |
   |---------------|-------|
   | `BACKEND_URL` | URL pública del backend del paso 2 |
   | `PORT`        | (no setear — Railway la inyecta) |

5. **Deploy** → esperar a que `/health` responda 200.

---

## Paso 4 — Frontend en Vercel

1. [vercel.com](https://vercel.com) → **Add New… → Project** → importar `madera-control`.
2. **Root Directory**: `frontend`
3. Framework: **Vite** (auto-detectado). Build command `npm run build`, output `dist`.
   El `vercel.json` ya configura el rewrite SPA `/(.*)` → `/index.html` para
   que las rutas de React Router funcionen al hacer F5.
4. **Environment Variables**:

   | Variable        | Valor |
   |-----------------|-------|
   | `VITE_API_URL`  | URL del backend del paso 2 |
   | `VITE_IA_URL`   | URL del microservicio IA del paso 3 |

5. **Deploy** → copiar la URL pública (algo como `https://madera-control.vercel.app`).
6. Volver a Railway → backend → editar variable `FRONTEND_URL` con esa URL → redeploy.
   Esto habilita CORS desde el dominio real.

---

## Paso 5 — Smoke tests post-deploy

Sustituye las URLs por las tuyas.

```bash
# Backend vivo
curl https://TU-BACKEND.up.railway.app/api/health
# -> {"status":"ok","db_time":"..."}

# Login real contra la BD
curl -X POST https://TU-BACKEND.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gerente@maderacontrol.com","password":"admin123"}'
# -> {"token":"eyJhbGc...","user":{...}}

# Microservicio IA vivo
curl https://TU-IA.up.railway.app/health
# -> {"status":"ok"}
```

Frontend: abrir `https://TU-FRONTEND.vercel.app`, entrar con
`gerente@maderacontrol.com / admin123`, revisar Dashboard, Nueva Venta,
Programación de Recojo, Descuentos y Predicción IA.

Checklist funcional detallada:
1. Login como gerente → Dashboard con 5 KPIs (incluye "Recojos pendientes").
2. Nueva Venta: agrega 60 unidades de Eucalipto 3m, verifica que aplique el
   descuento -10%. Cambia a "Recojo programado" → aparecen los campos de fecha.
3. Historial de Ventas: abre una venta → botón **Anular**. Motivo debe ser
   >= 5 caracteres. Tras anular: badge rojo "Anulada" y auditoría visible.
4. Programación de Recojo: marca una venta como "listo" → "entregado".
5. Descuentos por Volumen (solo gerente): crea una regla nueva.
6. Login como vendedor → puede anular, NO ve "Descuentos".
7. Login como contador → ve Dashboard, NO ve Nueva Venta.
8. Página "Predicción IA" → carga la tabla sin error 401.

---

## Problemas comunes

| Síntoma | Causa | Fix |
|---|---|---|
| Backend `503` o crashea | `DATABASE_URL` mal pegada / falta `?sslmode=require` (Railway ya lo gestiona vía SSL del pool) | Verificar variable en Railway |
| Frontend muestra "Network Error" al hacer login | `VITE_API_URL` apunta a `localhost` | Re-deploy de Vercel con la URL real del backend |
| CORS bloquea el login desde Vercel | `FRONTEND_URL` del backend sigue siendo `http://localhost:5173` | Editar variable en Railway → redeploy backend |
| `relation "descuentos_volumen" does not exist` | Migración 003 no aplicada en la BD de Railway | Ejecutar `003_v2_funcionalidades.sql` con pgAdmin |
| Microservicio IA `401` al consultar al backend | El token JWT no se está reenviando | Revisar el header `Authorization` en `microservicio-ia/services/` |
| Vercel devuelve 404 al refrescar una ruta interna | Falta el rewrite SPA | Confirmar que `frontend/vercel.json` está commiteado |

---

## Archivos clave para el despliegue

- [.gitignore](.gitignore) — excluye `.env` y `node_modules`
- [backend/.env.example](backend/.env.example) · [backend/railway.json](backend/railway.json)
- [microservicio-ia/.env.example](microservicio-ia/.env.example) · [microservicio-ia/Procfile](microservicio-ia/Procfile) · [microservicio-ia/railway.json](microservicio-ia/railway.json)
- [frontend/.env.example](frontend/.env.example) · [frontend/vercel.json](frontend/vercel.json)
- [database/migrations/](database/migrations/) — los 3 SQL en orden
