// Autor: Miembro 5
// MaderaControl v1.0 - Endpoints del microservicio FastAPI (IA)

import { iaApi } from './axios';

export const iaApiClient = {
  getStockCritico: () =>
    iaApi.get('/api/ia/prediccion/stock-critico').then(r => r.data),
  getPrediccionProducto: (id) =>
    iaApi.get(`/api/ia/prediccion/producto/${id}`).then(r => r.data),
  getResumenPrediccion: () =>
    iaApi.get('/api/ia/prediccion/resumen').then(r => r.data)
};
