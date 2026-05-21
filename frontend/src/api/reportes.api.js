// Endpoints del modulo BI

import { api } from './axios';

export const reportesApi = {
  getVentasPorPeriodo: (periodo = 'dia') =>
    api.get('/api/reportes/ventas-por-periodo', { params: { periodo } }).then(r => r.data),
  getProductosMasVendidos: (limite = 5) =>
    api.get('/api/reportes/productos-mas-vendidos', { params: { limite } }).then(r => r.data),
  getIngresosTotales: (fechaInicio, fechaFin) =>
    api.get('/api/reportes/ingresos-totales', {
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
    }).then(r => r.data),
  getVentasPorTipoMadera: () =>
    api.get('/api/reportes/ventas-por-tipo-madera').then(r => r.data),
  getVentasPorFormaPago: () =>
    api.get('/api/reportes/ventas-por-forma-pago').then(r => r.data),
  getResumenDashboard: () =>
    api.get('/api/reportes/resumen-dashboard').then(r => r.data)
};
