# MaderaControl

Sistema web de gestión de ventas para **Inversiones y Transportes Cesar y Diana EIRL**, empresa maderera peruana. Digitaliza el ciclo completo: ventas con emisión automática de comprobantes (boleta / factura / nota de venta), control de inventario en tiempo real, dashboard de Business Intelligence y un microservicio de IA que predice cuándo se agotará el stock de cada producto.

## Arquitectura N-Tier

El proyecto está organizado en **4 capas** + un microservicio independiente. La separación es estricta: cada capa solo conoce a la inmediatamente inferior. Detalle completo en [ARQUITECTURA.md](ARQUITECTURA.md).

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA 1 — Presentación        frontend/                     │
│  React + Vite + Tailwind + React Router + Axios             │
│  pages · components · hooks · context · router · api        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS + JWT
┌────────────────────────▼────────────────────────────────────┐
│  CAPA 2 — Lógica de negocio   backend/src/                  │
│  Node.js + Express                                          │
│  routes/  →  controllers/  →  middlewares/                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  CAPA 3 — Acceso a datos      backend/src/services + config │
│  services/ (SQL parametrizado, transacciones)               │
│  config/db.js (pool pg, SSL automático en producción)       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  CAPA 4 — Datos               database/migrations/          │
│  PostgreSQL  ·  7 tablas  ·  3 migraciones                  │
└─────────────────────────────────────────────────────────────┘

      ┌───────────────────────────────────────────────────┐
      │  Microservicio independiente   microservicio-ia/  │
      │  Python + FastAPI + NumPy (regresión lineal,      │
      │  MA ponderada, predicción de stockout).           │
      │  Consulta al backend por HTTP reenviando el JWT.  │
      └───────────────────────────────────────────────────┘
```

### Reglas que el código respeta

1. Un **route** solo declara endpoints y aplica middlewares. Delega al controller.
2. Un **controller** valida la request y orquesta. Nunca toca la base de datos.
3. Un **service** es el único que ejecuta SQL y aplica reglas de negocio.
4. El **frontend** nunca accede a la base; siempre vía REST.
5. El **microservicio IA** nunca accede a la base; consulta al backend por HTTP.

## Estructura del repositorio

```
madera-control/
├── ARQUITECTURA.md           Doc maestro de las 4 capas
├── DESPLIEGUE.md             Checklist de deploy a Railway + Vercel
├── NOMBRES.md                Nombres oficiales (env vars, servicios, tablas)
├── SETUP_EXTERNO.md          Setup de cuentas externas
│
├── backend/                  Capas 2 y 3
│   └── src/
│       ├── app.js
│       ├── config/db.js
│       ├── routes/           7 módulos: auth, productos, inventario,
│       ├── controllers/         ventas, clientes, reportes, descuentos
│       ├── services/
│       └── middlewares/      verifyToken, requireRole, errorHandler
│
├── microservicio-ia/         Microservicio FastAPI
│   ├── main.py
│   ├── routers/  services/  models/
│   ├── Procfile  railway.json
│
├── frontend/                 Capa 1 (React + Vite)
│   └── src/
│       ├── api/              clientes axios (interceptor JWT)
│       ├── pages/            Login, Transaccional, Inventario, BI, IA, Clientes
│       ├── components/       layout + ui reutilizable
│       ├── context/  hooks/  router/
│
└── database/                 Capa 4 (PostgreSQL)
    └── migrations/           001 → 002 → 003
```

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite + TailwindCSS + Recharts + React Router |
| Backend | Node.js + Express + PostgreSQL (pg) + JWT + bcrypt |
| Microservicio IA | Python 3.13 + FastAPI + Uvicorn + NumPy + httpx |
| Base de datos | PostgreSQL 16 |
| Despliegue | Railway (backend + IA + Postgres) · Vercel (frontend) |

## Despliegue en producción

Sistema en aire en:

- Frontend → https://madera-control.vercel.app
- Backend → https://madera-control-production.up.railway.app
- Microservicio IA → https://extraordinary-warmth-production-53ac.up.railway.app

Guía paso a paso para reproducir el deploy en [DESPLIEGUE.md](DESPLIEGUE.md).

## Correr el proyecto localmente

### 1. Base de datos (PostgreSQL local)

```bash
psql -U postgres -d maderacontrol -f database/migrations/001_crear_tablas.sql
psql -U postgres -d maderacontrol -f database/migrations/002_datos_iniciales.sql
psql -U postgres -d maderacontrol -f database/migrations/003_v2_funcionalidades.sql
```

### 2. Backend (`http://localhost:3001`)

```bash
cd backend
cp .env.example .env       # editar DATABASE_URL, JWT_SECRET
npm install
npm run dev
```

### 3. Microservicio IA (`http://localhost:8000`)

```bash
cd microservicio-ia
cp .env.example .env       # editar BACKEND_URL
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Frontend (`http://localhost:5173`)

```bash
cd frontend
cp .env.example .env       # editar VITE_API_URL, VITE_IA_URL
npm install
npm run dev
```

Login de prueba: `gerente@maderacontrol.com / admin123`.

## Equipo

| Integrante | Módulo |
|------------|--------|
| Cesar | Estructura base, schema de base de datos y configuración |
| Yarkoff | Autenticación JWT, middlewares y arquitectura en capas |
| Bruno | Inventario y productos |
| William | Ventas, BI (reportes) y Microservicio IA |
| Luis | Frontend completo (transaccional, BI, IA, clientes) |
