-- Autor: Cesar
-- MaderaControl v2.1 - Tipo de documento del cliente (RUC / DNI)
-- Migracion NO destructiva. Ejecutar DESPUES de 001, 002 y 003.
--
-- Regla de negocio:
--   - Factura: el cliente debe identificarse con RUC (11 digitos).
--   - Boleta: basta con el DNI del cliente (8 digitos).
-- La columna "ruc" pasa a almacenar el numero de documento (RUC o DNI)
-- y "tipo_documento" indica de cual se trata.

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(3) DEFAULT 'RUC';

-- Clientes existentes: todos fueron registrados con RUC
UPDATE clientes
SET tipo_documento = CASE
      WHEN ruc IS NULL THEN NULL
      WHEN LENGTH(ruc) = 8 THEN 'DNI'
      ELSE 'RUC'
    END
WHERE tipo_documento IS NULL OR tipo_documento = 'RUC';

-- Constraints (idempotentes)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_tipo_documento_check') THEN
    ALTER TABLE clientes ADD CONSTRAINT clientes_tipo_documento_check
      CHECK (tipo_documento IS NULL OR tipo_documento IN ('RUC','DNI'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_documento_largo_check') THEN
    ALTER TABLE clientes ADD CONSTRAINT clientes_documento_largo_check
      CHECK (
        ruc IS NULL
        OR (tipo_documento = 'RUC' AND ruc ~ '^[0-9]{11}$')
        OR (tipo_documento = 'DNI' AND ruc ~ '^[0-9]{8}$')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(ruc);
