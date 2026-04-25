// Autor: Miembro 5
// MaderaControl v1.0 - Endpoints de autenticacion

import { api } from './axios';

export const authApi = {
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }).then(r => r.data),
  me: () =>
    api.get('/api/auth/me').then(r => r.data)
};
