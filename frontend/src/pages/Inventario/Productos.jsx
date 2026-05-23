// Pagina de listado de productos / inventario

import { useState } from 'react';

import useAuth from '../../hooks/useAuth';
import useProductos from '../../hooks/useProductos';
import { productosApi } from '../../api/productos.api';
import { inventarioApi } from '../../api/productos.api';

import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Alert from '../../components/ui/Alert.jsx';

function formatSoles(v) { return `S/. ${Number(v || 0).toFixed(2)}`; }

function badgeStock(p) {
  if (p.stock_actual <= 0) return <Badge color="critico">Agotado</Badge>;
  if (p.stock_actual <= p.stock_minimo) return <Badge color="critico">Stock Critico</Badge>;
  if (p.stock_actual <= p.stock_minimo * 2) return <Badge color="alerta">Stock Bajo</Badge>;
  return <Badge color="ok">OK</Badge>;
}

export default function Productos() {
  const { user } = useAuth();
  const { productos, loading, error, filtros, setFiltros, recargar } = useProductos();
  const [editando, setEditando] = useState(null);
  const [precio, setPrecio] = useState(0);
  const [stockMinimo, setStockMinimo] = useState(0);
  const [errorEdicion, setErrorEdicion] = useState(null);

  const [entrada, setEntrada] = useState(null);
  const [cantidadEntrada, setCantidadEntrada] = useState(1);
  const [motivoEntrada, setMotivoEntrada] = useState('');
  const [errorEntrada, setErrorEntrada] = useState(null);
  const [okEntrada, setOkEntrada] = useState(null);
  const [guardandoEntrada, setGuardandoEntrada] = useState(false);

  const esGerente = user?.rol === 'gerente';

  function abrirEdicion(p) {
    setEditando(p);
    setPrecio(p.precio_unitario);
    setStockMinimo(p.stock_minimo);
    setErrorEdicion(null);
  }

  function abrirEntrada(p) {
    setEntrada(p);
    setCantidadEntrada(1);
    setMotivoEntrada('Compra al proveedor');
    setErrorEntrada(null);
    setOkEntrada(null);
  }

  async function guardar() {
    setErrorEdicion(null);
    try {
      await productosApi.actualizar(editando.id, {
        precio_unitario: parseFloat(precio),
        stock_minimo: parseInt(stockMinimo, 10)
      });
      setEditando(null);
      recargar();
    } catch (e) {
      setErrorEdicion(e.response?.data?.error || 'Error al actualizar');
    }
  }

  async function confirmarEntrada() {
    setErrorEntrada(null);
    const cantidad = parseInt(cantidadEntrada, 10);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setErrorEntrada('La cantidad debe ser un entero positivo');
      return;
    }
    setGuardandoEntrada(true);
    try {
      await inventarioApi.registrarEntrada({
        producto_id: entrada.id,
        cantidad,
        motivo: motivoEntrada || 'Entrada manual'
      });
      setOkEntrada(`+${cantidad} unidades agregadas a ${entrada.nombre}`);
      recargar();
      setTimeout(() => setEntrada(null), 900);
    } catch (e) {
      setErrorEntrada(e.response?.data?.error || 'Error al registrar la entrada');
    } finally {
      setGuardandoEntrada(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de madera</label>
          <select className="input-field"
            value={filtros.tipo_madera || ''}
            onChange={(e) => setFiltros({ ...filtros, tipo_madera: e.target.value || undefined })}>
            <option value="">Todos</option>
            <option value="eucalipto">Eucalipto</option>
            <option value="varas">Varas</option>
            <option value="vigas">Vigas</option>
            <option value="parantes">Parantes</option>
            <option value="listones">Listones</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <Button variant="secondary" onClick={() => setFiltros({})}>Limpiar</Button>
      </div>

      {error && <Alert tipo="error">{error}</Alert>}

      <div className="card">
        {loading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">Producto</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Dimension</th>
                <th className="text-right px-3 py-2">Precio</th>
                <th className="text-right px-3 py-2">Stock actual</th>
                <th className="text-right px-3 py-2">Stock min.</th>
                <th className="text-center px-3 py-2">Estado</th>
                {esGerente && <th className="text-center px-3 py-2">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {productos.map(p => {
                const estado = p.stock_actual <= 0 ? 'critico'
                  : p.stock_actual <= p.stock_minimo ? 'critico'
                  : p.stock_actual <= p.stock_minimo * 2 ? 'alerta' : 'ok';
                const colorTexto = estado === 'critico' ? 'text-critico font-bold'
                  : estado === 'alerta' ? 'text-alerta font-semibold' : 'text-ok';
                return (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{p.nombre}</td>
                    <td className="px-3 py-2 capitalize">{p.tipo_madera}</td>
                    <td className="px-3 py-2">{p.dimension || '-'}</td>
                    <td className="text-right px-3 py-2">{formatSoles(p.precio_unitario)}</td>
                    <td className={`text-right px-3 py-2 ${colorTexto}`}>{p.stock_actual}</td>
                    <td className="text-right px-3 py-2">{p.stock_minimo}</td>
                    <td className="text-center px-3 py-2">{badgeStock(p)}</td>
                    {esGerente && (
                      <td className="text-center px-3 py-2 whitespace-nowrap">
                        <button
                          className="text-ok hover:underline text-sm font-medium"
                          onClick={() => abrirEntrada(p)}
                          title="Registrar entrada de stock (compra al proveedor)"
                        >
                          + Stock
                        </button>
                        <span className="text-gray-300 mx-2">|</span>
                        <button className="text-primary hover:underline text-sm" onClick={() => abrirEdicion(p)}>
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!entrada}
        onClose={() => !guardandoEntrada && setEntrada(null)}
        titulo={`Registrar entrada — ${entrada?.nombre || ''}`}
      >
        {entrada && (
          <div className="space-y-3">
            {errorEntrada && <Alert tipo="error">{errorEntrada}</Alert>}
            {okEntrada && <Alert tipo="ok">{okEntrada}</Alert>}
            <div className="text-sm text-gray-600">
              Stock actual: <span className="font-bold text-primary">{entrada.stock_actual}</span>
              {' '}
              {entrada.unidad_medida || 'unidades'}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cantidad a agregar</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={cantidadEntrada}
                onChange={(e) => setCantidadEntrada(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Motivo / observación</label>
              <input
                type="text"
                className="input-field"
                value={motivoEntrada}
                onChange={(e) => setMotivoEntrada(e.target.value)}
                placeholder="Ej: Compra al proveedor Aserradero El Bosque"
              />
            </div>
            <div className="text-xs text-gray-500">
              Se registrará un movimiento de tipo <span className="font-semibold">entrada</span> en el inventario.
            </div>
            <Button onClick={confirmarEntrada} className="w-full" disabled={guardandoEntrada}>
              {guardandoEntrada ? 'Registrando…' : `Confirmar entrada de ${cantidadEntrada} unidades`}
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} titulo={`Editar ${editando?.nombre || ''}`}>
        {editando && (
          <div className="space-y-3">
            {errorEdicion && <Alert tipo="error">{errorEdicion}</Alert>}
            <div>
              <label className="block text-sm font-medium mb-1">Precio unitario (S/.)</label>
              <input type="number" step="0.01" className="input-field"
                value={precio} onChange={(e) => setPrecio(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock minimo</label>
              <input type="number" className="input-field"
                value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
            </div>
            <Button onClick={guardar} className="w-full">Guardar cambios</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
