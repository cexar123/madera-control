# MaderaControl v2.0 — Arquitectura N-Tier

Sistema unificado bajo arquitectura **N-Tier (4 capas)** con un microservicio
independiente de Inteligencia Artificial.

## Vision general de capas

```
                                                          (Cliente Web)
                                                                |
                                                                v
+----------------------- CAPA 1: PRESENTACION -------------------------+
| Frontend React (Vercel)                                              |
|   - pages/         Pantallas (Login, NuevaVenta, ListaVentas, ...)   |
|   - components/    UI reutilizable (Button, Modal, Sidebar, ...)     |
|   - hooks/         useAuth, useProductos, useVentas                  |
|   - context/       AuthContext (sesion JWT)                          |
|   - router/        AppRouter (rutas + RoleRoute)                     |
|   - api/           Clientes axios (interceptores JWT y 401)          |
+---------------------------------------------------------------------+
                                                                |
                                                                v
+----------------------- CAPA 2: LOGICA DE NEGOCIO --------------------+
| Backend Node.js / Express (Railway)                                  |
|   - routes/        Definen endpoints y aplican middlewares           |
|                       verifyToken + requireRole(rol1, rol2, ...)     |
|   - controllers/   Validan request, orquestan, arman response        |
|   - middlewares/   auth.middleware, roles.middleware, errorHandler   |
+---------------------------------------------------------------------+
                                                                |
                                                                v
+----------------------- CAPA 3: ACCESO A DATOS -----------------------+
| Backend Node.js / Express (Railway)                                  |
|   - services/      Reglas de negocio + SQL parametrizado             |
|                       Transacciones BEGIN/COMMIT/ROLLBACK            |
|                       FOR UPDATE para concurrencia segura            |
|   - config/db.js   Pool de conexiones PostgreSQL                     |
+---------------------------------------------------------------------+
                                                                |
                                                                v
+----------------------- CAPA 4: BASE DE DATOS ------------------------+
| PostgreSQL (Railway)                                                 |
|   - 6 tablas core: usuarios, productos, clientes,                    |
|                    ventas, detalle_ventas, movimientos_inventario    |
|   - 1 tabla v2:    descuentos_volumen                                |
|   - Columnas v2:   motivo_anulacion, fecha_recojo, descuento_total,  |
|                    tipo_entrega, estado_entrega, ...                 |
+---------------------------------------------------------------------+

                              (Microservicio independiente)
                                          |
                                          v
            +----- MICROSERVICIO IA (FastAPI / Railway) -----+
            | routers/    HTTP endpoints (recibe JWT)        |
            | services/   Motor de prediccion (NumPy)        |
            | models/     Schemas Pydantic                   |
            |    -- Consulta al backend via HTTP --          |
            +-------------------------------------------------+
```

## Reglas de la arquitectura

1. **Un route NUNCA contiene logica de negocio**. Solo registra el endpoint,
   aplica los middlewares y delega al controller.
2. **Un controller NUNCA habla directo con la base de datos**. Siempre va al service.
3. **Un service es el unico que ejecuta SQL** y aplica las reglas de negocio.
4. **El frontend NUNCA accede a la base de datos**. Siempre via la API REST del backend.
5. **El microservicio IA NUNCA accede a la base de datos**. Consulta al backend via HTTP,
   reenviando el JWT del usuario que origino la peticion.

## Flujo de una venta

```
React (NuevaVenta.jsx)
    --> POST /api/ventas con JWT en Authorization
        --> ventas.routes.js   (verifyToken + requireRole vendedor/gerente)
            --> ventas.controller.js  (valida payload)
                --> ventas.service.js (BEGIN)
                      1. SELECT FOR UPDATE de productos (bloqueo)
                      2. Validacion de stock
                      3. Aplicacion de descuentos por volumen
                      4. Generacion de numero correlativo
                      5. Calculo de IGV (no aplica a nota_venta)
                      6. INSERT en ventas
                      7. INSERT en detalle_ventas (por item)
                      8. UPDATE productos.stock_actual
                      9. INSERT en movimientos_inventario
                    --> COMMIT (o ROLLBACK si algo falla)
                --> response 201 con la venta
        <-- 201 Created
    <-- Modal de exito + numero de comprobante
```

## Reglas de negocio implementadas (v2)

- Stock nunca puede quedar negativo (lock `FOR UPDATE` + chequeo dentro de la TX).
- IGV 18% solo aplica a `boleta` y `factura`. `nota_venta` no lleva IGV.
- Descuentos por volumen se aplican automaticamente al monto de cada linea segun
  la cantidad y el tipo de madera (tabla `descuentos_volumen`).
- Numeracion de comprobantes correlativa y unica por tipo:
  `B001-00001`, `F001-00001`, `NV-00001`.
- Anulacion de venta requiere **motivo (>= 5 caracteres)** y queda auditada
  (`motivo_anulacion`, `anulada_por_usuario_id`, `anulada_at`).
- Anular restituye el stock y registra movimientos `entrada` con el motivo.
- Una venta anulada queda en `estado_entrega = 'no_aplica'`.
- Solo `gerente` modifica precios y configura descuentos.
- `vendedor` y `gerente` pueden anular ventas y actualizar entregas.
- Tipos de entrega:
  - `recojo_inmediato`: el cliente se lleva la madera al instante.
    `estado_entrega` queda `entregado` desde el registro.
  - `recojo_programado`: requiere `fecha_recojo` futura.
  - `delivery`: requiere `direccion_entrega`.
- El microservicio IA recibe el JWT del usuario y lo reenvia al backend para
  preservar la seguridad de los endpoints protegidos.

## Permisos por rol

| Modulo                      | Gerente | Vendedor | Contador |
|-----------------------------|:-------:|:--------:|:--------:|
| Dashboard BI                | si      |          | si       |
| Prediccion IA               | si      |          |          |
| Nueva Venta                 | si      | si       |          |
| Historial de Ventas         | si      | si       | si       |
| Anular Venta (con motivo)   | si      | si       |          |
| Programacion de Recojo      | si      | si       |          |
| Productos (lectura)         | si      | si       | si       |
| Productos (editar precio)   | si      |          |          |
| Entrada manual de stock     | si      |          |          |
| Descuentos por volumen      | si      |          |          |
| Clientes                    | si      | si       | si       |
| Movimientos de inventario   | si      | si       | si       |

## Funcionalidades cubiertas (alcance v2)

- Registro de Ventas con descuentos automaticos
- Emision de Comprobantes (Nota de Venta / Boleta / Factura)
- Gestion de Formas de Pago (Efectivo / Transferencia / Yape)
- **Programacion de Recojo (recojo inmediato / programado / delivery)**
- **Gestion de Precios y Descuentos por Volumen**
- Control de Stock por Tipo y Tamano de Madera
- Registro de Entradas de Madera (manual del gerente)
- Registro de Salidas de Madera (auto desde ventas)
- **Anulacion auditada con motivo (vendedor / gerente)**
- Dashboard con Graficos Visuales (KPIs + barras + torta + forma de pago)
- Reportes de Ventas por Periodo (Dia / Semana / Mes)
- Reporte de Productos Mas Vendidos
- Reporte de Ingresos Totales (subtotal, IGV, descuentos, ticket promedio)
- Prediccion IA de Stock (microservicio FastAPI)
- Integracion SUNAT (via decolecta.com) con fallback manual
