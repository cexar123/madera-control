// Autor: Miembro 5
// MaderaControl v2.0 - Endpoints de ventas

import { api } from './axios';

export const ventasApi = {
  listar: (params = {}) =>
    api.get('/api/ventas', { params }).then(r => r.data),
  obtener: (id) =>
    api.get(`/api/ventas/${id}`).then(r => r.data),
  registrar: (datos) =>
    api.post('/api/ventas', datos).then(r => r.data),
  anular: (id, motivo) =>
    api.put(`/api/ventas/${id}/anular`, { motivo }).then(r => r.data),
  actualizarEntrega: (id, estado_entrega, observaciones) =>
    api.put(`/api/ventas/${id}/entrega`, { estado_entrega, observaciones }).then(r => r.data),
  listarRecojos: (params = {}) =>
    api.get('/api/ventas/recojos', { params }).then(r => r.data),
  previsualizar: (items) =>
    api.post('/api/ventas/previsualizar', { items }).then(r => r.data)
};
