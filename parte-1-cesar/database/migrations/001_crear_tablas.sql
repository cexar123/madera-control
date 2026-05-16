-- Autor: Cesar
-- MaderaControl v1.0 - Schema inicial de base de datos PostgreSQL
-- Empresa: Inversiones y Transportes Cesar y Diana EIRL
-- Crea las 6 tablas del sistema: usuarios, productos, clientes,
-- ventas, detalle_ventas y movimientos_inventario.

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('gerente','vendedor','contador')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    tipo_madera VARCHAR(50) NOT NULL
        CHECK (tipo_madera IN ('eucalipto','varas','vigas','parantes','listones','otro')),
    dimension VARCHAR(50),
    unidad_medida VARCHAR(20) DEFAULT 'unidad',
    precio_unitario DECIMAL(10,2) NOT NULL,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 5,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    ruc VARCHAR(11),
    razon_social VARCHAR(200) NOT NULL,
    direccion VARCHAR(200),
    telefono VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    numero_comprobante VARCHAR(20) UNIQUE NOT NULL,
    tipo_comprobante VARCHAR(20) NOT NULL
        CHECK (tipo_comprobante IN ('boleta','factura','nota_venta')),
    cliente_id INTEGER REFERENCES clientes(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    subtotal DECIMAL(10,2) NOT NULL,
    igv DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    forma_pago VARCHAR(20) NOT NULL
        CHECK (forma_pago IN ('efectivo','transferencia','yape')),
    estado VARCHAR(20) DEFAULT 'confirmada'
        CHECK (estado IN ('confirmada','anulada')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE detalle_ventas (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id),
    producto_id INTEGER REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL
);

CREATE TABLE movimientos_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada','salida')),
    cantidad INTEGER NOT NULL,
    motivo VARCHAR(200),
    usuario_id INTEGER REFERENCES usuarios(id),
    referencia_venta_id INTEGER REFERENCES ventas(id) NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_productos_tipo ON productos(tipo_madera);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_ventas_created_at ON ventas(created_at);
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_detalle_venta ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_producto ON detalle_ventas(producto_id);
CREATE INDEX idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_movimientos_created_at ON movimientos_inventario(created_at);
