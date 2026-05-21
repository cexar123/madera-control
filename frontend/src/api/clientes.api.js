// Endpoints de clientes

import { api } from './axios';

export const clientesApi = {
  listar: () =>
    api.get('/api/clientes').then(r => r.data),
  buscar: (params = {}) =>
    api.get('/api/clientes/buscar', { params }).then(r => r.data),
  buscarPorRuc: (ruc) =>
    api.get('/api/clientes/buscar', { params: { ruc } }).then(r => r.data),
  crear: (datos) =>
    api.post('/api/clientes', datos).then(r => r.data),
  consultarRuc: (ruc) =>
    api.get('/api/clientes/consultar-ruc', { params: { ruc } }).then(r => r.data),
  findOrCreate: async (ruc, razonSocial, extras = {}) => {
    if (ruc) {
      const existentes = await clientesApi.buscarPorRuc(ruc);
      if (Array.isArray(existentes) && existentes.length > 0) {
        return existentes[0];
      }
    }
    return clientesApi.crear({
      ruc: ruc || null,
      razon_social: razonSocial || 'Cliente sin razon social',
      direccion: extras.direccion,
      telefono: extras.telefono
    });
  }
};
