// MaderaControl v2.0 - Endpoints de descuentos por volumen

import { api } from './axios';

export const descuentosApi = {
  listar: (soloActivos = false) =>
    api.get('/api/descuentos', { params: soloActivos ? { activos: 'true' } : {} }).then(r => r.data),
  obtener: (id) =>
    api.get(`/api/descuentos/${id}`).then(r => r.data),
  crear: (datos) =>
    api.post('/api/descuentos', datos).then(r => r.data),
  actualizar: (id, datos) =>
    api.put(`/api/descuentos/${id}`, datos).then(r => r.data),
  eliminar: (id) =>
    api.delete(`/api/descuentos/${id}`).then(r => r.data)
};
