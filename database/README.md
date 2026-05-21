# Base de datos — MaderaControl

Esta carpeta contiene los scripts SQL del schema de PostgreSQL. Corresponde a la
**Capa 4 (datos)** de la arquitectura N-Tier descrita en
[../ARQUITECTURA.md](../ARQUITECTURA.md).

## Migraciones

Aplicar en orden:

| Archivo | Descripción |
|---------|-------------|
| `migrations/001_crear_tablas.sql` | Crea las 6 tablas core con sus constraints e índices. |
| `migrations/002_datos_iniciales.sql` | Inserta usuarios de prueba, 10 productos madereros, 3 clientes y 5 ventas de los últimos 30 días. |
| `migrations/003_v2_funcionalidades.sql` | Agrega columnas y tabla v2 (anulación con motivo, programación de recojo, descuentos por volumen). Idempotente. |

## Tablas

1. **usuarios** — gerente, vendedor y contador (passwords con bcrypt).
2. **productos** — catálogo de madera con stock y precio.
3. **clientes** — clientes con RUC peruano.
4. **ventas** — cabecera de cada venta (boleta / factura / nota_venta).
5. **detalle_ventas** — líneas de cada venta.
6. **movimientos_inventario** — bitácora de entradas y salidas.
7. **descuentos_volumen** *(v2)* — reglas de descuento por cantidad.

## Cómo ejecutar

### En Railway

1. Entra al servicio PostgreSQL del proyecto.
2. Pestaña **Data → Query** (o usa pgAdmin con `DATABASE_PUBLIC_URL`).
3. Pega y ejecuta cada archivo en orden: 001, 002, 003.

### En local con psql

```bash
psql -U postgres -d maderacontrol -f database/migrations/001_crear_tablas.sql
psql -U postgres -d maderacontrol -f database/migrations/002_datos_iniciales.sql
psql -U postgres -d maderacontrol -f database/migrations/003_v2_funcionalidades.sql
```

## Credenciales generadas

| Rol | Email | Password |
|-----|-------|----------|
| Gerente | gerente@maderacontrol.com | admin123 |
| Vendedor | vendedor@maderacontrol.com | vendedor123 |
| Contador | contador@maderacontrol.com | contador123 |

## Reiniciar la base de datos

Si necesitas borrar todo y empezar de cero:

```sql
DROP TABLE IF EXISTS movimientos_inventario CASCADE;
DROP TABLE IF EXISTS detalle_ventas CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS descuentos_volumen CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
```

Luego vuelve a ejecutar 001, 002 y 003.
