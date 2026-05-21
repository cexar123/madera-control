# Setup Externo - MaderaControl v1.0

Esta guia explica paso a paso como configurar todos los servicios externos
necesarios para que el sistema funcione: GitHub, Railway (backend + base de datos +
microservicio IA) y Vercel (frontend).

---

## 1. GITHUB - Crear el repositorio

1. Entra a `github.com` e inicia sesion.
2. Clic en **"New repository"** (boton verde arriba a la derecha).
3. Llena los campos:
   - Nombre: `madera-control`
   - Descripcion: `Sistema web de gestion de ventas - MaderaControl v1.0`
   - Selecciona **Public**.
   - **NO** marques "Add README" (ya tienes uno).
4. Clic en **"Create repository"**.
5. Copia la URL del repo, la vas a necesitar mas adelante.

### Subir el codigo inicial (lo hace Cesar)

Abre Git Bash en la raíz del proyecto:

```bash
git init
git add .
git commit -m "feat: estructura base y schema de base de datos"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/madera-control.git
git push -u origin main
```

### Agregar a los colaboradores

1. Ve al repositorio en GitHub.
2. Pestana **Settings** -> **Collaborators**.
3. Clic en **"Add people"**.
4. Busca el usuario de GitHub de cada integrante.
5. Selecciona el rol **"Write"**.
6. Cada integrante recibira un correo para aceptar la invitacion.

---

## 2. RAILWAY - Base de datos PostgreSQL y Backend

### Crear cuenta

1. Entra a `railway.app`.
2. Registrate con tu cuenta de GitHub.
3. Clic en **"New Project"**.

### Crear la base de datos PostgreSQL

1. Clic en **"Add a service"** -> **"Database"** -> **"PostgreSQL"**.
2. Railway crea automaticamente una BD vacia.
3. Haz clic en el servicio de la BD que se creo.
4. Pestana **"Variables"** -> copia el valor de `DATABASE_URL`. Lo necesitas para el backend.
5. Pestana **"Data" -> "Query"** -> ejecuta los SQL en orden:
   - Pega el contenido de `database/migrations/001_crear_tablas.sql` y clic en **Run Query**.
   - Pega el contenido de `database/migrations/002_datos_iniciales.sql` y clic en **Run Query**.

### Desplegar el backend Node.js

1. En el mismo proyecto -> **"Add a service"** -> **"GitHub Repo"**.
2. Selecciona el repositorio `madera-control`.
3. Railway detecta automaticamente que es Node.js.
4. Pestana **"Variables"** del servicio backend -> agrega:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | (el que copiaste de la BD) |
| `JWT_SECRET` | cualquier texto largo aleatorio, ej: `maderacontrol2026secreto` |
| `PORT` | `3001` |
| `FRONTEND_URL` | (lo agregas despues cuando tengas la URL de Vercel) |
| `NODE_ENV` | `production` |

5. Pestana **"Settings"**:
   - **Root Directory:** `backend`
   - **Start Command:** `node src/app.js`
6. Clic en **Deploy**.
7. Copia la URL publica de Railway (ej: `https://madera-control-backend.up.railway.app`).

### Desplegar el microservicio FastAPI (IA)

1. **"Add a service"** -> **"GitHub Repo"** -> mismo repositorio.
2. Pestana **"Settings"**:
   - **Root Directory:** `microservicio-ia`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Pestana **"Variables"**:

| Variable | Valor |
|----------|-------|
| `BACKEND_URL` | URL del backend Node.js de Railway |
| `PORT` | `8000` |

4. Clic en **Deploy**.
5. Copia la URL del microservicio.

---

## 3. VERCEL - Frontend React

1. Entra a `vercel.com` y registrate con GitHub.
2. Clic en **"New Project"**.
3. Importa el repositorio `madera-control`.
4. **Root Directory:** `frontend`.
5. Vercel detecta Vite automaticamente.
6. **Environment Variables**:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | URL del backend Node.js (ej: `https://madera-control-backend.up.railway.app`) |
| `VITE_IA_URL` | URL del microservicio FastAPI |

7. Clic en **Deploy**.
8. Copia la URL de Vercel (ej: `https://madera-control.vercel.app`).
9. **Vuelve a Railway** y actualiza la variable `FRONTEND_URL` del backend con esta URL.

---

## 4. ORDEN CORRECTO DE DESPLIEGUE

Sigue este orden para que todo funcione bien:

1. Crear la BD en Railway y ejecutar los SQL.
2. Desplegar el backend Node.js en Railway.
3. Desplegar el frontend en Vercel.
4. Actualizar `FRONTEND_URL` en Railway con la URL de Vercel.
5. Desplegar el microservicio IA en Railway.
6. Actualizar `VITE_IA_URL` en Vercel con la URL del microservicio (y redeploy del frontend).

---

## 5. VERIFICAR QUE TODO FUNCIONA

### Backend
Entra a `https://TU-BACKEND.up.railway.app/api/health` en el navegador. Debes ver un JSON con `status: "ok"`.

Para probar el login, usa Postman o Insomnia con un POST a `/api/auth/login`:

```json
{
  "email": "gerente@maderacontrol.com",
  "password": "admin123"
}
```

Debe retornar un token JWT.

### Frontend
Entra a la URL de Vercel, inicia sesion con las credenciales de prueba.
Si ves el sidebar y el dashboard, todo esta bien.

### Microservicio IA
Entra a `https://TU-IA.up.railway.app/docs`. FastAPI genera una documentacion automatica donde puedes probar los endpoints.

---

## 6. BASE DE DATOS - Instrucciones detalladas en Railway

### PASO A PASO PARA CREAR LA BASE DE DATOS EN RAILWAY

1. Entra a `railway.app` e inicia sesion con GitHub.
2. Clic en **"New Project"** -> **"Add a service"** -> **"Database"** -> **"PostgreSQL"**.
   Railway crea automaticamente una base de datos PostgreSQL vacia.
3. Haz clic en el servicio de PostgreSQL que se creo.
   Ve a la pestana **"Data"** -> **"Query"**. Aqui puedes ejecutar SQL directamente desde el navegador.
4. Ejecuta primero el archivo `001_crear_tablas.sql`:
   - Abre el archivo desde tu computadora con el Bloc de notas.
   - Selecciona todo el texto (Ctrl+A) y copialo (Ctrl+C).
   - Pegalo en el editor de Query de Railway (Ctrl+V).
   - Clic en el boton **"Run Query"**.
   - Debes ver `CREATE TABLE` repetido 6 veces sin errores.
5. Ejecuta luego el archivo `002_datos_iniciales.sql`:
   - Mismos pasos: abrir con Bloc de notas, copiar, pegar, Run Query.
   - Debes ver `INSERT` varias veces sin errores.
6. Verifica que las tablas se crearon correctamente:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

Debes ver las 6 tablas: `usuarios, productos, clientes, ventas, detalle_ventas, movimientos_inventario`.

7. Verifica que los datos iniciales estan cargados:

```sql
SELECT nombre, email, rol FROM usuarios;
SELECT nombre, stock_actual, precio_unitario FROM productos;
```

Debes ver 3 usuarios y 10 productos.

8. Obten la cadena de conexion:
   Ve a la pestana **"Variables"** del servicio PostgreSQL.
   Copia el valor de `DATABASE_URL`. Se ve asi:
   `postgresql://postgres:password@host.railway.app:5432/railway`
   Guardala, la necesitas para el backend.

### SI ALGO FALLA AL EJECUTAR EL SQL

**Error "already exists":** las tablas ya fueron creadas antes. Ejecuta esto para borrar todo y empezar de cero:

```sql
DROP TABLE IF EXISTS movimientos_inventario CASCADE;
DROP TABLE IF EXISTS detalle_ventas CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
```

Luego vuelve a ejecutar 001 y 002.

**Error "permission denied":** Railway a veces tarda en dar permisos. Espera 2 minutos y vuelve a intentar.

**Error en los INSERT de 002_datos_iniciales.sql:** ejecuta solo el 001 primero y verifica que funcione, luego ejecuta el 002.

### CONEXION LOCAL (para desarrollo en tu PC)

Si quieres probar el backend en tu computadora antes de subir a Railway:

1. Instala PostgreSQL desde `postgresql.org`. Durante la instalacion pon contrasena: `postgres`.
2. Abre **pgAdmin** (se instala junto con PostgreSQL).
3. Clic derecho en **"Databases"** -> **"Create"** -> **"Database"**. Nombre: `maderacontrol`.
4. Clic derecho en la base `maderacontrol` -> **"Query Tool"**. Pega y ejecuta `001_crear_tablas.sql`, luego `002_datos_iniciales.sql`.
5. En el archivo `backend/.env` (haz una copia de `.env.example`):

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/maderacontrol
JWT_SECRET=clavelocal123
PORT=3001
FRONTEND_URL=http://localhost:5173
```

6. Para correr el backend:

```bash
cd backend
npm install
npm run dev
```

7. Para correr el frontend:

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173` en el navegador.

---

## 7. INSTALACION DE HERRAMIENTAS EN LA PC

### INSTALAR NODE.JS Y NPM

Node.js es el programa que corre el backend. NPM viene incluido automaticamente con Node.js.

1. Entra a `nodejs.org`.
2. Descarga la version que dice **"LTS"** (la recomendada). En 2026 es la version 20.x.
3. Abre el instalador descargado.
4. Siguiente -> Siguiente -> Siguiente -> Instalar. **No cambies ninguna opcion**, dejalo todo por defecto.
5. Al terminar, reinicia tu computadora.
6. Verifica que se instalo correctamente. Abre el simbolo del sistema (busca "cmd" en el inicio) y escribe:

```
node --version
npm --version
```

Debes ver algo como `v20.x.x` y `10.x.x`.

### INSTALAR GIT

Git es el programa para subir codigo a GitHub.

1. Entra a `git-scm.com/downloads`.
2. Descarga la version para Windows.
3. Abre el instalador.
4. Siguiente en todo hasta que aparezca **"Choosing the default editor"**. Ahi selecciona **"Use Notepad as Git's default editor"**. En todo lo demas deja la opcion que ya esta marcada.
5. Siguiente -> Siguiente -> Instalar.
6. Verifica que se instalo. Busca **"Git Bash"** en el inicio y abrelo. Escribe:

```
git --version
```

Debes ver algo como `git version 2.x.x`.

7. Configura tu nombre y correo (usa los mismos de tu cuenta GitHub):

```bash
git config --global user.name "Tu Nombre Completo"
git config --global user.email "tu-correo@gmail.com"
```

### INSTALAR PYTHON (solo para el microservicio IA)

Solo necesita hacerlo el integrante que trabaja con el microservicio FastAPI. Los demas pueden saltarse esta seccion.

1. Entra a `python.org/downloads`.
2. Descarga **Python 3.12.x**.
3. Abre el instalador.
   **MUY IMPORTANTE:** marca la casilla que dice **"Add Python to PATH"** antes de hacer clic en Install.
   Si no marcas eso, Python no va a funcionar desde la terminal.
4. Clic en **"Install Now"**.
5. Verifica que se instalo. Abre cmd y escribe:

```
python --version
pip --version
```

Debes ver `Python 3.12.x` y `pip 24.x`.

6. Para instalar las dependencias del microservicio:

```
cd ruta\donde\clonaste\madera-control\microservicio-ia
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Veras que la terminal ahora dice `(venv)` al inicio.

7. Para correr el microservicio:

```
uvicorn main:app --reload --port 8000
```

Abre `http://localhost:8000/docs` en el navegador. Debes ver la documentacion automatica de FastAPI.

### INSTALAR VISUAL STUDIO CODE (editor de codigo recomendado)

No es obligatorio, pero es muy util para revisar los archivos.

1. Entra a `code.visualstudio.com`.
2. Descarga la version para Windows.
3. Instala con todas las opciones por defecto. Marca la casilla **"Add to PATH"** si aparece.
4. Extensiones recomendadas para instalar dentro de VSCode:
   - ESLint
   - Prettier
   - PostgreSQL (de Chris Kolkman)
   - Python (de Microsoft)
   - GitLens

   Para instalarlas: clic en el icono de cuadraditos del lado izquierdo, busca el nombre y clic en **Install**.

### CORRER EL PROYECTO COMPLETO EN LOCAL

Una vez instalado todo, sigue este orden:

#### PASO 1 - Clona el repositorio

Abre Git Bash y escribe:

```bash
git clone https://github.com/TU_USUARIO/madera-control.git
cd madera-control
```

#### PASO 2 - Configura el backend

```bash
cd backend
npm install
copy .env.example .env
```

Abre `.env` con el Bloc de notas y completa los valores:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/maderacontrol
JWT_SECRET=clavelocal2026
PORT=3001
FRONTEND_URL=http://localhost:5173
```

Guarda el archivo y corre el backend:

```bash
npm run dev
```

Debes ver en la terminal:
- `Servidor corriendo en puerto 3001`
- `Conectado a PostgreSQL`

Deja esta terminal abierta.

#### PASO 3 - Configura el frontend

Abre una **nueva terminal** (sin cerrar la del backend):

```bash
cd madera-control\frontend
npm install
copy .env.example .env
```

Abre `.env` y escribe:

```
VITE_API_URL=http://localhost:3001
VITE_IA_URL=http://localhost:8000
```

Corre el frontend:

```bash
npm run dev
```

Debes ver `Local: http://localhost:5173`. Abre esa URL en el navegador.

#### PASO 4 - Configura el microservicio IA (opcional en local)

Abre una **nueva terminal**:

```
cd madera-control\microservicio-ia
python -m venv venv
venv\Scripts\activate
copy .env.example .env
```

Abre `.env` y escribe:

```
BACKEND_URL=http://localhost:3001
PORT=8000
```

Instala dependencias y corre:

```
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### PASO 5 - Verifica que todo funciona

Abre `http://localhost:5173` en el navegador. Inicia sesion con:

- **Email:** `gerente@maderacontrol.com`
- **Contrasena:** `admin123`

Si ves el dashboard, todo esta funcionando correctamente.

### ERRORES COMUNES AL INSTALAR

**"npm no se reconoce como comando":**
Node.js no se instalo correctamente o no se agrego al PATH. Desinstala Node.js desde el Panel de Control y vuelve a instalarlo. Despues de instalar, reinicia la PC y vuelve a intentar.

**"Cannot find module":**
Olvidaste ejecutar `npm install`. Ve a la carpeta del backend o frontend y ejecutalo.

**"Error de conexion a PostgreSQL":**
Verifica que PostgreSQL este corriendo en tu PC. Abre el panel de servicios de Windows (`services.msc`), busca "postgresql" y verifica que diga **"En ejecucion"**. Si no, clic derecho -> Iniciar.

**"Port 3001 already in use":**
Hay otro programa usando ese puerto. Cambia `PORT=3002` en el `.env` del backend y actualiza `VITE_API_URL=http://localhost:3002` en el frontend.

**"python no se reconoce como comando":**
Olvidaste marcar **"Add Python to PATH"** al instalar. Desinstala Python y vuelve a instalarlo marcando esa casilla.

**"EACCES permission denied" en `npm install`:**
Cierra la terminal y abrela como administrador (clic derecho en Git Bash -> **"Ejecutar como administrador"**).
