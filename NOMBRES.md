# Nombres oficiales del proyecto MaderaControl v1.0

Esta es la lista unica y oficial de nombres que se deben usar en todo el proyecto.
Si todos los integrantes respetan estos nombres, no habran incoherencias entre los
`.env`, los servicios de Railway, las URLs de Vercel y los archivos de codigo.

> Regla general: **todo en minusculas**, sin espacios, sin tildes, sin caracteres especiales.
> Las palabras se separan con guion medio (`-`) en URLs y nombres de servicios,
> y con guion bajo (`_`) dentro del codigo (variables SQL, env vars, etc.).

---

## 1. GITHUB

| Campo | Valor exacto |
|-------|--------------|
| Nombre del repositorio | `madera-control` |
| Visibilidad | `Public` |
| Descripcion del repo | `Sistema web de gestion de ventas - MaderaControl v1.0` |
| Branch principal | `main` |
| URL del repo | `https://github.com/TU_USUARIO/madera-control` |

### Nombres de las ramas (branches) por integrante

| Integrante | Branch |
|------------|--------|
| Cesar    | `main` (es el responsable, sube directo a main la primera vez) |
| Yarkoff  | `feature/yarkoff-auth` |
| Bruno    | `feature/bruno-inventario` |
| Miembro 4 | `feature/miembro4-ventas-bi-ia` |
| Miembro 5 | `feature/miembro5-frontend` |

### Mensajes de commit oficiales

| Integrante | Mensaje de commit |
|------------|-------------------|
| Cesar    | `feat: estructura base, schema de base de datos y configuracion del backend` |
| Yarkoff  | `feat: autenticacion JWT, middlewares y arquitectura en capas` |
| Bruno    | `feat: modulo de inventario y gestion de productos` |
| Miembro 4 | `feat: modulo de ventas, business intelligence y microservicio IA` |
| Miembro 5 | `feat: frontend React con modulos transaccional, BI e IA al 50%` |

---

## 2. RAILWAY (backend + base de datos + microservicio IA)

| Campo | Valor exacto |
|-------|--------------|
| Nombre del proyecto Railway | `madera-control` |
| Servicio de base de datos | `Postgres` (lo crea Railway automaticamente, **no lo renombres**) |
| Servicio del backend Node | `madera-control-backend` |
| Servicio del microservicio IA | `madera-control-ia` |
| Nombre logico de la base de datos | `railway` (es el nombre por defecto, no se cambia) |

### Subdominios publicos esperados (Railway los genera, los respetamos)

- Backend: `https://madera-control-backend.up.railway.app`
- IA: `https://madera-control-ia.up.railway.app`

> Si Railway te asigna un sufijo aleatorio (ej: `-production-abcd.up.railway.app`),
> usa el que te de. Lo unico que importa es que copies bien la URL en las variables
> de entorno de los otros servicios.

---

## 3. VERCEL (frontend)

| Campo | Valor exacto |
|-------|--------------|
| Nombre del proyecto Vercel | `madera-control` |
| Root Directory | `frontend` |
| URL publica esperada | `https://madera-control.vercel.app` |

---

## 4. VARIABLES DE ENTORNO (NOMBRES EXACTOS)

> Las variables son **case-sensitive**. Respeta mayusculas y minusculas tal cual.

### Backend Node.js (`backend/.env`)

```
PORT=3001
DATABASE_URL=postgresql://postgres:CONTRASENA@HOST:5432/railway
JWT_SECRET=maderacontrol2026secreto
FRONTEND_URL=https://madera-control.vercel.app
NODE_ENV=production
```

En **local** (durante desarrollo):

```
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/maderacontrol
JWT_SECRET=clavelocal2026
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Microservicio IA (`microservicio-ia/.env`)

```
BACKEND_URL=https://madera-control-backend.up.railway.app
PORT=8000
```

En **local**:

```
BACKEND_URL=http://localhost:3001
PORT=8000
```

### Frontend (`frontend/.env`)

```
VITE_API_URL=https://madera-control-backend.up.railway.app
VITE_IA_URL=https://madera-control-ia.up.railway.app
```

En **local**:

```
VITE_API_URL=http://localhost:3001
VITE_IA_URL=http://localhost:8000
```

> Importante: las variables del frontend **deben empezar con `VITE_`**, sino Vite las ignora.

---

## 5. BASE DE DATOS LOCAL (PostgreSQL en tu PC)

| Campo | Valor exacto |
|-------|--------------|
| Nombre de la base | `maderacontrol` |
| Usuario | `postgres` |
| Contrasena (durante instalacion) | `postgres` |
| Host | `localhost` |
| Puerto | `5432` |

> Asi queda: `postgresql://postgres:postgres@localhost:5432/maderacontrol`

---

## 6. NOMBRES DENTRO DEL CODIGO (no se cambian)

Estos nombres ya estan fijos en el codigo y los SQL. **No los modifiques**, todo el sistema depende de ellos.

### Tablas de la base de datos

`usuarios`, `productos`, `clientes`, `ventas`, `detalle_ventas`, `movimientos_inventario`

### Roles de usuario (campo `usuarios.rol`)

`gerente`, `vendedor`, `contador`

### Tipos de madera (campo `productos.tipo_madera`)

`eucalipto`, `varas`, `vigas`, `parantes`, `listones`, `otro`

### Tipos de comprobante (campo `ventas.tipo_comprobante`)

`boleta`, `factura`, `nota_venta`

### Formas de pago (campo `ventas.forma_pago`)

`efectivo`, `transferencia`, `yape`

### Estados de venta (campo `ventas.estado`)

`confirmada`, `anulada`

### Tipos de movimiento (campo `movimientos_inventario.tipo`)

`entrada`, `salida`

### Prefijos de comprobantes (los genera el backend automaticamente)

| Tipo | Prefijo | Ejemplo |
|------|---------|---------|
| Boleta | `B001` | `B001-00001` |
| Factura | `F001` | `F001-00001` |
| Nota de venta | `NV` | `NV-00001` |

---

## 7. USUARIOS DE PRUEBA

Estas son las credenciales que el sistema crea automaticamente al ejecutar
`002_datos_iniciales.sql`. **No las cambies en el SQL** (los hashes bcrypt ya estan generados).

| Rol | Email | Contrasena |
|-----|-------|------------|
| Gerente | `gerente@maderacontrol.com` | `admin123` |
| Vendedor | `vendedor@maderacontrol.com` | `vendedor123` |
| Contador | `contador@maderacontrol.com` | `contador123` |

---

## 8. PUERTOS

| Servicio | Puerto local | Puerto produccion |
|----------|--------------|-------------------|
| Backend Node | `3001` | El que asigne Railway (variable `$PORT`) |
| Microservicio IA | `8000` | El que asigne Railway (variable `$PORT`) |
| Frontend (Vite dev) | `5173` | El que asigne Vercel (no aplica) |
| PostgreSQL local | `5432` | El que asigne Railway |

---

## 9. NOMBRE DE LA EMPRESA Y EL SISTEMA

| Lugar | Nombre exacto |
|-------|---------------|
| Sistema | `MaderaControl v1.0` |
| Empresa | `Inversiones y Transportes Cesar y Diana EIRL` |
| Eslogan / abreviacion | `MaderaControl` |

---

## 10. RESUMEN VISUAL: COMO SE CONECTA TODO

```
                       https://madera-control.vercel.app
                                  (Vercel)
                                     |
                                     | VITE_API_URL
                                     v
            https://madera-control-backend.up.railway.app
                                (Railway - Node.js)
                                     |
                  +------------------+------------------+
                  |                                     |
                  v                                     v
              DATABASE_URL                         BACKEND_URL
                  |                                     |
                  v                                     v
          PostgreSQL (Railway)         https://madera-control-ia.up.railway.app
              base "railway"                       (Railway - FastAPI)
                                                         ^
                                                         |
                                                         | VITE_IA_URL
                                                         |
                                                  Frontend Vercel
```

---

## 11. CHECKLIST RAPIDO ANTES DE DESPLEGAR

- [ ] El repo en GitHub se llama `madera-control` y es publico.
- [ ] La rama principal es `main`.
- [ ] El proyecto Railway se llama `madera-control`.
- [ ] El servicio de Postgres existe y se ejecutaron los dos archivos SQL en orden.
- [ ] El backend en Railway tiene Root Directory = `backend`.
- [ ] El microservicio IA tiene Root Directory = `microservicio-ia`.
- [ ] El frontend en Vercel tiene Root Directory = `frontend`.
- [ ] Las variables de entorno tienen los nombres exactos (case-sensitive) de la seccion 4.
- [ ] `FRONTEND_URL` del backend apunta a la URL real de Vercel (no a `localhost`).
- [ ] `VITE_API_URL` y `VITE_IA_URL` del frontend apuntan a las URLs reales de Railway.
- [ ] `BACKEND_URL` del microservicio IA apunta al backend Node de Railway.
