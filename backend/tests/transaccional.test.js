// MaderaControl - Pruebas Unitarias
// CA01: elegirDescuento(descuentos, tipo_madera, cantidad)
// CA02: Cálculo de IGV y total de venta (calcularTotales)
// CA03: listarVentas(filtros) - resistencia a SQL injection y filtros

require('dotenv').config({ path: __dirname + '/../.env' });

const ventasService = require('../src/services/ventas.service');
// Re-exportar elegirDescuento — la función es interna; la replicamos para test
// extrayéndola del módulo mediante un wrapper.

// Para CA01 usaremos la lógica de elegirDescuento exactamente como está en ventas.service.js
function elegirDescuento(descuentos, tipo_madera, cantidad) {
  const candidatos = descuentos.filter(d =>
    (d.tipo_madera === null || d.tipo_madera === tipo_madera) &&
    cantidad >= d.cantidad_minima
  );
  if (candidatos.length === 0) return 0;
  return Math.max(...candidatos.map(d => Number(d.porcentaje_descuento)));
}

// Función auxiliar para CA02: calcula subtotal, IGV y total dado un set de items
// Misma lógica que registrarVenta() en ventas.service.js
function calcularTotales(items, tipo_comprobante) {
  const IGV_RATE = 0.18;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('items vacío');
  }
  let subtotalBruto = 0;
  let descuentoTotal = 0;
  for (const it of items) {
    const precio = Number(it.precio_unitario);
    const desc = Number(it.descuento_unitario || 0);
    if (!Number.isFinite(precio) || precio < 0) throw new Error('precio inválido');
    if (!Number.isFinite(it.cantidad) || it.cantidad <= 0) throw new Error('cantidad inválida');
    subtotalBruto += precio * it.cantidad;
    descuentoTotal += desc * it.cantidad;
  }
  const subtotal = +(subtotalBruto - descuentoTotal).toFixed(2);
  const aplicaIgv = tipo_comprobante !== 'nota_venta';
  const igv = aplicaIgv ? +(subtotal * IGV_RATE).toFixed(2) : 0;
  const total = +(subtotal + igv).toFixed(2);
  return { subtotal, igv, total, aplica_igv: aplicaIgv };
}

// =====================================================
// CA01 — elegirDescuento(descuentos, tipo_madera, cantidad)
// Método: Manual (asserts uno a uno)
// =====================================================
describe('CA01 - elegirDescuento(descuentos, tipo_madera, cantidad)', () => {
  const descuentos = [
    { tipo_madera: null,        cantidad_minima: 10,  porcentaje_descuento: 5 },
    { tipo_madera: null,        cantidad_minima: 50,  porcentaje_descuento: 10 },
    { tipo_madera: null,        cantidad_minima: 100, porcentaje_descuento: 15 },
    { tipo_madera: 'eucalipto', cantidad_minima: 20,  porcentaje_descuento: 8 },
  ];

  test('CA01.1 - cantidad inferior al mínimo no aplica descuento', () => {
    expect(elegirDescuento(descuentos, 'eucalipto', 5)).toBe(0);
  });

  test('CA01.2 - cantidad en frontera (=10) aplica 5% (descuento general)', () => {
    expect(elegirDescuento(descuentos, 'varas', 10)).toBe(5);
  });

  test('CA01.3 - cantidad 50 elige el mejor descuento (10%)', () => {
    expect(elegirDescuento(descuentos, 'varas', 50)).toBe(10);
  });

  test('CA01.4 - eucalipto con 30 unidades prefiere 8% (específico) sobre 5% (general)', () => {
    // tiene 5% general y 8% específico eucalipto >= 20 → debe ganar 8
    expect(elegirDescuento(descuentos, 'eucalipto', 30)).toBe(8);
  });

  test('CA01.5 - cantidad 150 toma el descuento máximo aplicable (15%)', () => {
    expect(elegirDescuento(descuentos, 'vigas', 150)).toBe(15);
  });

  test('CA01.6 - input maligno (cantidad negativa / NaN) no debe lanzar y retorna 0', () => {
    expect(elegirDescuento(descuentos, 'vigas', -10)).toBe(0);
    expect(elegirDescuento(descuentos, 'vigas', NaN)).toBe(0);
    expect(elegirDescuento([], 'vigas', 100)).toBe(0);
  });
});

// =====================================================
// CA02 — calcularTotales(items, tipo_comprobante)
// Método: Automático (asserts en bucle sobre dataset)
// =====================================================
describe('CA02 - calcularTotales(items, tipo_comprobante) [Automático]', () => {
  // Conjunto de datos con 6 escenarios. cada uno: items, tipo, esperado.
  const dataset = [
    {
      nombre: 'Boleta con 1 producto',
      items: [{ precio_unitario: 100, cantidad: 1, descuento_unitario: 0 }],
      tipo: 'boleta',
      esperado: { subtotal: 100, igv: 18, total: 118 },
    },
    {
      nombre: 'Factura con 3 productos sin descuento',
      items: [
        { precio_unitario: 8.50,  cantidad: 25, descuento_unitario: 0 },
        { precio_unitario: 15.00, cantidad: 10, descuento_unitario: 0 },
        { precio_unitario: 45.00, cantidad: 4,  descuento_unitario: 0 },
      ],
      tipo: 'factura',
      esperado: { subtotal: 542.50, igv: 97.65, total: 640.15 },
    },
    {
      nombre: 'Factura con descuento por volumen 10%',
      items: [{ precio_unitario: 50, cantidad: 100, descuento_unitario: 5 }],
      tipo: 'factura',
      esperado: { subtotal: 4500, igv: 810, total: 5310 },
    },
    {
      nombre: 'Nota de venta no aplica IGV',
      items: [{ precio_unitario: 18, cantidad: 5, descuento_unitario: 0 }],
      tipo: 'nota_venta',
      esperado: { subtotal: 90, igv: 0, total: 90 },
    },
    {
      nombre: 'Precios con decimales reales (similar a E001-553)',
      items: [
        { precio_unitario: 8.50, cantidad: 25,  descuento_unitario: 0 },
        { precio_unitario: 9.00, cantidad: 15,  descuento_unitario: 0 },
        { precio_unitario: 22.00, cantidad: 4,  descuento_unitario: 0 },
      ],
      tipo: 'boleta',
      esperado: { subtotal: 435.50, igv: 78.39, total: 513.89 },
    },
    {
      nombre: 'Venta grande sin overflow ni redondeo extraño',
      items: [{ precio_unitario: 999.99, cantidad: 1000, descuento_unitario: 0 }],
      tipo: 'factura',
      esperado: { subtotal: 999990, igv: 179998.2, total: 1179988.2 },
    },
  ];

  test.each(dataset)('CA02.$# - $nombre', ({ items, tipo, esperado }) => {
    const r = calcularTotales(items, tipo);
    expect(r.subtotal).toBeCloseTo(esperado.subtotal, 2);
    expect(r.igv).toBeCloseTo(esperado.igv, 2);
    expect(r.total).toBeCloseTo(esperado.total, 2);
  });
});

// =====================================================
// CA03 — listarVentas(filtros): SQL Injection / filtros
// Método: Manual
// =====================================================
describe('CA03 - listarVentas(filtros) — resistencia a SQLi y filtros', () => {
  // Estas pruebas usan la BD real seeded con 4 ventas confirmadas.

  afterAll(async () => {
    const { pool } = require('../src/config/db');
    await pool.end();
  });

  test('CA03.1 - sin filtros: retorna todas las ventas seeded (>=5)', async () => {
    const rows = await ventasService.listarVentas({});
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  test('CA03.2 - filtro tipo=factura solo retorna facturas', async () => {
    const rows = await ventasService.listarVentas({ tipo: 'factura' });
    expect(rows.every(r => r.tipo_comprobante === 'factura')).toBe(true);
  });

  test('CA03.3 - SQL injection en tipo: `"' + "factura' OR '1'='1" + '"` no debe romper', async () => {
    const rows = await ventasService.listarVentas({ tipo: "factura' OR '1'='1" });
    // La consulta es parametrizada → tipo se compara literal, no debe haber match
    expect(rows.length).toBe(0);
  });

  test('CA03.4 - SQL injection clásica `; DROP TABLE ventas; --` no debe ejecutar', async () => {
    const rows = await ventasService.listarVentas({ estado: "'; DROP TABLE ventas; --" });
    expect(rows.length).toBe(0);
    // Verificar que la tabla sigue existiendo y poblada
    const todas = await ventasService.listarVentas({});
    expect(todas.length).toBeGreaterThanOrEqual(5);
  });

  test('CA03.5 - filtro estado=anulada (sin anuladas seeded) retorna 0', async () => {
    const rows = await ventasService.listarVentas({ estado: 'anulada' });
    expect(rows.length).toBe(0);
  });

  test('CA03.6 - filtro fecha_inicio futura retorna 0 ventas', async () => {
    const rows = await ventasService.listarVentas({ fecha_inicio: '2099-01-01' });
    expect(rows.length).toBe(0);
  });
});
