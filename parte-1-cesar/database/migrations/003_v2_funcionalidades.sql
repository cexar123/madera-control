-- Autor: Cesar (consolidado)
-- MaderaControl v2.0 - Funcionalidades adicionales (50% restante)
-- Migracion NO destructiva: solo agrega columnas y tablas nuevas.
-- Ejecutar DESPUES de 001 y 002.

-- =====================================================
-- 1. ANULACION CON MOTIVO (auditoria de anulaciones)
-- =====================================================
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT,
  ADD COLUMN IF NOT EXISTS anulada_por_usuario_id INTEGER REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS anulada_at TIMESTAMP;

-- =====================================================
-- 2. PROGRAMACION DE RECOJO / ENTREGA
-- =====================================================
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS tipo_entrega VARCHAR(30) DEFAULT 'recojo_inmediato',
  ADD COLUMN IF NOT EXISTS fecha_recojo TIMESTAMP,
  ADD COLUMN IF NOT EXISTS direccion_entrega VARCHAR(250),
  ADD COLUMN IF NOT EXISTS contacto_entrega VARCHAR(100),
  ADD COLUMN IF NOT EXISTS estado_entrega VARCHAR(20) DEFAULT 'entregado',
  ADD COLUMN IF NOT EXISTS entregada_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS observaciones_entrega TEXT;

-- Constraints (idempotentes)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_tipo_entrega_check') THEN
    ALTER TABLE ventas ADD CONSTRAINT ventas_tipo_entrega_check
      CHECK (tipo_entrega IN ('recojo_inmediato','recojo_programado','delivery'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_estado_entrega_check') THEN
    ALTER TABLE ventas ADD CONSTRAINT ventas_estado_entrega_check
      CHECK (estado_entrega IN ('pendiente','listo','en_camino','entregado','no_aplica'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ventas_estado_entrega ON ventas(estado_entrega);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_recojo ON ventas(fecha_recojo);

-- =====================================================
-- 3. DESCUENTOS POR VOLUMEN
-- =====================================================
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS descuento_total DECIMAL(10,2) DEFAULT 0;

ALTER TABLE detalle_ventas
  ADD COLUMN IF NOT EXISTS descuento_unitario DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS porcentaje_descuento DECIMAL(5,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS descuentos_volumen (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo_madera VARCHAR(50),
  cantidad_minima INTEGER NOT NULL CHECK (cantidad_minima > 0),
  porcentaje_descuento DECIMAL(5,2) NOT NULL CHECK (porcentaje_descuento >= 0 AND porcentaje_descuento <= 50),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT descuentos_tipo_madera_check
    CHECK (tipo_madera IS NULL OR tipo_madera IN ('eucalipto','varas','vigas','parantes','listones','otro'))
);

CREATE INDEX IF NOT EXISTS idx_descuentos_activo ON descuentos_volumen(activo);
CREATE INDEX IF NOT EXISTS idx_descuentos_tipo ON descuentos_volumen(tipo_madera);

-- Seed inicial: tres escalones de descuento que aplican a todos los productos
INSERT INTO descuentos_volumen (nombre, tipo_madera, cantidad_minima, porcentaje_descuento)
SELECT * FROM (VALUES
  ('Descuento 10+ unidades', NULL::VARCHAR, 10, 5.00::DECIMAL),
  ('Descuento 50+ unidades', NULL::VARCHAR, 50, 10.00::DECIMAL),
  ('Descuento 100+ unidades', NULL::VARCHAR, 100, 15.00::DECIMAL)
) AS v(nombre, tipo_madera, cantidad_minima, porcentaje_descuento)
WHERE NOT EXISTS (SELECT 1 FROM descuentos_volumen);

-- =====================================================
-- 4. NORMALIZACION DE VENTAS EXISTENTES
-- =====================================================
-- Las ventas previas se consideran 'recojo_inmediato' ya entregadas
UPDATE ventas
SET tipo_entrega = 'recojo_inmediato',
    estado_entrega = 'entregado',
    entregada_at = COALESCE(entregada_at, created_at)
WHERE tipo_entrega IS NULL OR estado_entrega IS NULL;

UPDATE ventas SET descuento_total = COALESCE(descuento_total, 0);
UPDATE detalle_ventas SET descuento_unitario = COALESCE(descuento_unitario, 0),
                          porcentaje_descuento = COALESCE(porcentaje_descuento, 0);
