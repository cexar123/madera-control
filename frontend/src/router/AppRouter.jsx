// MaderaControl v2.0 - Definicion de rutas y proteccion por rol

import { Routes, Route, Navigate } from 'react-router-dom';

import useAuth from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';

import Login from '../pages/Login.jsx';
import NuevaVenta from '../pages/Transaccional/NuevaVenta.jsx';
import ListaVentas from '../pages/Transaccional/ListaVentas.jsx';
import ProgramacionRecojo from '../pages/Transaccional/ProgramacionRecojo.jsx';
import Productos from '../pages/Inventario/Productos.jsx';
import Movimientos from '../pages/Inventario/Movimientos.jsx';
import Descuentos from '../pages/Inventario/Descuentos.jsx';
import Clientes from '../pages/Clientes/Clientes.jsx';
import Dashboard from '../pages/BI/Dashboard.jsx';
import PrediccionStock from '../pages/IA/PrediccionStock.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.rol)) return <Navigate to="/ventas" replace />;
  return children;
}

function HomeRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.rol === 'gerente') return <Navigate to="/dashboard" replace />;
  if (user?.rol === 'contador') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/ventas/nueva" replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<HomeRedirect />} />

        <Route path="/ventas/nueva" element={
          <RoleRoute roles={['vendedor', 'gerente']}>
            <NuevaVenta />
          </RoleRoute>
        } />
        <Route path="/ventas" element={<ListaVentas />} />
        <Route path="/ventas/recojos" element={
          <RoleRoute roles={['vendedor', 'gerente']}>
            <ProgramacionRecojo />
          </RoleRoute>
        } />

        <Route path="/inventario" element={<Productos />} />
        <Route path="/inventario/movimientos" element={<Movimientos />} />
        <Route path="/inventario/descuentos" element={
          <RoleRoute roles={['gerente']}>
            <Descuentos />
          </RoleRoute>
        } />

        <Route path="/clientes" element={<Clientes />} />

        <Route path="/dashboard" element={
          <RoleRoute roles={['gerente', 'contador']}>
            <Dashboard />
          </RoleRoute>
        } />
        <Route path="/prediccion" element={
          <RoleRoute roles={['gerente']}>
            <PrediccionStock />
          </RoleRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
