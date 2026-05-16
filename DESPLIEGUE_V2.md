# MaderaControl v2.0 — Guia de despliegue del 50% restante

Esta guia aplica los cambios del 50% restante sobre el proyecto ya desplegado.
Los pasos son secuenciales: SQL primero, luego codigo, luego smoke tests.

## Archivos nuevos / modificados

### Backend

- `backend/.env.example` (sin cambios respecto a v1)
- `backend/src/app.js` *(modificado)*: registra `/api/descuentos`
- `backend/src/services/ventas.service.js` *(reescrito)*
- `backend/src/controllers/ventas.controller.js` *(reescrito)*
- `backend/src/routes/ventas.routes.js` *(reescrito)*
- `backend/src/services/descuentos.service.js` *(nuevo)*
- `backend/src/controllers/descuentos.controller.js` *(nuevo)*
- `backend/src/routes/descuentos.routes.js` *(nuevo)*
- `backend/src/services/reportes.service.js` *(modificado)*
- `backend/src/controllers/reportes.controller.js` *(modificado)*
- `backend/src/routes/reportes.routes.js` *(modificado)*

### Frontend

- `frontend/src/api/ventas.api.js` *(modificado)*
- `frontend/src/api/descuentos.api.js` *(nuevo)*
- `frontend/src/api/reportes.api.js` *(modificado)*
- `frontend/src/pages/Transaccional/NuevaVenta.jsx` *(reescrito)*
- `frontend/src/pages/Transaccional/ListaVentas.jsx` *(reescrito)*
- `frontend/src/pages/Transaccional/ProgramacionRecojo.jsx` *(nuevo)*
- `frontend/src/pages/Inventario/Descuentos.jsx` *(nuevo)*
- `frontend/src/pages/BI/Dashboard.jsx` *(modificado)*
- `frontend/src/components/layout/Sidebar.jsx` *(modificado)*
- `frontend/src/components/layout/MainLayout.jsx` *(modificado)*
- `frontend/src/router/AppRouter.jsx` *(modificado)*

### Base de datos

- `database/migrations/003_v2_funcionalidades.sql` *(nuevo)*

---

## PASO 1 — Aplicar migracion SQL en Railway

1. Abre **pgAdmin** y conectate a la BD `railway` con `DATABASE_PUBLIC_URL`.
2. Clic derecho en `railway` -> **Query Tool**.
3. Abre con Bloc de notas:
   `C:\Proyectos\Claude-pr\madera-control\parte-1-cesar\database\migrations\003_v2_funcionalidades.sql`
4. Selecciona todo (Ctrl+A), copia (Ctrl+C), pega en pgAdmin (Ctrl+V) y presiona **F5**.
5. Debe ejecutarse sin errores (la migracion es idempotente: usa `IF NOT EXISTS`).
6. Verificacion:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'ventas' AND column_name IN
     ('motivo_anulacion','tipo_entrega','fecha_recojo','descuento_total');
   SELECT * FROM descuentos_volumen;
   ```
   La primera consulta debe devolver 4 filas; la segunda, 3 reglas de descuento.

## PASO 2 — Consolidar y subir el codigo

Sigues teniendo el repo clonado en `C:\repos\madera-control-fix` (o lo clonas
desde cero a una carpeta limpia).

### 2.1 Clonar fresco (recomendado)

```bash
cd /c/repos
rm -rf madera-control-v2
git clone https://github.com/TU_USUARIO/madera-control.git madera-control-v2
cd madera-control-v2
git checkout -b feature/v2-funcionalidades
```

### 2.2 Re-ejecutar el script de consolidacion

Igual que antes, parado dentro del repo clonado:

```bash
mkdir -p backend/src/middlewares backend/src/routes backend/src/controllers backend/src/services frontend microservicio-ia && \
cp -r parte-2-yarkoff/backend/src/middlewares/. backend/src/middlewares/ && \
cp -r parte-2-yarkoff/backend/src/routes/. backend/src/routes/ && \
cp -r parte-2-yarkoff/backend/src/controllers/. backend/src/controllers/ && \
cp -r parte-2-yarkoff/backend/src/services/. backend/src/services/ && \
cp -r parte-3-bruno/backend/src/routes/. backend/src/routes/ && \
cp -r parte-3-bruno/backend/src/controllers/. backend/src/controllers/ && \
cp -r parte-3-bruno/backend/src/services/. backend/src/services/ && \
cp -r parte-4-miembro4/backend/src/routes/. backend/src/routes/ && \
cp -r parte-4-miembro4/backend/src/controllers/. backend/src/controllers/ && \
cp -r parte-4-miembro4/backend/src/services/. backend/src/services/ && \
cp -r parte-4-miembro4/microservicio-ia/. microservicio-ia/ && \
cp -r parte-5-miembro5/frontend/. frontend/ && \
echo "OK: consolidacion completa"
```

### 2.3 Aplicar los cambios v2

Como las carpetas `parte-X` locales en tu PC ya tienen los archivos v2
(los acabo de modificar), el script anterior copia las versiones nuevas
a `/backend`, `/frontend`, `/microservicio-ia`.

Pero el repo clonado en `/c/repos/madera-control-v2/parte-X` aun tiene la
version vieja. Hay que reemplazar las carpetas `parte-X` locales por las
de tu PC ANTES de correr el script.

**La forma simple es:**

```bash
# Borrar las parte-X del repo clonado y reemplazarlas por las tuyas
rm -rf parte-1-cesar parte-2-yarkoff parte-3-bruno parte-4-miembro4 parte-5-miembro5

cp -r /c/Proyectos/Claude-pr/madera-control/parte-1-cesar .
cp -r /c/Proyectos/Claude-pr/madera-control/parte-2-yarkoff .
cp -r /c/Proyectos/Claude-pr/madera-control/parte-3-bruno .
cp -r /c/Proyectos/Claude-pr/madera-control/parte-4-miembro4 .
cp -r /c/Proyectos/Claude-pr/madera-control/parte-5-miembro5 .
```

Y luego corres de nuevo el script de consolidacion del paso 2.2.

### 2.4 Push

```bash
git add .
git commit -m "feat: 50% restante v2 - descuentos, recojo, anulacion motivada, n-tier"
git push origin feature/v2-funcionalidades
```

### 2.5 Crear y mergear el PR en GitHub

1. Entra a tu repo en GitHub.
2. Banner amarillo -> **Compare & pull request**.
3. Titulo: `feat: v2.0 - 50% restante (descuentos, recojo, anulacion auditada)`
4. **Create pull request** -> **Merge pull request** -> **Confirm merge**.

Railway redespliega backend y microservicio IA. Vercel redespliega el frontend.

## PASO 3 — Smoke tests post-deploy

### Backend (5 min)
- `GET /api/health` -> 200 con `db_time`
- `GET /api/descuentos` (con JWT) -> array con las 3 reglas seed
- `POST /api/ventas/previsualizar` con `items: [{producto_id:1, cantidad:60}]`
  -> debe devolver `descuento_total` > 0

### Frontend (10 min)
1. **Login como gerente** -> Dashboard con 5 KPIs (incluye "Recojos pendientes").
2. **Nueva Venta**:
   - Consulta RUC, agrega 60 unidades de Eucalipto 3m.
   - Debe verse el descuento -10% en la fila del carrito.
   - Cambia "Recojo inmediato" a "Recojo programado" -> aparecen los campos de fecha.
   - Confirma -> modal muestra `descuento_total` aplicado.
3. **Historial de Ventas** -> abre la venta recien creada -> abajo aparece el
   boton **Anular venta**.
4. Anular: escribe el motivo (>= 5 caracteres) -> Confirmar.
   La venta vuelve a la lista con badge rojo "Anulada" y el detalle muestra
   `Motivo`, `Anulada por` y `Fecha de anulacion`.
5. **Programacion de Recojo**: registra otra venta con recojo programado,
   luego ve a esta pagina y marca "listo" -> "entregado".
6. **Descuentos por Volumen** (solo gerente): crea una regla nueva al 8%
   para tipo "vigas" con minimo 5 unidades.
7. **Login como vendedor** -> debe poder anular pero NO ver "Descuentos".
8. **Login como contador** -> ve Dashboard pero NO ve Nueva Venta ni anular.

### Microservicio IA (1 min)
- `/api/ia/prediccion/stock-critico` con JWT -> array sin error 401.
- Pagina "Prediccion IA" en el frontend carga la tabla.

---

## Si algo falla

| Error                                          | Causa probable | Fix |
|-----------------------------------------------|----------------|-----|
| `column "motivo_anulacion" does not exist`    | Migracion no aplicada | Ejecuta 003 en pgAdmin |
| Boton "Registrar Venta" deshabilitado en gris | Cliente, carrito o entrega invalidos | Mira el mensaje en amarillo arriba del boton |
| `403 Forbidden` al anular                      | Logueado como contador | Cierra sesion, entra como vendedor/gerente |
| Anulacion dice "motivo obligatorio"            | Texto < 5 caracteres | Escribe al menos 5 caracteres |
| Recojo programado dice "fecha no puede ser pasada" | El minimo es +15 min | Pon una fecha futura |
| Backend logs: `relation "descuentos_volumen" does not exist` | Migracion no aplicada | Ejecuta 003 en pgAdmin |

---

## Resumen de cambios v2

- **3 funcionalidades nuevas**: descuentos por volumen, programacion de recojo,
  anulacion auditada con motivo.
- **1 bug fix**: el boton "Registrar Venta" ahora muestra explicitamente que
  falta (cliente / carrito / fecha de recojo / direccion de entrega) y
  solo se deshabilita por `loading` o validacion explicita.
- **5 nuevos endpoints**: `/api/descuentos` (CRUD), `/api/ventas/recojos`,
  `/api/ventas/:id/entrega`, `/api/ventas/previsualizar`,
  `/api/reportes/ventas-por-forma-pago`.
- **2 nuevas paginas**: Programacion de Recojo, Descuentos por Volumen.
- **Dashboard ampliado**: 5 KPIs (incluye recojos pendientes) + grafico de
  ventas por forma de pago + KPI de descuentos otorgados.
- **Arquitectura N-Tier documentada** en `ARQUITECTURA.md`.
