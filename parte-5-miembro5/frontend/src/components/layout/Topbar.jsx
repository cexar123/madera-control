// Autor: Miembro 5
// MaderaControl v1.0 - Barra superior

import useAuth from '../../hooks/useAuth';

export default function Topbar({ titulo }) {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-800">{titulo}</h1>
      <div className="text-sm text-gray-600">
        <span className="font-medium">{user?.nombre}</span>
        <span className="mx-2 text-gray-400">|</span>
        <span className="capitalize">{user?.rol}</span>
      </div>
    </header>
  );
}
