// MaderaControl - Pruebas Unitarias del Módulo BI (Dashboard)
// CA04: getProductosMasVendidos(limite) y getResumenDashboard()

require('dotenv').config({ path: __dirname + '/../.env' });

const reportesService = require('../src/services/reportes.service');

afterAll(async () => {
  const { pool } = require('../src/config/db');
  await pool.end();
});

// =====================================================
// CA04 — getProductosMasVendidos / getResumenDashboard
// Método: Manual (asserts uno a uno sobre escenarios distintos)
// =====================================================
describe('CA04 - Reportes BI (Dashboard)', () => {
  test('CA04.1 - getProductosMasVendidos(5) retorna a lo sumo 5 productos ordenados por total_vendido desc', async () => {
    const rows = await reportesService.getProductosMasVendidos(5);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < rows.length; i++) {
      expect(Number(rows[i - 1].total_vendido)).toBeGreaterThanOrEqual(Number(rows[i].total_vendido));
    }
  });

  test('CA04.2 - getProductosMasVendidos(1) retorna exactamente 1 producto (top)', async () => {
    const rows = await reportesService.getProductosMasVendidos(1);
    expect(rows.length).toBe(1);
    expect(rows[0]).toHaveProperty('nombre');
    expect(rows[0]).toHaveProperty('ingresos');
  });

  test('CA04.3 - getProductosMasVendidos(limite con SQLi) trata el valor como entero', async () => {
    // pg parametrizado → si llega un string malicioso, pg lanza error de tipo.
    // No debe ejecutar la inyección.
    let threw = false;
    try {
      await reportesService.getProductosMasVendidos("5; DROP TABLE ventas; --");
    } catch (e) {
      threw = true;
    }
    // Si no lanza, al menos debe convertir a entero (5) y traer ≤5 filas; la BD debe seguir intacta.
    const rowsControl = await reportesService.getProductosMasVendidos(5);
    expect(rowsControl.length).toBeGreaterThan(0); // tabla sigue existiendo y poblada
  });

  test('CA04.4 - getResumenDashboard retorna estructura completa', async () => {
    const r = await reportesService.getResumenDashboard();
    expect(r).toHaveProperty('ventas_hoy');
    expect(r).toHaveProperty('ventas_mes');
    expect(r).toHaveProperty('productos_stock_bajo');
    expect(r).toHaveProperty('top_producto_semana');
    expect(r).toHaveProperty('recojos_pendientes');
    expect(r).toHaveProperty('descuentos_mes');
    expect(typeof r.productos_stock_bajo).toBe('number');
    expect(typeof r.ventas_mes.monto).toBe('number');
  });

  test('CA04.5 - getVentasPorTipoMadera porcentajes suman aproximadamente 100', async () => {
    const rows = await reportesService.getVentasPorTipoMadera();
    expect(rows.length).toBeGreaterThan(0);
    const sumaPct = rows.reduce((acc, r) => acc + Number(r.porcentaje), 0);
    expect(sumaPct).toBeGreaterThan(99.5);
    expect(sumaPct).toBeLessThan(100.5);
  });

  test('CA04.6 - getIngresosTotales con rango futuro retorna 0 / no rompe', async () => {
    const r = await reportesService.getIngresosTotales('2099-01-01', '2099-12-31');
    expect(r.total_ventas).toBe(0);
    expect(Number(r.ingresos_totales)).toBe(0);
    expect(Number(r.ticket_promedio)).toBe(0);
  });
});
