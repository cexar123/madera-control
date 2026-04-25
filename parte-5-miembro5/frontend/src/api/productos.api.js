// Autor: Miembro 5
// MaderaControl v1.0 - Endpoints de productos e inventario

import { api } from './axios';

export const productosApi = {
  listar: (params = {}) =>
    api.get('/api/productos', { params }).then(r => r.data),
  stockBajo: () =>
    api.get('/api/productos/stock-bajo').then(r => r.data),
  obtener: (id) =>
    api.get(`/api/productos/${id}`).then(r => r.data),
  crear: (datos) =>
    api.post('/api/productos', datos).then(r => r.data),
  actualizar: (id, datos) =>
    api.put(`/api/productos/${id}`, datos).then(r => r.data),
  desactivar: (id) =>
    api.delete(`/api/productos/${id}`).then(r => r.data)
};

export const inventarioApi = {
  movimientos: (params = {}) =>
    api.get('/api/inventario/movimientos', { params }).then(r => r.data),
  resumen: () =>
    api.get('/api/inventario/resumen').then(r => r.data),
  registrarEntrada: (datos) =>
    api.post('/api/inventario/entrada', datos).then(r => r.data)
};
