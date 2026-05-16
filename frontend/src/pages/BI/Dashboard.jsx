// Autor: Miembro 5
// MaderaControl v2.0 - Dashboard BI con KPIs, graficos y top productos

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell
} from 'recharts';

import { reportesApi } from '../../api/reportes.api';

import Spinner from '../../components/ui/Spinner.jsx';
import Alert from '../../components/ui/Alert.jsx';

const COLORS = ['#1e3a5f', '#f97316', '#16a34a', '#dc2626', '#a855f7', '#0ea5e9', '#facc15'];
const formatSoles = (v) => `S/. ${Number(v || 0).toFixed(2)}`;

function KPI({ titulo, valor, sub, color = 'text-primary' }) {
  return (
    <div className="card">
      <div className="text-xs text-gray-500 uppercase tracking-wider">{titulo}</div>
      <div className={`text-3xl font-bold mt-2 ${color}`}>{valor}</div>
      {sub && <div className="text-sm text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [resumen, setResumen] = useState(null);
  const [ventasPeriodo, setVentasPeriodo] = useState([]);
  const [periodo, setPeriodo] = useState('dia');
  const [tipoMadera, setTipoMadera] = useState([]);
  const [formaPago, setFormaPago] = useState([]);
  const [topProductos, setTopProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reportesApi.getResumenDashboard(),
      reportesApi.getVentasPorTipoMadera(),
      reportesApi.getVentasPorFormaPago(),
      reportesApi.getProductosMasVendidos(5)
    ]).then(([r, t, fp, top]) => {
      setResumen(r);
      setTipoMadera(t);
      setFormaPago(fp);
      setTopProductos(top);
    }).catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reportesApi.getVentasPorPeriodo(periodo)
      .then(r => setVentasPeriodo(r.datos || []))
      .catch(() => setVentasPeriodo([]));
  }, [periodo]);

  if (loading) return <Spinner />;
  if (error) return <Alert tipo="error">{error}</Alert>;

  return (
    <div className="space-y-6">
      {/* Fila superior: 5 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPI titulo="Ventas hoy"
             valor={resumen?.ventas_hoy?.cantidad ?? 0}
             sub={formatSoles(resumen?.ventas_hoy?.monto)} />
        <KPI titulo="Ventas del mes"
             valor={resumen?.ventas_mes?.cantidad ?? 0}
             sub={formatSoles(resumen?.ventas_mes?.monto)} />
        <KPI titulo="Stock critico"
             valor={resumen?.productos_stock_bajo ?? 0}
             sub="productos a reabastecer"
             color={resumen?.productos_stock_bajo > 0 ? 'text-critico' : 'text-ok'} />
        <KPI titulo="Recojos pendientes"
             valor={resumen?.recojos_pendientes ?? 0}
             sub="entregas por procesar"
             color={resumen?.recojos_pendientes > 0 ? 'text-alerta' : 'text-ok'} />
        <KPI titulo="Top semana"
             valor={resumen?.top_producto_semana?.unidades ?? 0}
             sub={resumen?.top_producto_semana?.nombre || 'Sin ventas'}
             color="text-alerta" />
      </div>

      {/* Fila media: dos graficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-primary">Ventas por periodo</h3>
            <select className="input-field max-w-[120px]"
              value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              <option value="dia">Por dia</option>
              <option value="semana">Por semana</option>
              <option value="mes">Por mes</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ventasPeriodo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periodo" />
              <YAxis />
              <Tooltip formatter={(value, name) => name.includes('monto') ? formatSoles(value) : value} />
              <Legend />
              <Bar dataKey="total_ventas" name="Cantidad" fill="#1e3a5f" />
              <Bar dataKey="monto_total" name="Monto (S/.)" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-primary mb-3">Ventas por tipo de madera</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={tipoMadera} dataKey="ingresos" nameKey="tipo_madera"
                   cx="50%" cy="50%" outerRadius={100}
                   label={(e) => `${e.tipo_madera} ${e.porcentaje}%`}>
                {tipoMadera.map((entry, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatSoles(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fila media-2: forma de pago + descuentos del mes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-primary mb-3">Ventas por forma de pago</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={formaPago} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="forma_pago" />
              <Tooltip formatter={(v, n) => n === 'monto' ? formatSoles(v) : v} />
              <Legend />
              <Bar dataKey="total_ventas" name="Cantidad" fill="#1e3a5f" />
              <Bar dataKey="monto" name="Monto" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <KPI titulo="Descuentos del mes"
             valor={formatSoles(resumen?.descuentos_mes)}
             sub="otorgados a clientes"
             color="text-ok" />
      </div>

      {/* Fila inferior: top productos */}
      <div className="card">
        <h3 className="font-semibold text-primary mb-3">Top 5 productos mas vendidos</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Producto</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-right px-3 py-2">Unidades</th>
              <th className="text-right px-3 py-2">Ingresos</th>
              <th className="text-right px-3 py-2">% desc. promedio</th>
            </tr>
          </thead>
          <tbody>
            {topProductos.map((p, idx) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 font-bold text-primary">{idx + 1}</td>
                <td className="px-3 py-2 font-medium">{p.nombre}</td>
                <td className="px-3 py-2 capitalize">{p.tipo_madera}</td>
                <td className="text-right px-3 py-2">{p.total_vendido}</td>
                <td className="text-right px-3 py-2 font-semibold">{formatSoles(p.ingresos)}</td>
                <td className="text-right px-3 py-2">
                  {p.descuento_promedio ? `${Number(p.descuento_promedio).toFixed(1)}%` : '-'}
                </td>
              </tr>
            ))}
            {topProductos.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-500 py-6">
                Aun no hay ventas registradas
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
