// MaderaControl v2.0 - Endpoints del microservicio FastAPI (IA)

import { iaApi } from './axios';

export const iaApiClient = {
  getStockCritico: () =>
    iaApi.get('/api/ia/prediccion/stock-critico').then(r => r.data),
  getPrediccionProducto: (id) =>
    iaApi.get(`/api/ia/prediccion/producto/${id}`).then(r => r.data),
  getResumenPrediccion: () =>
    iaApi.get('/api/ia/prediccion/resumen').then(r => r.data),
  getRecomendacionesCompra: () =>
    iaApi.get('/api/ia/prediccion/recomendaciones-compra').then(r => r.data),
  getTendencias: () =>
    iaApi.get('/api/ia/prediccion/tendencias').then(r => r.data),
  getTopClientes: (limite = 10) =>
    iaApi.get('/api/ia/prediccion/top-clientes', { params: { limite } }).then(r => r.data)
};
