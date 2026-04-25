// Autor: Miembro 5
// MaderaControl v1.0 - Pagina de prediccion IA (50%)
// Consume el microservicio FastAPI y muestra alertas por producto.

import { useEffect, useState } from 'react';

import { iaApiClient } from '../../api/ia.api';

import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Alert from '../../components/ui/Alert.jsx';

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

export default function PrediccionStock() {
  const [resumen, setResumen] = useState(null);
  const [predicciones, setPredicciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      iaApiClient.getResumenPrediccion(),
      iaApiClient.getStockCritico()
    ]).then(([r, lista]) => {
      setResumen(r);
      setPredicciones(lista);
    }).catch(e => setError(
      e.response?.data?.detail || e.response?.data?.error ||
      'No se pudo conectar al microservicio IA. Verifica que este corriendo en el puerto 8000.'
    )).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Alert tipo="error" titulo="Servicio IA no disponible">{error}</Alert>;

  return (
    <div className="space-y-5">
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-critico">
          <div className="text-xs text-gray-500 uppercase">Stock critico</div>
          <div className="text-3xl font-bold text-critico mt-1">{resumen?.criticos ?? 0}</div>
          <div className="text-sm text-gray-500">productos con menos de 3 dias</div>
        </div>
        <div className="card border-l-4 border-alerta">
          <div className="text-xs text-gray-500 uppercase">Stock bajo</div>
          <div className="text-3xl font-bold text-alerta mt-1">{resumen?.bajos ?? 0}</div>
          <div className="text-sm text-gray-500">productos con menos de 7 dias</div>
        </div>
        <div className="card border-l-4 border-ok">
          <div className="text-xs text-gray-500 uppercase">Stock normal</div>
          <div className="text-3xl font-bold text-ok mt-1">{resumen?.normales ?? 0}</div>
          <div className="text-sm text-gray-500">productos sin alerta</div>
        </div>
      </div>

      {/* Tabla de predicciones */}
      <div className="card">
        <h3 className="font-semibold text-primary mb-3">Predicciones por producto</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">Producto</th>
                <th className="text-right px-3 py-2">Stock actual</th>
                <th className="text-right px-3 py-2">Demanda/semana</th>
                <th className="text-right px-3 py-2">Dias restantes</th>
                <th className="text-center px-3 py-2">Nivel</th>
                <th className="text-left px-3 py-2">Recomendacion</th>
              </tr>
            </thead>
            <tbody>
              {predicciones.map(p => (
                <tr key={p.producto_id} className={`border-t ${filaColor(p.nivel_alerta)}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{p.nombre}</div>
                    <div className="text-xs text-gray-500 capitalize">{p.tipo_madera}</div>
                  </td>
                  <td className="text-right px-3 py-2 font-semibold">{p.stock_actual}</td>
                  <td className="text-right px-3 py-2">{p.demanda_estimada_semana?.toFixed?.(1) ?? p.demanda_estimada_semana}</td>
                  <td className="text-right px-3 py-2 font-bold">
                    {p.dias_restantes >= 999 ? '∞' : p.dias_restantes}
                  </td>
                  <td className="text-center px-3 py-2">
                    <Badge color={nivelColor(p.nivel_alerta)}>
                      {p.nivel_alerta}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 max-w-md">
                    {p.recomendacion}
                    {p.confianza < 0.5 && (
                      <div className="text-xs italic text-gray-400 mt-1">
                        (Modelo en aprendizaje, confianza: {(p.confianza * 100).toFixed(0)}%)
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {predicciones.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-500 py-6">Sin predicciones disponibles</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-500 italic text-center">
        Predicciones basadas en historial de ventas. Si dice "Modelo en aprendizaje",
        se necesitan mas datos historicos para mejorar la confianza.
      </div>
    </div>
  );
}
