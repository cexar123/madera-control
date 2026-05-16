// Autor: Miembro 5
// MaderaControl v2.0 - Pagina de prediccion IA al 100%
// Consume el microservicio FastAPI y muestra:
//   - KPIs (criticos / bajos / normales / riesgo promedio / confianza promedio)
//   - Tabla de predicciones con tendencia, riesgo y cantidad a reabastecer
//   - Recomendaciones de compra agregadas
//   - Distribucion por tendencia (subiendo / bajando / estable)
//   - Top 10 clientes por monto

import { useEffect, useState } from 'react';

import { iaApiClient } from '../../api/ia.api';

import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Alert from '../../components/ui/Alert.jsx';

function formatSoles(v) { return `S/. ${Number(v || 0).toFixed(2)}`; }

function nivelColor(nivel) {
  if (nivel === 'critico') return 'critico';
  if (nivel === 'bajo') return 'alerta';
  return 'ok';
}
function filaColor(nivel) {
  if (nivel === 'critico') return 'bg-red-50';
  if (nivel === 'bajo') return 'bg-orange-50';
  return '';
}
function tendenciaIcono(nivel) {
  if (nivel === 'subiendo') return { color: 'critico', flecha: '↑', label: 'Subiendo' };
  if (nivel === 'bajando') return { color: 'info', flecha: '↓', label: 'Bajando' };
  if (nivel === 'estable') return { color: 'gris', flecha: '→', label: 'Estable' };
  return { color: 'gris', flecha: '·', label: 'Sin datos' };
}

function KPI({ titulo, valor, sub, color = 'text-primary' }) {
  return (
    <div className="card">
      <div className="text-xs text-gray-500 uppercase tracking-wider">{titulo}</div>
      <div className={`text-3xl font-bold mt-2 ${color}`}>{valor}</div>
      {sub && <div className="text-sm text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

function BarraRiesgo({ valor }) {
  const color = valor >= 70 ? 'bg-critico' : valor >= 40 ? 'bg-alerta' : 'bg-ok';
  return (
    <div className="w-24 bg-gray-200 rounded-full h-2 mx-auto">
      <div className={`${color} h-2 rounded-full`} style={{ width: `${valor}%` }}></div>
    </div>
  );
}

export default function PrediccionStock() {
  const [resumen, setResumen] = useState(null);
  const [predicciones, setPredicciones] = useState([]);
  const [recomendaciones, setRecomendaciones] = useState(null);
  const [tendenciasData, setTendenciasData] = useState(null);
  const [topClientes, setTopClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('predicciones');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      iaApiClient.getResumenPrediccion(),
      iaApiClient.getStockCritico(),
      iaApiClient.getRecomendacionesCompra(),
      iaApiClient.getTendencias(),
      iaApiClient.getTopClientes(10)
    ]).then(([r, lista, recs, tend, clientes]) => {
      setResumen(r);
      setPredicciones(lista);
      setRecomendaciones(recs);
      setTendenciasData(tend);
      setTopClientes(clientes);
    }).catch(e => setError(
      e.response?.data?.detail || e.response?.data?.error || e.message ||
      'No se pudo conectar al microservicio IA.'
    )).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Alert tipo="error" titulo="Servicio IA no disponible">{error}</Alert>;

  const tabs = [
    { key: 'predicciones', label: 'Predicciones por producto' },
    { key: 'compras', label: 'Recomendaciones de compra' },
    { key: 'tendencias', label: 'Tendencias' },
    { key: 'clientes', label: 'Top clientes' }
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPI titulo="Stock critico"
             valor={resumen?.criticos ?? 0}
             sub="< 3 dias de inventario"
             color="text-critico" />
        <KPI titulo="Stock bajo"
             valor={resumen?.bajos ?? 0}
             sub="< 7 dias de inventario"
             color="text-alerta" />
        <KPI titulo="Stock normal"
             valor={resumen?.normales ?? 0}
             sub="sin alerta"
             color="text-ok" />
        <KPI titulo="Riesgo promedio"
             valor={`${resumen?.riesgo_promedio ?? 0}%`}
             sub="probabilidad de stockout"
             color={resumen?.riesgo_promedio >= 50 ? 'text-critico' : 'text-primary'} />
        <KPI titulo="Confianza del modelo"
             valor={`${Math.round((resumen?.confianza_promedio || 0) * 100)}%`}
             sub="basada en historial"
             color="text-primary" />
      </div>

      {/* Tabs */}
      <div className="card p-0">
        <div className="flex border-b">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium transition border-b-2 ${
                tab === t.key
                  ? 'border-primary text-primary bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-primary hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'predicciones' && (
            <TablaPredicciones predicciones={predicciones} />
          )}
          {tab === 'compras' && (
            <RecomendacionesCompra data={recomendaciones} />
          )}
          {tab === 'tendencias' && (
            <Tendencias data={tendenciasData} />
          )}
          {tab === 'clientes' && (
            <TopClientes data={topClientes} />
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500 italic">
        <b>Metodo:</b> regresion lineal sobre serie diaria + media movil ponderada.
        Si dice "Modelo en aprendizaje" se necesita mas historial para mejorar la confianza.
        Lead time configurado: 7 dias - Objetivo de cobertura: 14 dias.
      </div>
    </div>
  );
}

function TablaPredicciones({ predicciones }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-3 py-2">Producto</th>
            <th className="text-right px-3 py-2">Stock</th>
            <th className="text-right px-3 py-2">Demanda/sem</th>
            <th className="text-right px-3 py-2">Dias rest.</th>
            <th className="text-center px-3 py-2">Nivel</th>
            <th className="text-center px-3 py-2">Tendencia</th>
            <th className="text-center px-3 py-2">Riesgo</th>
            <th className="text-right px-3 py-2">Pedir</th>
            <th className="text-left px-3 py-2">Recomendacion</th>
          </tr>
        </thead>
        <tbody>
          {predicciones.map(p => {
            const t = tendenciaIcono(p.tendencia?.nivel);
            return (
              <tr key={p.producto_id} className={`border-t ${filaColor(p.nivel_alerta)}`}>
                <td className="px-3 py-2">
                  <div className="font-medium">{p.nombre}</div>
                  <div className="text-xs text-gray-500 capitalize">{p.tipo_madera}</div>
                </td>
                <td className="text-right px-3 py-2 font-semibold">{p.stock_actual}</td>
                <td className="text-right px-3 py-2">
                  {Number(p.demanda_estimada_semana).toFixed(1)}
                </td>
                <td className="text-right px-3 py-2 font-bold">
                  {p.dias_restantes >= 999 ? '∞' : p.dias_restantes}
                </td>
                <td className="text-center px-3 py-2">
                  <Badge color={nivelColor(p.nivel_alerta)}>{p.nivel_alerta}</Badge>
                </td>
                <td className="text-center px-3 py-2">
                  <Badge color={t.color}>
                    {t.flecha} {t.label}
                  </Badge>
                  {p.tendencia?.cambio_porcentual_semana ? (
                    <div className="text-xs text-gray-500 mt-1">
                      {p.tendencia.cambio_porcentual_semana > 0 ? '+' : ''}
                      {p.tendencia.cambio_porcentual_semana}% sem.
                    </div>
                  ) : null}
                </td>
                <td className="text-center px-3 py-2">
                  <BarraRiesgo valor={p.riesgo_stockout} />
                  <div className="text-xs text-gray-600 mt-1">{p.riesgo_stockout}%</div>
                </td>
                <td className="text-right px-3 py-2 font-semibold">
                  {p.cantidad_a_reabastecer > 0
                    ? <Badge color="info">{p.cantidad_a_reabastecer}</Badge>
                    : <span className="text-gray-400">-</span>}
                </td>
                <td className="px-3 py-2 text-xs text-gray-700 max-w-md">
                  {p.recomendacion}
                  {p.confianza < 0.5 && (
                    <div className="text-xs italic text-gray-400 mt-1">
                      Confianza: {(p.confianza * 100).toFixed(0)}%
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {predicciones.length === 0 && (
            <tr><td colSpan={9} className="text-center text-gray-500 py-6">Sin predicciones</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RecomendacionesCompra({ data }) {
  if (!data) return <Spinner />;
  return (
    <div>
      <div className="flex items-center justify-between mb-4 bg-blue-50 border border-blue-200 rounded p-3">
        <div>
          <div className="text-sm text-gray-600">Productos sugeridos a reabastecer</div>
          <div className="text-2xl font-bold text-primary">{data.total_productos}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Unidades totales sugeridas</div>
          <div className="text-2xl font-bold text-primary">{data.total_unidades_sugeridas}</div>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-3 py-2">Producto</th>
            <th className="text-right px-3 py-2">Stock actual</th>
            <th className="text-right px-3 py-2">Demanda semanal</th>
            <th className="text-center px-3 py-2">Riesgo</th>
            <th className="text-right px-3 py-2">Sugerencia</th>
          </tr>
        </thead>
        <tbody>
          {data.productos.map(p => (
            <tr key={p.producto_id} className={`border-t ${filaColor(p.nivel_alerta)}`}>
              <td className="px-3 py-2">
                <div className="font-medium">{p.nombre}</div>
                <div className="text-xs text-gray-500 capitalize">{p.tipo_madera}</div>
              </td>
              <td className="text-right px-3 py-2">{p.stock_actual}</td>
              <td className="text-right px-3 py-2">{Number(p.demanda_estimada_semana).toFixed(1)}</td>
              <td className="text-center px-3 py-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  p.riesgo_stockout >= 70 ? 'bg-red-100 text-red-800' :
                  p.riesgo_stockout >= 40 ? 'bg-orange-100 text-orange-800' :
                  'bg-green-100 text-green-800'
                }`}>{p.riesgo_stockout}%</span>
              </td>
              <td className="text-right px-3 py-2">
                <Badge color="info">{p.cantidad_a_reabastecer} unid.</Badge>
              </td>
            </tr>
          ))}
          {data.productos.length === 0 && (
            <tr><td colSpan={5} className="text-center text-gray-500 py-6">
              No hay productos que requieran reabastecimiento ahora.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Tendencias({ data }) {
  if (!data) return <Spinner />;
  const grupos = [
    { key: 'subiendo', label: 'Demanda al alza', color: 'border-critico', tColor: 'text-critico', icono: '↑' },
    { key: 'bajando',  label: 'Demanda a la baja', color: 'border-info', tColor: 'text-blue-600', icono: '↓' },
    { key: 'estable',  label: 'Demanda estable', color: 'border-ok', tColor: 'text-ok', icono: '→' },
    { key: 'sin_datos', label: 'Sin datos suficientes', color: 'border-gray-300', tColor: 'text-gray-500', icono: '·' }
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {grupos.map(g => (
        <div key={g.key} className={`border-l-4 ${g.color} bg-white rounded shadow-sm p-4`}>
          <h3 className={`font-semibold mb-2 ${g.tColor}`}>
            {g.icono} {g.label}{' '}
            <span className="text-sm text-gray-500 ml-1">({(data[g.key] || []).length})</span>
          </h3>
          {(data[g.key] || []).length === 0 ? (
            <p className="text-sm text-gray-400">Sin productos en esta categoria</p>
          ) : (
            <ul className="text-sm space-y-1">
              {data[g.key].map(p => (
                <li key={p.producto_id} className="flex justify-between border-b border-gray-100 pb-1">
                  <span>
                    <span className="font-medium">{p.nombre}</span>
                    <span className="text-xs text-gray-500 ml-1 capitalize">({p.tipo_madera})</span>
                  </span>
                  <span className={g.tColor + ' text-xs font-mono'}>
                    {p.cambio_porcentual_semana > 0 ? '+' : ''}{p.cambio_porcentual_semana}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function TopClientes({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-6">Aun no hay ventas registradas.</div>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="text-left px-3 py-2">#</th>
          <th className="text-left px-3 py-2">Cliente</th>
          <th className="text-left px-3 py-2">RUC</th>
          <th className="text-right px-3 py-2">Compras</th>
          <th className="text-right px-3 py-2">Monto total</th>
          <th className="text-right px-3 py-2">Ticket promedio</th>
        </tr>
      </thead>
      <tbody>
        {data.map((c, idx) => (
          <tr key={`${c.cliente}-${c.ruc}`} className="border-t hover:bg-gray-50">
            <td className="px-3 py-2 font-bold text-primary">{idx + 1}</td>
            <td className="px-3 py-2 font-medium">{c.cliente}</td>
            <td className="px-3 py-2 font-mono text-xs">{c.ruc || '-'}</td>
            <td className="text-right px-3 py-2">{c.compras}</td>
            <td className="text-right px-3 py-2 font-semibold">{formatSoles(c.monto_total)}</td>
            <td className="text-right px-3 py-2">{formatSoles(c.ticket_promedio)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
