// Autor: Miembro 5
// MaderaControl v2.0 - Tablero de recojos y entregas pendientes

import { useEffect, useState } from 'react';

import { ventasApi } from '../../api/ventas.api';

import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Alert from '../../components/ui/Alert.jsx';

function formatSoles(v) { return `S/. ${Number(v || 0).toFixed(2)}`; }
function formatFecha(f) { return f ? new Date(f).toLocaleString('es-PE') : '-'; }

const COLORES_ESTADO = {
  pendiente: 'alerta',
  listo: 'info',
  en_camino: 'info',
  entregado: 'ok',
  no_aplica: 'gris'
};

const FLUJOS = {
  recojo_programado: ['pendiente', 'listo', 'entregado'],
  delivery: ['pendiente', 'listo', 'en_camino', 'entregado']
};

export default function ProgramacionRecojo() {
  const [recojos, setRecojos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const [updating, setUpdating] = useState(null);
  const [observaciones, setObservaciones] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [modalError, setModalError] = useState(null);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filtroEstado) params.estado_entrega = filtroEstado;
      if (filtroFecha) params.fecha = filtroFecha;
      const r = await ventasApi.listarRecojos(params);
      setRecojos(r);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [filtroEstado, filtroFecha]);

  function abrirActualizar(venta, estadoSugerido) {
    setUpdating(venta);
    setNuevoEstado(estadoSugerido || flujoSiguiente(venta));
    setObservaciones(venta.observaciones_entrega || '');
    setModalError(null);
  }

  function flujoSiguiente(venta) {
    const flujo = FLUJOS[venta.tipo_entrega] || ['entregado'];
    const idx = flujo.indexOf(venta.estado_entrega);
    if (idx < 0 || idx >= flujo.length - 1) return 'entregado';
    return flujo[idx + 1];
  }

  async function confirmar() {
    setModalError(null);
    try {
      await ventasApi.actualizarEntrega(updating.id, nuevoEstado, observaciones || null);
      setUpdating(null);
      cargar();
    } catch (e) {
      setModalError(e.response?.data?.error || 'Error al actualizar entrega');
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Estado entrega</label>
          <select className="input-field"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="listo">Listos para recoger</option>
            <option value="en_camino">En camino</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Fecha de recojo</label>
          <input type="date" className="input-field"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)} />
        </div>
        <Button variant="secondary" onClick={() => { setFiltroEstado(''); setFiltroFecha(''); }}>
          Limpiar
        </Button>
      </div>

      {error && <Alert tipo="error">{error}</Alert>}

      <div className="card">
        {loading ? <Spinner /> : recojos.length === 0 ? (
          <div className="text-center text-gray-500 py-6">No hay recojos pendientes</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">Comprobante</th>
                <th className="text-left px-3 py-2">Cliente</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Fecha pactada</th>
                <th className="text-left px-3 py-2">Direccion / Contacto</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-center px-3 py-2">Estado</th>
                <th className="text-center px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recojos.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono">{r.numero_comprobante}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.cliente_razon_social || 's/cliente'}</div>
                    <div className="text-xs text-gray-500">{r.cliente_telefono || 's/tel'}</div>
                  </td>
                  <td className="px-3 py-2 capitalize">{(r.tipo_entrega || '-').replace('_',' ')}</td>
                  <td className="px-3 py-2">{formatFecha(r.fecha_recojo)}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.direccion_entrega || '-'}
                    {r.contacto_entrega && <div className="text-gray-500">{r.contacto_entrega}</div>}
                  </td>
                  <td className="text-right px-3 py-2 font-semibold">{formatSoles(r.total)}</td>
                  <td className="text-center px-3 py-2">
                    <Badge color={COLORES_ESTADO[r.estado_entrega] || 'info'}>
                      {(r.estado_entrega || '-').replace('_',' ')}
                    </Badge>
                  </td>
                  <td className="text-center px-3 py-2">
                    <Button variant="secondary" className="text-xs px-2 py-1"
                            onClick={() => abrirActualizar(r)}>
                      Actualizar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!updating} onClose={() => setUpdating(null)}
             titulo={updating ? `Entrega de ${updating.numero_comprobante}` : ''}>
        {updating && (
          <div className="space-y-3 text-sm">
            {modalError && <Alert tipo="error">{modalError}</Alert>}
            <div className="bg-gray-50 border rounded p-3">
              <div><b>Cliente:</b> {updating.cliente_razon_social}</div>
              <div><b>Tipo:</b> {(updating.tipo_entrega || '-').replace('_',' ')}</div>
              <div><b>Fecha pactada:</b> {formatFecha(updating.fecha_recojo)}</div>
              {updating.direccion_entrega && <div><b>Direccion:</b> {updating.direccion_entrega}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nuevo estado</label>
              <select className="input-field"
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}>
                {(FLUJOS[updating.tipo_entrega] || ['entregado']).map(s => (
                  <option key={s} value={s}>{s.replace('_',' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Observaciones (opcional)</label>
              <textarea className="input-field" rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: cliente solicito reprogramar, entrega parcial..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setUpdating(null)}>Cancelar</Button>
              <Button onClick={confirmar}>Guardar cambios</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
