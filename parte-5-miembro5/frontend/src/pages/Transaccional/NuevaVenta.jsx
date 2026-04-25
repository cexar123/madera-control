// Autor: Miembro 5
// MaderaControl v1.0 - Pagina de registro de nueva venta
// Cuatro secciones: cliente, productos, carrito, pago.

import { useEffect, useMemo, useState } from 'react';

import { productosApi } from '../../api/productos.api';
import { ventasApi } from '../../api/ventas.api';
import { clientesApi } from '../../api/clientes.api';

import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Modal from '../../components/ui/Modal.jsx';

const IGV_RATE = 0.18;

function formatSoles(v) {
  return `S/. ${Number(v || 0).toFixed(2)}`;
}

export default function NuevaVenta() {
  const [productos, setProductos] = useState([]);
  const [busquedaProd, setBusquedaProd] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [carrito, setCarrito] = useState([]);

  const [rucBusqueda, setRucBusqueda] = useState('');
  const [cliente, setCliente] = useState(null);
  const [consultandoSunat, setConsultandoSunat] = useState(false);
  const [sunatResult, setSunatResult] = useState(null);
  const [sunatError, setSunatError] = useState(null);
  const [razonSocialManual, setRazonSocialManual] = useState('');
  const [confirmandoCliente, setConfirmandoCliente] = useState(false);

  const [tipoComprobante, setTipoComprobante] = useState('boleta');
  const [formaPago, setFormaPago] = useState('efectivo');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  useEffect(() => {
    productosApi.listar().then(setProductos).catch(() => setProductos([]));
  }, []);

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      if (tipoFiltro && p.tipo_madera !== tipoFiltro) return false;
      if (busquedaProd && !p.nombre.toLowerCase().includes(busquedaProd.toLowerCase())) return false;
      return true;
    });
  }, [productos, tipoFiltro, busquedaProd]);

  const subtotal = useMemo(
    () => carrito.reduce((acc, it) => acc + it.precio_unitario * it.cantidad, 0),
    [carrito]
  );
  const igv = tipoComprobante === 'nota_venta' ? 0 : subtotal * IGV_RATE;
  const total = subtotal + igv;

  async function buscarEnSunat() {
    setError(null);
    setSunatResult(null);
    setSunatError(null);
    setRazonSocialManual('');
    setCliente(null);

    if (!/^\d{11}$/.test(rucBusqueda)) {
      setError('El RUC debe tener exactamente 11 digitos numericos');
      return;
    }

    setConsultandoSunat(true);
    try {
      const data = await clientesApi.consultarRuc(rucBusqueda);
      setSunatResult(data);
    } catch (e) {
      const status = e.response?.status;
      if (status === 404) {
        setSunatError('noEncontrado');
      } else if (status === 503) {
        setSunatError('conexion');
      } else {
        setError(e.response?.data?.error || 'Error al consultar SUNAT');
      }
    } finally {
      setConsultandoSunat(false);
    }
  }

  async function confirmarClienteSunat() {
    if (!sunatResult) return;
    setError(null);
    setConfirmandoCliente(true);
    try {
      const c = await clientesApi.findOrCreate(
        sunatResult.ruc,
        sunatResult.razonSocial,
        { direccion: sunatResult.direccion }
      );
      setCliente(c);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar el cliente');
    } finally {
      setConfirmandoCliente(false);
    }
  }

  async function confirmarClienteManual() {
    const nombre = (razonSocialManual || '').trim();
    if (!nombre) {
      setError('Debe ingresar la razon social del cliente');
      return;
    }
    setError(null);
    setConfirmandoCliente(true);
    try {
      const c = await clientesApi.findOrCreate(rucBusqueda || null, nombre);
      setCliente(c);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar el cliente');
    } finally {
      setConfirmandoCliente(false);
    }
  }

  function reiniciarCliente() {
    setCliente(null);
    setRucBusqueda('');
    setSunatResult(null);
    setSunatError(null);
    setRazonSocialManual('');
  }

  function agregarAlCarrito(producto, cantidad) {
    if (!cantidad || cantidad <= 0) {
      setError('La cantidad debe ser mayor que 0');
      return;
    }
    if (cantidad > producto.stock_actual) {
      setError(`Stock insuficiente para "${producto.nombre}" (disponible: ${producto.stock_actual})`);
      return;
    }
    setError(null);
    setCarrito(prev => {
      const ya = prev.find(it => it.producto_id === producto.id);
      if (ya) {
        const nuevaCant = ya.cantidad + cantidad;
        if (nuevaCant > producto.stock_actual) {
          setError(`Stock insuficiente para "${producto.nombre}"`);
          return prev;
        }
        return prev.map(it => it.producto_id === producto.id
          ? { ...it, cantidad: nuevaCant }
          : it
        );
      }
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre,
        precio_unitario: Number(producto.precio_unitario),
        cantidad,
        stock_disponible: producto.stock_actual
      }];
    });
  }

  function eliminarDelCarrito(producto_id) {
    setCarrito(prev => prev.filter(it => it.producto_id !== producto_id));
  }

  function limpiarFormulario() {
    setCarrito([]);
    setCliente(null);
    setRucBusqueda('');
    setSunatResult(null);
    setSunatError(null);
    setRazonSocialManual('');
    setTipoComprobante('boleta');
    setFormaPago('efectivo');
    setExito(null);
    setError(null);
    productosApi.listar().then(setProductos).catch(() => {});
  }

  async function registrarVenta() {
    setError(null);
    if (!cliente) { setError('Debes seleccionar un cliente'); return; }
    if (carrito.length === 0) { setError('Agrega al menos un producto'); return; }

    setLoading(true);
    try {
      const r = await ventasApi.registrar({
        cliente_id: cliente.id,
        tipo_comprobante: tipoComprobante,
        forma_pago: formaPago,
        items: carrito.map(it => ({ producto_id: it.producto_id, cantidad: it.cantidad }))
      });
      setExito(r.venta);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al registrar la venta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {error && <Alert tipo="error" titulo="Error">{error}</Alert>}

      {/* Seccion 1 - Cliente */}
      <div className="card">
        <h2 className="text-lg font-semibold text-primary mb-3">1. Cliente</h2>

        {!cliente && (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={rucBusqueda}
                onChange={(e) => setRucBusqueda(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="Ingresa RUC del cliente (11 digitos)"
                className="input-field flex-1"
                maxLength={11}
                disabled={consultandoSunat}
              />
              <Button
                onClick={buscarEnSunat}
                loading={consultandoSunat}
                disabled={consultandoSunat || rucBusqueda.length !== 11}
              >
                {consultandoSunat ? 'Consultando SUNAT...' : 'Buscar en SUNAT'}
              </Button>
            </div>

            {sunatResult && (
              <div className="mt-3 space-y-2">
                <div className={`p-3 rounded border ${
                  sunatResult.estado && sunatResult.estado !== 'ACTIVO'
                    ? 'bg-orange-50 border-orange-300'
                    : 'bg-green-50 border-green-300'
                }`}>
                  <div className="font-semibold text-lg">{sunatResult.razonSocial}</div>
                  <div className="text-sm text-gray-700"><span className="font-medium">RUC:</span> {sunatResult.ruc}</div>
                  {sunatResult.direccion && (
                    <div className="text-sm text-gray-700"><span className="font-medium">Direccion:</span> {sunatResult.direccion}</div>
                  )}
                  {sunatResult.estado && (
                    <div className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">Estado:</span>{' '}
                      <Badge color={sunatResult.estado === 'ACTIVO' ? 'ok' : 'alerta'}>
                        {sunatResult.estado}
                      </Badge>
                      {sunatResult.condicion && (
                        <span className="ml-2 text-xs text-gray-500">({sunatResult.condicion})</span>
                      )}
                    </div>
                  )}
                </div>

                {sunatResult.estado && sunatResult.estado !== 'ACTIVO' && (
                  <Alert tipo="advertencia">
                    Este RUC no esta activo en SUNAT. ¿Desea continuar?
                  </Alert>
                )}

                <Button onClick={confirmarClienteSunat} loading={confirmandoCliente}>
                  Usar este cliente
                </Button>
              </div>
            )}

            {sunatError === 'noEncontrado' && (
              <div className="mt-3 space-y-2">
                <Alert tipo="error">RUC no encontrado en SUNAT</Alert>
                <input
                  type="text"
                  value={razonSocialManual}
                  onChange={(e) => setRazonSocialManual(e.target.value)}
                  placeholder="Razon social del cliente"
                  className="input-field"
                />
                <Button onClick={confirmarClienteManual} loading={confirmandoCliente}>
                  Continuar con este nombre
                </Button>
              </div>
            )}

            {sunatError === 'conexion' && (
              <div className="mt-3 space-y-2">
                <Alert tipo="advertencia">
                  No se pudo conectar con SUNAT. Ingrese el nombre del cliente manualmente.
                </Alert>
                <input
                  type="text"
                  value={razonSocialManual}
                  onChange={(e) => setRazonSocialManual(e.target.value)}
                  placeholder="Razon social del cliente"
                  className="input-field"
                />
                <Button onClick={confirmarClienteManual} loading={confirmandoCliente}>
                  Continuar con este nombre
                </Button>
              </div>
            )}
          </>
        )}

        {cliente && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{cliente.razon_social}</div>
              <div className="text-sm text-gray-600">RUC: {cliente.ruc || 's/RUC'}</div>
              {cliente.direccion && <div className="text-sm text-gray-600">{cliente.direccion}</div>}
              {cliente.telefono && <div className="text-sm text-gray-600">Tel: {cliente.telefono}</div>}
            </div>
            <button
              type="button"
              onClick={reiniciarCliente}
              className="text-sm text-primary hover:underline shrink-0"
            >
              Cambiar cliente
            </button>
          </div>
        )}
      </div>

      {/* Seccion 2 - Productos */}
      <div className="card">
        <h2 className="text-lg font-semibold text-primary mb-3">2. Productos</h2>
        <div className="flex gap-2 mb-3">
          <input
            value={busquedaProd}
            onChange={(e) => setBusquedaProd(e.target.value)}
            placeholder="Buscar producto por nombre"
            className="input-field flex-1"
          />
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="input-field max-w-[200px]">
            <option value="">Todos los tipos</option>
            <option value="eucalipto">Eucalipto</option>
            <option value="varas">Varas</option>
            <option value="vigas">Vigas</option>
            <option value="parantes">Parantes</option>
            <option value="listones">Listones</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="max-h-72 overflow-y-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2">Producto</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-right px-3 py-2">Precio</th>
                <th className="text-right px-3 py-2">Stock</th>
                <th className="px-3 py-2">Accion</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map(p => (
                <FilaProducto key={p.id} producto={p} onAgregar={agregarAlCarrito} />
              ))}
              {productosFiltrados.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-500 py-4">Sin productos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seccion 3 - Carrito */}
      <div className="card">
        <h2 className="text-lg font-semibold text-primary mb-3">3. Carrito</h2>
        {carrito.length === 0 ? (
          <p className="text-gray-500 text-sm">Aun no has agregado productos</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-3 py-2">Producto</th>
                  <th className="text-right px-3 py-2">Cantidad</th>
                  <th className="text-right px-3 py-2">Precio unit.</th>
                  <th className="text-right px-3 py-2">Subtotal</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map(it => (
                  <tr key={it.producto_id} className="border-t">
                    <td className="px-3 py-2">{it.nombre}</td>
                    <td className="text-right px-3 py-2">{it.cantidad}</td>
                    <td className="text-right px-3 py-2">{formatSoles(it.precio_unitario)}</td>
                    <td className="text-right px-3 py-2 font-semibold">{formatSoles(it.precio_unitario * it.cantidad)}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => eliminarDelCarrito(it.producto_id)} className="text-critico hover:text-red-700 font-bold">
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end">
              <div className="w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatSoles(subtotal)}</span></div>
                <div className="flex justify-between"><span>IGV (18%):</span><span>{formatSoles(igv)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold text-lg text-primary">
                  <span>TOTAL:</span><span>{formatSoles(total)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Seccion 4 - Pago */}
      <div className="card">
        <h2 className="text-lg font-semibold text-primary mb-3">4. Pago</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de comprobante</label>
            <select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value)} className="input-field">
              <option value="boleta">Boleta</option>
              <option value="factura">Factura</option>
              <option value="nota_venta">Nota de Venta</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
            <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="input-field">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="yape">Yape</option>
            </select>
          </div>
        </div>
        <Button
          onClick={registrarVenta}
          loading={loading}
          disabled={carrito.length === 0 || !cliente}
          className="w-full md:w-auto"
        >
          Registrar Venta
        </Button>
      </div>

      {/* Modal exito */}
      <Modal open={!!exito} onClose={limpiarFormulario} titulo="Venta registrada con exito">
        {exito && (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-ok">{exito.numero_comprobante}</div>
              <div className="text-sm text-gray-600 capitalize">{exito.tipo_comprobante}</div>
            </div>
            <div className="text-center text-2xl font-bold text-primary">{formatSoles(exito.total)}</div>
            <Badge color="ok" className="block text-center">Comprobante generado correctamente</Badge>
            <Button onClick={limpiarFormulario} className="w-full">Registrar otra venta</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function FilaProducto({ producto, onAgregar }) {
  const [cantidad, setCantidad] = useState(1);
  const stockBajo = producto.stock_actual <= producto.stock_minimo;

  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="px-3 py-2">
        <div className="font-medium">{producto.nombre}</div>
        <div className="text-xs text-gray-500">{producto.dimension}</div>
      </td>
      <td className="px-3 py-2 capitalize">{producto.tipo_madera}</td>
      <td className="text-right px-3 py-2">{formatSoles(producto.precio_unitario)}</td>
      <td className="text-right px-3 py-2">
        {stockBajo ? <Badge color="critico">{producto.stock_actual}</Badge> : producto.stock_actual}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1 justify-center items-center">
          <input
            type="number"
            min={1}
            max={producto.stock_actual}
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 1)}
            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <Button variant="secondary" onClick={() => onAgregar(producto, cantidad)} className="text-xs px-2 py-1">
            Agregar
          </Button>
        </div>
      </td>
    </tr>
  );
}
