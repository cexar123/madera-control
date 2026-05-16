# MaderaControl v1.0

Sistema web de gestión de ventas para la empresa maderera peruana **Inversiones y Transportes Cesar y Diana EIRL**.

## Descripción del proyecto

MaderaControl v1.0 es una plataforma integral que digitaliza la operación comercial de una maderera: registro de ventas con generación automática de comprobantes (boleta, factura, nota de venta), control de inventario en tiempo real, panel de Business Intelligence con indicadores clave y un microservicio de Inteligencia Artificial que predice cuándo se quedará sin stock cada producto.

El sistema está dividido en tres módulos principales, todos desarrollados al 50% de avance para esta primera entrega:

1. **Módulo Transaccional**: registro de ventas, gestión de inventario y generación de comprobantes.
2. **Módulo Business Intelligence**: dashboard con KPIs, gráficos y reportes.
3. **Módulo Inteligente (IA)**: microservicio en FastAPI que estima la demanda semanal y genera alertas de reabastecimiento.

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite + TailwindCSS + Recharts + React Router |
| Backend | Node.js + Express + PostgreSQL (pg) + JWT + bcrypt |
| Microservicio IA | Python 3.12 + FastAPI + Uvicorn + NumPy + httpx |
| Base de datos | PostgreSQL 15 (Railway) |
| Despliegue | Railway (backend + BD + IA) y Vercel (frontend) |
| Control de versiones | Git + GitHub |

## Integrantes del equipo

| Integrante | Parte | Módulo asignado |
|------------|-------|-----------------|
| Cesar | parte-1-cesar | Base del proyecto, schema de base de datos y configuración |
| Yarkoff | parte-2-yarkoff | Autenticación JWT, middlewares y estructura de capas |
| Bruno | parte-3-bruno | Módulo Transaccional: inventario y productos |
| Miembro 4 | parte-4-miembro4 | Módulo Ventas, BI (reportes) y Microservicio IA |
| Miembro 5 | parte-5-miembro5 | Frontend completo con los 3 módulos al 50% |

## Correr el proyecto localmente

### 1. Base de datos

Instala PostgreSQL, crea una base `maderacontrol` y ejecuta en orden:

```bash
psql -U postgres -d maderacontrol -f database/migrations/001_crear_tablas.sql
psql -U postgres -d maderacontrol -f database/migrations/002_datos_iniciales.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # edita los valores
npm install
npm run dev
```

El backend queda disponible en `http://localhost:3001`.

### 3. Frontend y microservicio IA

Consulta los `README` de `parte-5-miembro5/frontend` y `parte-4-miembro4/microservicio-ia`.

## Repositorio

Repo oficial del proyecto (se actualizará al momento de crear el repo en GitHub):

```
https://github.com/USUARIO/madera-control
```

## Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Gerente | gerente@maderacontrol.com | admin123 |
| Vendedor | vendedor@maderacontrol.com | vendedor123 |
| Contador | contador@maderacontrol.com | contador123 |
