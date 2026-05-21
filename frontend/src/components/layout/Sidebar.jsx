// MaderaControl v2.0 - Barra lateral de navegacion

import { NavLink } from 'react-router-dom';

import useAuth from '../../hooks/useAuth';

const SECCIONES = [
  {
    titulo: 'VENTAS',
    rolesPermitidos: ['gerente', 'vendedor', 'contador'],
    items: [
      { ruta: '/ventas/nueva', label: 'Nueva Venta', roles: ['gerente', 'vendedor'] },
      { ruta: '/ventas',       label: 'Historial de Ventas', roles: ['gerente', 'vendedor', 'contador'] },
      { ruta: '/ventas/recojos', label: 'Programacion de Recojo', roles: ['gerente', 'vendedor'] }
    ]
  },
  {
    titulo: 'INVENTARIO',
    rolesPermitidos: ['gerente', 'vendedor', 'contador'],
    items: [
      { ruta: '/inventario',              label: 'Productos',  roles: ['gerente', 'vendedor', 'contador'] },
      { ruta: '/inventario/movimientos',  label: 'Movimientos', roles: ['gerente', 'vendedor', 'contador'] },
      { ruta: '/inventario/descuentos',   label: 'Descuentos por Volumen', roles: ['gerente'] }
    ]
  },
  {
    titulo: 'CLIENTES',
    rolesPermitidos: ['gerente', 'vendedor', 'contador'],
    items: [
      { ruta: '/clientes', label: 'Lista de Clientes', roles: ['gerente', 'vendedor', 'contador'] }
    ]
  },
  {
    titulo: 'REPORTES',
    rolesPermitidos: ['gerente', 'contador'],
    items: [
      { ruta: '/dashboard',  label: 'Dashboard BI',  roles: ['gerente', 'contador'] },
      { ruta: '/prediccion', label: 'Prediccion IA', roles: ['gerente'] }
    ]
  }
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const rol = user?.rol;

  return (
    <aside className="w-60 min-h-screen bg-primary text-white flex flex-col">
      <div className="p-5 border-b border-white/10">
        <div className="text-xl font-bold tracking-wide">MaderaControl</div>
        <div className="text-xs text-white/60">v2.0</div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {SECCIONES
          .filter(s => s.rolesPermitidos.includes(rol))
          .map(seccion => (
            <div key={seccion.titulo} className="mb-4">
              <div className="px-5 text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                {seccion.titulo}
              </div>
              <ul>
                {seccion.items
                  .filter(i => i.roles.includes(rol))
                  .map(item => (
                    <li key={item.ruta}>
                      <NavLink
                        to={item.ruta}
                        end={item.ruta === '/inventario'}
                        className={({ isActive }) =>
                          `block px-5 py-2 text-sm transition ${
                            isActive
                              ? 'bg-white/10 border-l-4 border-alerta font-semibold'
                              : 'hover:bg-white/5'
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                ))}
              </ul>
            </div>
          ))}
      </nav>

      <div className="border-t border-white/10 p-4 text-sm">
        <div className="font-semibold">{user?.nombre}</div>
        <div className="text-white/60 capitalize text-xs mb-2">{rol}</div>
        <button
          onClick={logout}
          className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded text-sm transition"
        >
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
