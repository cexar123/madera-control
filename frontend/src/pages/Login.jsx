// Pagina de inicio de sesion

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import useAuth from '../hooks/useAuth';
import Button from '../components/ui/Button.jsx';
import Alert from '../components/ui/Alert.jsx';

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated && user) {
    if (user.rol === 'gerente' || user.rol === 'contador') {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/ventas/nueva', { replace: true });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const u = await login(email, password);
      if (u.rol === 'gerente') navigate('/dashboard', { replace: true });
      else if (u.rol === 'contador') navigate('/dashboard', { replace: true });
      else navigate('/ventas/nueva', { replace: true });
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al iniciar sesion';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary-dark p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl text-white text-3xl font-bold mb-3">
            M
          </div>
          <h1 className="text-2xl font-bold text-primary">MaderaControl</h1>
          <p className="text-sm text-gray-500 mt-1">
            Inversiones y Transportes Cesar y Diana EIRL
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="usuario@maderacontrol.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contrasena
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="********"
              required
            />
          </div>

          {error && <Alert tipo="error">{error}</Alert>}

          <Button type="submit" loading={loading} className="w-full">
            Iniciar sesion
          </Button>
        </form>
      </div>
    </div>
  );
}
