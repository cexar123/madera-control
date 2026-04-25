// Autor: Miembro 5
// MaderaControl v1.0 - Pagina de historial de ventas con filtros

import { useState } from 'react';

import useVentas from '../../hooks/useVentas';
import { ventasApi } from '../../api/ventas.api';

import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';

function formatSoles(v) { return `S/. ${Number(v || 0).toFixed(2)}`; }
function formatFecha(f) { return new Date(f).toLocaleString('es-PE'); }

export default function ListaVentas() {
  const { ventas, loading, error, filtros, setFiltros, recargar } = useVentas();
  const [detalle, setDetalle] = useState(null);
  const [loadingDet, setLoadingDet] = useState(false);

  async function abrirDetalle(id) {
    setLoadingDet(true);
    try {
      const v = await ventasApi.obtener(id);
      setDetalle(v);
    } finally { setLoadingDet(false); }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-semibold text-primary mb-3">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-center px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map(v => (
                <tr key={v.id}
                    onClick={() => abrirDetalle(v.id)}
                    className="border-t cursor-pointer hover:bg-blue-50">
                  <td className="px-3 py-2 font-mono">{v.numero_comprobante}</td>
                  <td className="px-3 py-2">{formatFecha(v.created_at)}</td>
                  <td className="px-3 py-2">{v.cliente_razon_social || '-'}</td>
                  <td className="px-3 py-2 capitalize">{v.forma_pago}</td>
                  <td className="text-right px-3 py-2 font-semibold">{formatSoles(v.total)}</td>
                  <td className="text-center px-3 py-2">
                    <Badge color={v.estado === 'confirmada' ? 'ok' : 'critico'}>
                      {v.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
              {ventas.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-500 py-6">Sin ventas</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!detalle || loadingDet}
        onClose={() => setDetalle(null)}
        titulo={detalle ? `Venta ${detalle.numero_comprobante}` : 'Cargando...'}
        size="lg"
      >
        {loadingDet && <Spinner />}
        {detalle && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{detalle.cliente_razon_social || 's/cliente'}</span></div>
              <div><span className="text-gray-500">RUC:</span> {detalle.cliente_ruc || '-'}</div>
              <div><span className="text-gray-500">Vendedor:</span> {detalle.usuario_nombre}</div>
              <div><span className="text-gray-500">Forma de pago:</span> <span className="capitalize">{detalle.forma_pago}</span></div>
              <div><span className="text-gray-500">Fecha:</span> {formatFecha(detalle.created_at)}</div>
              <div><span className="text-gray-500">Estado:</span> <Badge color={detalle.estado === 'confirmada' ? 'ok' : 'critico'}>{detalle.estado}</Badge></div>
            </div>

            <table className="w-full mt-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-2 py-1">Producto</th>
                  <th className="text-right px-2 py-1">Cant.</th>
                  <th className="text-right px-2 py-1">Precio</th>
                  <th className="text-right px-2 py-1">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalle.items?.map(it => (
                  <tr key={it.id} className="border-t">
                    <td className="px-2 py-1">{it.producto_nombre}</td>
                    <td className="text-right px-2 py-1">{it.cantidad}</td>
                    <td className="text-right px-2 py-1">{formatSoles(it.precio_unitario)}</td>
                    <td className="text-right px-2 py-1">{formatSoles(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right space-y-1 pt-3 border-t">
              <div>Subtotal: <span className="font-medium">{formatSoles(detalle.subtotal)}</span></div>
              <div>IGV: <span className="font-medium">{formatSoles(detalle.igv)}</span></div>
              <div className="text-lg font-bold text-primary">TOTAL: {formatSoles(detalle.total)}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
