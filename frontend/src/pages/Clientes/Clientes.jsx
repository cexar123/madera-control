// Pagina de listado y busqueda de clientes

import { useEffect, useState, useMemo } from 'react';

import { clientesApi } from '../../api/clientes.api';

import Spinner from '../../components/ui/Spinner.jsx';
import Alert from '../../components/ui/Alert.jsx';

function formatFecha(f) { return new Date(f).toLocaleDateString('es-PE'); }

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    setLoading(true);
    clientesApi.listar()
      .then(setClientes)
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  const clientesFiltrados = useMemo(() => {
    if (!busqueda) return clientes;
    const q = busqueda.toLowerCase();
    return clientes.filter(c =>
      (c.ruc || '').toLowerCase().includes(q) ||
      (c.razon_social || '').toLowerCase().includes(q)
    );
  }, [clientes, busqueda]);

  return (
    <div className="space-y-4">
      <div className="card">
        <input
          type="text"
          className="input-field"
          placeholder="Buscar por RUC o razon social"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {error && <Alert tipo="error">{error}</Alert>}

      <div className="card">
        {loading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">RUC</th>
                <th className="text-left px-3 py-2">Razon Social</th>
                <th className="text-left px-3 py-2">Telefono</th>
                <th className="text-left px-3 py-2">Direccion</th>
                <th className="text-left px-3 py-2">Fecha registro</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono">{c.ruc || '-'}</td>
                  <td className="px-3 py-2 font-medium">{c.razon_social}</td>
                  <td className="px-3 py-2">{c.telefono || '-'}</td>
                  <td className="px-3 py-2 text-gray-600">{c.direccion || '-'}</td>
                  <td className="px-3 py-2">{formatFecha(c.created_at)}</td>
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-500 py-6">Sin clientes</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
