// Autor: Miembro 5
// MaderaControl v1.0 - Endpoints de ventas

import { api } from './axios';

export const ventasApi = {
  listar: (params = {}) =>
    api.get('/api/ventas', { params }).then(r => r.data),
  obtener: (id) =>
    api.get(`/api/ventas/${id}`).then(r => r.data),
  registrar: (datos) =>
    api.post('/api/ventas', datos).then(r => r.data),
  anular: (id) =>
    api.put(`/api/ventas/${id}/anular`).then(r => r.data)
};
