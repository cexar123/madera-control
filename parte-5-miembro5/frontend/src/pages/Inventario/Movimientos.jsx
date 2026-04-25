// Autor: Miembro 5
// MaderaControl v1.0 - Pagina de movimientos de inventario

import { useEffect, useState } from 'react';

import { inventarioApi, productosApi } from '../../api/productos.api';

import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';

function formatFecha(f) { return new Date(f).toLocaleString('es-PE'); }

export default function Movimientos() {
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    productosApi.listar().then(setProductos).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    inventarioApi.movimientos(filtros)
      .then(setMovimientos)
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [filtros]);

  return (
    <div className="space-y-4">
      <div className="card grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Tipo</label>
          <select className="input-field"
            value={filtros.tipo || ''}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value || undefined })}>
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Producto</label>
          <select className="input-field"
            value={filtros.producto_id || ''}
            onChange={(e) => setFiltros({ ...filtros, producto_id: e.target.value || undefined })}>
            <option value="">Todos</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Desde</label>
          <input type="date" className="input-field"
            value={filtros.fecha_inicio || ''}
            onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value || undefined })} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Hasta</label>
          <input type="date" className="input-field"
            value={filtros.fecha_fin || ''}
            onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value || undefined })} />
        </div>
        <Button variant="secondary" onClick={() => setFiltros({})}>Limpiar</Button>
      </div>

      {error && <Alert tipo="error">{error}</Alert>}

      <div className="card">
        {loading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">Fecha</th>
                <th className="text-left px-3 py-2">Producto</th>
                <th className="text-center px-3 py-2">Tipo</th>
                <th className="text-right px-3 py-2">Cantidad</th>
                <th className="text-left px-3 py-2">Motivo</th>
                <th className="text-left px-3 py-2">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map(m => (
                <tr key={m.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{formatFecha(m.created_at)}</td>
                  <td className="px-3 py-2 font-medium">{m.producto_nombre}</td>
                  <td className="text-center px-3 py-2">
                    <Badge color={m.tipo === 'entrada' ? 'ok' : 'critico'}>{m.tipo}</Badge>
                  </td>
                  <td className={`text-right px-3 py-2 font-semibold ${m.tipo === 'entrada' ? 'text-ok' : 'text-critico'}`}>
                    {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{m.motivo || '-'}</td>
                  <td className="px-3 py-2">{m.usuario_nombre || '-'}</td>
                </tr>
              ))}
              {movimientos.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-500 py-6">Sin movimientos</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
