# Base de datos - MaderaControl v1.0

Autor: Cesar

Esta carpeta contiene los scripts SQL del schema de PostgreSQL.

## Archivos

| Archivo | Descripcion |
|---------|-------------|
| `migrations/001_crear_tablas.sql` | Crea las 6 tablas del sistema con sus constraints e indices. |
| `migrations/002_datos_iniciales.sql` | Inserta usuarios de prueba, 10 productos madereros, 3 clientes y 5 ventas de los ultimos 30 dias. |

## Tablas

1. **usuarios** - gerente, vendedor y contador (con bcrypt).
2. **productos** - catalogo de madera con stock y precio.
3. **clientes** - clientes con RUC peruano.
4. **ventas** - cabecera de cada venta (boleta / factura / nota_venta).
5. **detalle_ventas** - lineas de cada venta.
6. **movimientos_inventario** - bitacora de entradas y salidas.

## Como ejecutar

### En Railway

1. Entra al servicio PostgreSQL del proyecto.
2. Pestana **Data > Query**.
3. Pega el contenido de `001_crear_tablas.sql` y ejecuta.
4. Pega el contenido de `002_datos_iniciales.sql` y ejecuta.

### En local con psql

```bash
psql -U postgres -d maderacontrol -f database/migrations/001_crear_tablas.sql
psql -U postgres -d maderacontrol -f database/migrations/002_datos_iniciales.sql
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
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
```

Luego vuelve a ejecutar 001 y 002.
