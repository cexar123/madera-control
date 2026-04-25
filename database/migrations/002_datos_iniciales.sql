-- Autor: Cesar
-- MaderaControl v1.0 - Datos iniciales para pruebas y demos
-- Ejecutar DESPUES de 001_crear_tablas.sql
-- Inserta usuarios, productos madereros peruanos, clientes y ventas
-- de los ultimos 30 dias para que el dashboard BI tenga datos reales.

-- =====================================================
-- USUARIOS (passwords hasheados con bcrypt rounds=10)
-- gerente@maderacontrol.com   / admin123
-- vendedor@maderacontrol.com  / vendedor123
-- contador@maderacontrol.com  / contador123
-- =====================================================
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
('Willan Verde Loyola', 'gerente@maderacontrol.com',
    '$2b$10$IC.dlE5/nFoAm0mWoMEDY.psaSGVdW4p2FXaUw5ohblSL9AgWB7BS', 'gerente'),
('Diana Ramirez Vega', 'vendedor@maderacontrol.com',
    '$2b$10$r3Wn.lFDWFmyhbtaA/mw6OA06ufrLhl2cyMjMLKE36vEH/THTbbne', 'vendedor'),
('Lucia Torres Quispe', 'contador@maderacontrol.com',
    '$2b$10$NQqyiD6TLfMLULL3EHWJFeOriXYnDWnwIf69zKqHKwtZboh.mro6C', 'contador');

-- =====================================================
-- PRODUCTOS MADEREROS (precios en soles peruanos)
-- =====================================================
INSERT INTO productos (nombre, tipo_madera, dimension, unidad_medida, precio_unitario, stock_actual, stock_minimo) VALUES
('Eucalipto 3m',  'eucalipto', '3 metros',   'unidad',   8.50, 150, 20),
('Eucalipto 6m',  'eucalipto', '6 metros',   'unidad',  15.00,  80, 15),
('Varas 2m',      'varas',     '2 metros',   'unidad',   5.00, 200, 30),
('Varas 4m',      'varas',     '4 metros',   'unidad',   9.00, 120, 25),
('Vigas 6m',      'vigas',     '6 metros',   'unidad',  45.00,  40, 10),
('Vigas 8m',      'vigas',     '8 metros',   'unidad',  58.00,  25,  8),
('Parantes 2.5m', 'parantes',  '2.5 metros', 'unidad',  12.00,  90, 20),
('Listones 4m',   'listones',  '4 metros',   'unidad',  18.00,  60, 15),
('Tablones 3m',   'otro',      '3 metros',   'unidad',  22.00,  35, 10),
('Rollizos 4m',   'otro',      '4 metros',   'unidad',  30.00,  20,  8);

-- =====================================================
-- CLIENTES (RUC peruano ficticio - 11 digitos)
-- =====================================================
INSERT INTO clientes (ruc, razon_social, direccion, telefono) VALUES
('20512345678', 'Constructora Andina SAC',          'Av. Los Pinos 145, Lima',        '987654321'),
('20587654321', 'Maderera del Sur EIRL',            'Jr. Cusco 220, Arequipa',         '976543210'),
('10456789012', 'Carpinteria San Jose',             'Calle Real 88, Huancayo',         '965432109');

-- =====================================================
-- VENTAS DE LOS ULTIMOS 30 DIAS
-- =====================================================

-- Venta 1: hace 28 dias - Constructora Andina (factura)
INSERT INTO ventas (numero_comprobante, tipo_comprobante, cliente_id, usuario_id, subtotal, igv, total, forma_pago, estado, created_at)
VALUES ('F001-00001', 'factura', 1, 2, 720.00, 129.60, 849.60, 'transferencia', 'confirmada', NOW() - INTERVAL '28 days');

INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
(1, 5, 10, 45.00, 450.00),
(1, 8, 15, 18.00, 270.00);

INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo, usuario_id, referencia_venta_id, created_at) VALUES
(5, 'salida', 10, 'Venta F001-00001', 2, 1, NOW() - INTERVAL '28 days'),
(8, 'salida', 15, 'Venta F001-00001', 2, 1, NOW() - INTERVAL '28 days');

-- Venta 2: hace 20 dias - Maderera del Sur (factura)
INSERT INTO ventas (numero_comprobante, tipo_comprobante, cliente_id, usuario_id, subtotal, igv, total, forma_pago, estado, created_at)
VALUES ('F001-00002', 'factura', 2, 2, 1450.00, 261.00, 1711.00, 'transferencia', 'confirmada', NOW() - INTERVAL '20 days');

INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
(2, 6, 20, 58.00, 1160.00),
(2, 2, 30, 5.00, 150.00),
(2, 7, 12, 12.00, 144.00);

INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo, usuario_id, referencia_venta_id, created_at) VALUES
(6, 'salida', 20, 'Venta F001-00002', 2, 2, NOW() - INTERVAL '20 days'),
(2, 'salida', 30, 'Venta F001-00002', 2, 2, NOW() - INTERVAL '20 days'),
(7, 'salida', 12, 'Venta F001-00002', 2, 2, NOW() - INTERVAL '20 days');

-- Venta 3: hace 12 dias - Carpinteria San Jose (boleta)
INSERT INTO ventas (numero_comprobante, tipo_comprobante, cliente_id, usuario_id, subtotal, igv, total, forma_pago, estado, created_at)
VALUES ('B001-00001', 'boleta', 3, 2, 425.00, 76.50, 501.50, 'efectivo', 'confirmada', NOW() - INTERVAL '12 days');

INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
(3, 1, 25, 8.50, 212.50),
(3, 4, 15, 9.00, 135.00),
(3, 9, 4, 22.00, 88.00);

INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo, usuario_id, referencia_venta_id, created_at) VALUES
(1, 'salida', 25, 'Venta B001-00001', 2, 3, NOW() - INTERVAL '12 days'),
(4, 'salida', 15, 'Venta B001-00001', 2, 3, NOW() - INTERVAL '12 days'),
(9, 'salida', 4,  'Venta B001-00001', 2, 3, NOW() - INTERVAL '12 days');

-- Venta 4: hace 5 dias - Constructora Andina (factura)
INSERT INTO ventas (numero_comprobante, tipo_comprobante, cliente_id, usuario_id, subtotal, igv, total, forma_pago, estado, created_at)
VALUES ('F001-00003', 'factura', 1, 2, 905.00, 162.90, 1067.90, 'transferencia', 'confirmada', NOW() - INTERVAL '5 days');

INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
(4, 2, 40, 5.00, 200.00),
(4, 10, 10, 30.00, 300.00),
(4, 5, 9, 45.00, 405.00);

INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo, usuario_id, referencia_venta_id, created_at) VALUES
(2,  'salida', 40, 'Venta F001-00003', 2, 4, NOW() - INTERVAL '5 days'),
(10, 'salida', 10, 'Venta F001-00003', 2, 4, NOW() - INTERVAL '5 days'),
(5,  'salida', 9,  'Venta F001-00003', 2, 4, NOW() - INTERVAL '5 days');

-- Venta 5: hace 1 dia - Maderera del Sur (boleta - yape)
INSERT INTO ventas (numero_comprobante, tipo_comprobante, cliente_id, usuario_id, subtotal, igv, total, forma_pago, estado, created_at)
VALUES ('B001-00002', 'boleta', 2, 2, 360.00, 64.80, 424.80, 'yape', 'confirmada', NOW() - INTERVAL '1 day');

INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
(5, 7, 20, 12.00, 240.00),
(5, 8, 5, 18.00, 90.00),
(5, 1, 4, 8.50, 30.00);

INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo, usuario_id, referencia_venta_id, created_at) VALUES
(7, 'salida', 20, 'Venta B001-00002', 2, 5, NOW() - INTERVAL '1 day'),
(8, 'salida', 5,  'Venta B001-00002', 2, 5, NOW() - INTERVAL '1 day'),
(1, 'salida', 4,  'Venta B001-00002', 2, 5, NOW() - INTERVAL '1 day');

-- Ajustar stock_actual segun los movimientos de salida realizados
UPDATE productos SET stock_actual = stock_actual - 25 - 4 WHERE id = 1;
UPDATE productos SET stock_actual = stock_actual - 30 - 40 WHERE id = 2;
UPDATE productos SET stock_actual = stock_actual - 15 WHERE id = 4;
UPDATE productos SET stock_actual = stock_actual - 10 - 9 WHERE id = 5;
UPDATE productos SET stock_actual = stock_actual - 20 WHERE id = 6;
UPDATE productos SET stock_actual = stock_actual - 12 - 20 WHERE id = 7;
UPDATE productos SET stock_actual = stock_actual - 15 - 5 WHERE id = 8;
UPDATE productos SET stock_actual = stock_actual - 4 WHERE id = 9;
UPDATE productos SET stock_actual = stock_actual - 10 WHERE id = 10;
