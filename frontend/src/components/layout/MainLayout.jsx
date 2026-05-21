// MaderaControl v2.0 - Layout principal: sidebar + topbar + contenido

import { Outlet, useLocation } from 'react-router-dom';

import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

const TITULOS = {
  '/ventas/nueva': 'Nueva Venta',
  '/ventas': 'Historial de Ventas',
  '/ventas/recojos': 'Programacion de Recojo y Entregas',
  '/inventario': 'Productos',
  '/inventario/movimientos': 'Movimientos de Inventario',
  '/inventario/descuentos': 'Descuentos por Volumen',
  '/clientes': 'Clientes',
  '/dashboard': 'Dashboard BI',
  '/prediccion': 'Prediccion de Stock (IA)'
};

export default function MainLayout() {
  const location = useLocation();
  const titulo = TITULOS[location.pathname] || 'MaderaControl';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar titulo={titulo} />
        <main className="flex-1 p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
