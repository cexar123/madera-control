// MaderaControl v2.0 - Historial de ventas con anulacion motivada

import { useState } from 'react';

import useAuth from '../../hooks/useAuth';
import useVentas from '../../hooks/useVentas';
import { ventasApi } from '../../api/ventas.api';

import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { abrirComprobanteImprimible } from '../../utils/comprobante';

function formatSoles(v) { return `S/. ${Number(v || 0).toFixed(2)}`; }
function formatFecha(f) { return f ? new Date(f).toLocaleString('es-PE') : '-'; }

function badgeEntrega(v) {
  const map = {
    recojo_inmediato: { color: 'gris', label: 'Recojo inmediato' },
    recojo_programado: { color: 'info', label: 'Recojo programado' },
    delivery: { color: 'alerta', label: 'Delivery' }
  };
  const m = map[v.tipo_entrega] || { color: 'gris', label: '-' };
  return <Badge color={m.color}>{m.label}</Badge>;
}

function badgeEstado(v) {
  if (v.estado === 'anulada') return <Badge color="critico">Anulada</Badge>;
  return <Badge color="ok">Confirmada</Badge>;
}

export default function ListaVentas() {
  const { user } = useAuth();
  const { ventas, loading, error, filtros, setFiltros, recargar } = useVentas();
  const [detalle, setDetalle] = useState(null);
  const [loadingDet, setLoadingDet] = useState(false);

  const [anularModal, setAnularModal] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [anulError, setAnulError] = useState(null);

  const puedeAnular = user && (user.rol === 'vendedor' || user.rol === 'gerente');

  async function abrirDetalle(id) {
    setLoadingDet(true);
    setMotivoAnulacion('');
    setAnulError(null);
    try {
      const v = await ventasApi.obtener(id);
      setDetalle(v);
    } finally { setLoadingDet(false); }
  }

  async function confirmarAnulacion() {
    setAnulError(null);
    if (motivoAnulacion.trim().length < 5) {
      setAnulError('El motivo debe tener al menos 5 caracteres');
      return;
    }
    setAnulando(true);
    try {
      await ventasApi.anular(detalle.id, motivoAnulacion.trim());
      setAnularModal(false);
      setDetalle(null);
      recargar();
    } catch (e) {
      setAnulError(e.response?.data?.error || 'Error al anular la venta');
    } finally {
      setAnulando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-semibold text-primary mb-3">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input type="date" className="input-field"
            value={filtros.fecha_inicio || ''}
            onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })} />
          <input type="date" className="input-field"
            value={filtros.fecha_fin || ''}
            onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })} />
          <select className="input-field"
            value={filtros.tipo || ''}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
            <option value="">Todos los comprobantes</option>
            <option value="boleta">Boleta</option>
            <option value="factura">Factura</option>
            <option value="nota_venta">Nota de Venta</option>
          </select>
          <select className="input-field"
            value={filtros.estado || ''}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="confirmada">Confirmada</option>
            <option value="anulada">Anulada</option>
          </select>
          <Button variant="secondary" onClick={() => setFiltros({})}>Limpiar</Button>
        </div>
      </div>

      {error && <Alert tipo="error">{error}</Alert>}

      <div className="card">
        {loading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">Comprobante</th>
                <th className="text-left px-3 py-2">Fecha</th>
                <th className="text-left px-3 py-2">Cliente</th>
                <th className="text-left px-3 py-2">Pago</th>
                <th className="text-left px-3 py-2">Entrega</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-center px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map(v => (
                <tr key={v.id} onClick={() => abrirDetalle(v.id)}
                    className="border-t cursor-pointer hover:bg-blue-50">
                  <td className="px-3 py-2 font-mono">{v.numero_comprobante}</td>
                  <td className="px-3 py-2">{formatFecha(v.created_at)}</td>
                  <td className="px-3 py-2">{v.cliente_razon_social || '-'}</td>
                  <td className="px-3 py-2 capitalize">{v.forma_pago}</td>
                  <td className="px-3 py-2">{badgeEntrega(v)}</td>
                  <td className="text-right px-3 py-2 font-semibold">{formatSoles(v.total)}</td>
                  <td className="text-center px-3 py-2">{badgeEstado(v)}</td>
                </tr>
              ))}
              {ventas.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-500 py-6">Sin ventas</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!detalle || loadingDet}
        onClose={() => { setDetalle(null); setAnularModal(false); }}
        titulo={detalle ? `Venta ${detalle.numero_comprobante}` : 'Cargando...'}
        size="lg"
      >
        {loadingDet && <Spinner />}
        {detalle && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><b>Cliente:</b> {detalle.cliente_razon_social || 's/cliente'}</div>
              <div><b>RUC:</b> {detalle.cliente_ruc || '-'}</div>
              <div><b>Vendedor:</b> {detalle.usuario_nombre}</div>
              <div><b>Forma de pago:</b> <span className="capitalize">{detalle.forma_pago}</span></div>
              <div><b>Fecha:</b> {formatFecha(detalle.created_at)}</div>
              <div><b>Estado:</b> {badgeEstado(detalle)}</div>
              <div><b>Tipo de entrega:</b> {badgeEntrega(detalle)}</div>
              <div><b>Estado entrega:</b> <span className="capitalize">{(detalle.estado_entrega || '-').replace('_',' ')}</span></div>
              {detalle.fecha_recojo && <div><b>Fecha de recojo:</b> {formatFecha(detalle.fecha_recojo)}</div>}
              {detalle.direccion_entrega && <div className="col-span-2"><b>Direccion:</b> {detalle.direccion_entrega}</div>}
            </div>

            {detalle.estado === 'anulada' && (
              <div className="bg-red-50 border border-red-300 rounded p-3 text-sm">
                <div className="font-semibold text-critico mb-1">Venta anulada</div>
                <div><b>Motivo:</b> {detalle.motivo_anulacion || 'Sin motivo registrado'}</div>
                <div><b>Anulada por:</b> {detalle.anulada_por_nombre || 'Usuario desconocido'}</div>
                <div><b>Fecha de anulacion:</b> {formatFecha(detalle.anulada_at)}</div>
              </div>
            )}

            <table className="w-full mt-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-2 py-1">Producto</th>
                  <th className="text-right px-2 py-1">Cant.</th>
                  <th className="text-right px-2 py-1">Precio</th>
                  <th className="text-right px-2 py-1">Desc.</th>
                  <th className="text-right px-2 py-1">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalle.items?.map(it => (
                  <tr key={it.id} className="border-t">
                    <td className="px-2 py-1">{it.producto_nombre}</td>
                    <td className="text-right px-2 py-1">{it.cantidad}</td>
                    <td className="text-right px-2 py-1">{formatSoles(it.precio_unitario)}</td>
                    <td className="text-right px-2 py-1">
                      {Number(it.porcentaje_descuento) > 0
                        ? <Badge color="ok">-{Number(it.porcentaje_descuento)}%</Badge>
                        : '-'}
                    </td>
                    <td className="text-right px-2 py-1">{formatSoles(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right space-y-1 pt-3 border-t">
              {Number(detalle.descuento_total) > 0 && (
                <div className="text-ok">Ahorro por volumen: - {formatSoles(detalle.descuento_total)}</div>
              )}
              <div>Subtotal: <span className="font-medium">{formatSoles(detalle.subtotal)}</span></div>
              <div>IGV: <span className="font-medium">{formatSoles(detalle.igv)}</span></div>
              <div className="text-lg font-bold text-primary">TOTAL: {formatSoles(detalle.total)}</div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <Button variant="secondary" onClick={() => abrirComprobanteImprimible(detalle)}>
                Descargar / Imprimir comprobante
              </Button>
              {detalle.estado === 'confirmada' && puedeAnular && (
                <Button variant="danger" onClick={() => setAnularModal(true)}>
                  Anular venta
                </Button>
              )}
            </div>
          </div>
        )}

        {anularModal && detalle && (
          <div className="mt-4 border-t pt-4 space-y-3">
            <h3 className="font-semibold text-critico">Anular venta {detalle.numero_comprobante}</h3>
            {anulError && <Alert tipo="error">{anulError}</Alert>}
            <Alert tipo="advertencia">
              Al anular se devolveran las cantidades al inventario y la venta dejara de contar en los reportes.
              Esta accion queda registrada con tu nombre y la fecha actual.
            </Alert>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de la anulacion *
              </label>
              <textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                rows={3}
                className="input-field"
                placeholder="Ej: Error en el comprobante / cliente cancelo la compra / producto defectuoso..."
              />
              <div className="text-xs text-gray-500 mt-1">
                {motivoAnulacion.length}/500 caracteres (minimo 5)
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAnularModal(false)}>Cancelar</Button>
              <Button variant="danger" loading={anulando}
                      disabled={motivoAnulacion.trim().length < 5}
                      onClick={confirmarAnulacion}>
                Confirmar anulacion
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
