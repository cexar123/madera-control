// Autor: Miembro 5
// MaderaControl v1.0 - Instancias de axios para backend Node y microservicio IA
// Incluye interceptores que adjuntan el JWT automaticamente y
// expulsan al usuario si la sesion expira (401).

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const IA_URL = import.meta.env.VITE_IA_URL || 'http://localhost:8000';

function buildClient(baseURL) {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' }
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('mc_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (resp) => resp,
    (error) => {
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('mc_token');
        localStorage.removeItem('mc_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const api = buildClient(API_URL);
export const iaApi = buildClient(IA_URL);
