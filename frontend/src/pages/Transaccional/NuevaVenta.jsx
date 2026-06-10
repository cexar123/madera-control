// MaderaControl v2.0 - Pagina de registro de nueva venta
// Cinco secciones: cliente -> productos -> carrito (con descuentos en vivo)
// -> entrega (recojo/delivery) -> pago.

import { useEffect, useMemo, useRef, useState } from 'react';

import { productosApi } from '../../api/productos.api';
import { ventasApi } from '../../api/ventas.api';
import { clientesApi } from '../../api/clientes.api';

import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { abrirComprobanteImprimible } from '../../utils/comprobante';

const IGV_RATE = 0.18;

function formatSoles(v) {
  return `S/. ${Number(v || 0).toFixed(2)}`;
}

function isoLocalAhora(plusMinutes = 60) {
  const d = new Date(Date.now() + plusMinutes * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NuevaVenta() {
  const [productos, setProductos] = useState([]);
  const [busquedaProd, setBusquedaProd] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [preview, setPreview] = useState({ items: [], subtotal: 0, descuento_total: 0 });

  // Tipo de documento del cliente: DNI (boleta) o RUC (factura)
  const [tipoDoc, setTipoDoc] = useState('DNI');
  const [docBusqueda, setDocBusqueda] = useState('');
  const [cliente, setCliente] = useState(null);
  const [consultandoDoc, setConsultandoDoc] = useState(false);
  const [docResult, setDocResult] = useState(null);
  const [docError, setDocError] = useState(null);
  const [razonSocialManual, setRazonSocialManual] = useState('');
  const [confirmandoCliente, setConfirmandoCliente] = useState(false);

  const largoDoc = tipoDoc === 'RUC' ? 11 : 8;
  const entidadConsulta = tipoDoc === 'RUC' ? 'SUNAT' : 'RENIEC';

  const [tipoComprobante, setTipoComprobante] = useState('boleta');
  const [formaPago, setFormaPago] = useState('efectivo');

  const [tipoEntrega, setTipoEntrega] = useState('recojo_inmediato');
  const [fechaRecojo, setFechaRecojo] = useState(isoLocalAhora(60));
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [contactoEntrega, setContactoEntrega] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const previewTimer = useRef(null);

  useEffect(() => {
    productosApi.listar().then(setProductos).catch(() => setProductos([]));
  }, []);

  // Refrescar previsualizacion de descuentos cuando cambie el carrito
  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    if (carrito.length === 0) {
      setPreview({ items: [], subtotal: 0, descuento_total: 0 });
      return;
    }
    previewTimer.current = setTimeout(async () => {
      try {
        const r = await ventasApi.previsualizar(
          carrito.map(it => ({ producto_id: it.producto_id, cantidad: it.cantidad }))
        );
        setPreview(r);
      } catch {
        // si falla preview, calculamos local sin descuento
        const subtotal = carrito.reduce((s, it) => s + it.precio_unitario * it.cantidad, 0);
        setPreview({ items: [], subtotal, descuento_total: 0 });
      }
    }, 300);
    return () => previewTimer.current && clearTimeout(previewTimer.current);
  }, [carrito]);

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      if (!p.activo && p.activo !== undefined) return false;
      if (tipoFiltro && p.tipo_madera !== tipoFiltro) return false;
      if (busquedaProd && !p.nombre.toLowerCase().includes(busquedaProd.toLowerCase())) return false;
      return true;
    });
  }, [productos, tipoFiltro, busquedaProd]);

  // Calculos de totales (usa preview del backend cuando esta disponible)
  const subtotalBruto = useMemo(
    () => carrito.reduce((s, it) => s + it.precio_unitario * it.cantidad, 0),
    [carrito]
  );
  const subtotalNeto = preview.subtotal || subtotalBruto;
  const descuentoTotal = preview.descuento_total || 0;
  const igv = tipoComprobante === 'nota_venta' ? 0 : subtotalNeto * IGV_RATE;
  const total = subtotalNeto + igv;

  // Map producto_id -> info de descuento del preview
  const descuentoPorProd = useMemo(() => {
    const m = {};
    (preview.items || []).forEach(p => {
      if (p.producto_id) m[p.producto_id] = p;
    });
    return m;
  }, [preview]);

  // -------------------- Cliente (SUNAT / RENIEC) --------------------
  function cambiarTipoDoc(nuevoTipo) {
    setTipoDoc(nuevoTipo);
    setDocBusqueda('');
    setDocResult(null);
    setDocError(null);
    setRazonSocialManual('');
    setCliente(null);
    // El documento determina el comprobante: DNI -> boleta, RUC -> factura
    setTipoComprobante(nuevoTipo === 'RUC' ? 'factura' : 'boleta');
  }

  async function buscarDocumento() {
    setError(null);
    setDocResult(null);
    setDocError(null);
    setRazonSocialManual('');
    setCliente(null);

    const regex = tipoDoc === 'RUC' ? /^\d{11}$/ : /^\d{8}$/;
    if (!regex.test(docBusqueda)) {
      setError(`El ${tipoDoc} debe tener exactamente ${largoDoc} digitos numericos`);
      return;
    }
    setConsultandoDoc(true);
    try {
      if (tipoDoc === 'RUC') {
        const data = await clientesApi.consultarRuc(docBusqueda);
        setDocResult({
          tipo: 'RUC',
          numero: data.ruc,
          nombre: data.razonSocial,
          direccion: data.direccion,
          estado: data.estado,
          condicion: data.condicion
        });
      } else {
        const data = await clientesApi.consultarDni(docBusqueda);
        setDocResult({
          tipo: 'DNI',
          numero: data.dni,
          nombre: data.nombreCompleto
        });
      }
    } catch (e) {
      const status = e.response?.status;
      if (status === 404) setDocError('noEncontrado');
      else if (status === 503) setDocError('conexion');
      else setError(e.response?.data?.error || `Error al consultar ${entidadConsulta}`);
    } finally {
      setConsultandoDoc(false);
    }
  }

  async function confirmarClienteConsultado() {
    if (!docResult) return;
    setError(null);
    setConfirmandoCliente(true);
    try {
      const c = await clientesApi.findOrCreate(
        docResult.numero,
        docResult.nombre,
        { direccion: docResult.direccion, tipo_documento: docResult.tipo }
      );
      if (!c || !c.id) throw new Error('No se pudo guardar el cliente');
      setCliente(c);
      if (c.tipo_documento === 'DNI' && tipoComprobante === 'factura') {
        setTipoComprobante('boleta');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Error al guardar el cliente');
    } finally {
      setConfirmandoCliente(false);
    }
  }

  async function confirmarClienteManual() {
    const nombre = (razonSocialManual || '').trim();
    if (!nombre) {
      setError(tipoDoc === 'RUC' ? 'Debe ingresar la razon social' : 'Debe ingresar el nombre del cliente');
      return;
    }
    setError(null);
    setConfirmandoCliente(true);
    try {
      const c = await clientesApi.findOrCreate(docBusqueda || null, nombre, { tipo_documento: tipoDoc });
      if (!c || !c.id) throw new Error('No se pudo guardar el cliente');
      setCliente(c);
      if (c.tipo_documento === 'DNI' && tipoComprobante === 'factura') {
        setTipoComprobante('boleta');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Error al guardar el cliente');
    } finally {
      setConfirmandoCliente(false);
    }
  }

  function reiniciarCliente() {
    setCliente(null);
    setDocBusqueda('');
    setDocResult(null);
    setDocError(null);
    setRazonSocialManual('');
  }

  // -------------------- Carrito --------------------
  function agregarAlCarrito(producto, cantidad) {
    setError(null);
    if (!cantidad || cantidad <= 0) { setError('La cantidad debe ser mayor que 0'); return; }
    if (cantidad > producto.stock_actual) {
      setError(`Stock insuficiente para "${producto.nombre}" (disponible: ${producto.stock_actual})`);
      return;
    }
    setCarrito(prev => {
      const ya = prev.find(it => it.producto_id === producto.id);
      if (ya) {
        const nuevaCant = ya.cantidad + cantidad;
        if (nuevaCant > producto.stock_actual) {
          setError(`Stock insuficiente para "${producto.nombre}"`);
          return prev;
        }
        return prev.map(it => it.producto_id === producto.id ? { ...it, cantidad: nuevaCant } : it);
      }
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre,
        tipo_madera: producto.tipo_madera,
        precio_unitario: Number(producto.precio_unitario),
        cantidad,
        stock_disponible: producto.stock_actual
      }];
    });
  }

  function cambiarCantidad(producto_id, delta) {
    setCarrito(prev => prev.map(it => {
      if (it.producto_id !== producto_id) return it;
      const nuevaCant = it.cantidad + delta;
      if (nuevaCant <= 0) return it;
      if (nuevaCant > it.stock_disponible) {
        setError(`Stock insuficiente para "${it.nombre}"`);
        return it;
      }
      return { ...it, cantidad: nuevaCant };
    }));
  }

  function eliminarDelCarrito(producto_id) {
    setCarrito(prev => prev.filter(it => it.producto_id !== producto_id));
  }

  function limpiarFormulario() {
    setCarrito([]);
    setCliente(null);
    setTipoDoc('DNI');
    setDocBusqueda('');
    setDocResult(null);
    setDocError(null);
    setRazonSocialManual('');
    setTipoComprobante('boleta');
    setFormaPago('efectivo');
    setTipoEntrega('recojo_inmediato');
    setFechaRecojo(isoLocalAhora(60));
    setDireccionEntrega('');
    setContactoEntrega('');
    setExito(null);
    setError(null);
    productosApi.listar().then(setProductos).catch(() => {});
  }

  // -------------------- Validacion + envio --------------------
  const validacion = useMemo(() => {
    if (!cliente) return { ok: false, motivo: 'Selecciona un cliente' };
    if (tipoComprobante === 'factura' && cliente.tipo_documento !== 'RUC') {
      return { ok: false, motivo: 'Para emitir una factura el cliente debe tener RUC' };
    }
    if (tipoComprobante === 'boleta' && !cliente.ruc) {
      return { ok: false, motivo: 'Para emitir una boleta el cliente debe tener DNI' };
    }
    if (carrito.length === 0) return { ok: false, motivo: 'Agrega al menos un producto' };
    if (tipoEntrega === 'recojo_programado' && !fechaRecojo) {
      return { ok: false, motivo: 'Indica la fecha de recojo' };
    }
    if (tipoEntrega === 'delivery' && !direccionEntrega.trim()) {
      return { ok: false, motivo: 'Indica la direccion de entrega' };
    }
    return { ok: true };
  }, [cliente, carrito, tipoComprobante, tipoEntrega, fechaRecojo, direccionEntrega]);

  async function registrarVenta() {
    setError(null);
    if (!validacion.ok) { setError(validacion.motivo); return; }

    setLoading(true);
    try {
      const payload = {
        cliente_id: cliente.id,
        tipo_comprobante: tipoComprobante,
        forma_pago: formaPago,
        items: carrito.map(it => ({ producto_id: it.producto_id, cantidad: it.cantidad })),
        tipo_entrega: tipoEntrega
      };
      if (tipoEntrega === 'recojo_programado') payload.fecha_recojo = fechaRecojo;
      if (tipoEntrega === 'delivery') {
        payload.direccion_entrega = direccionEntrega.trim();
        payload.contacto_entrega = contactoEntrega.trim() || null;
      }
      const r = await ventasApi.registrar(payload);
      setExito(r.venta);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Error al registrar la venta');
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
            <div className="flex flex-wrap gap-3 mb-3">
              {[
                { val: 'DNI', label: 'DNI (Boleta)' },
                { val: 'RUC', label: 'RUC (Factura)' }
              ].map(opt => (
                <label key={opt.val} className={`flex items-center gap-2 px-3 py-2 border rounded cursor-pointer ${
                  tipoDoc === opt.val ? 'border-primary bg-blue-50' : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="tipoDoc"
                    value={opt.val}
                    checked={tipoDoc === opt.val}
                    onChange={(e) => cambiarTipoDoc(e.target.value)}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={docBusqueda}
                onChange={(e) => setDocBusqueda(e.target.value.replace(/\D/g, '').slice(0, largoDoc))}
                placeholder={`Ingresa ${tipoDoc} del cliente (${largoDoc} digitos)`}
                className="input-field flex-1"
                disabled={consultandoDoc}
              />
              <Button
                onClick={buscarDocumento}
                loading={consultandoDoc}
                disabled={consultandoDoc || docBusqueda.length !== largoDoc}
              >
                {consultandoDoc ? `Consultando ${entidadConsulta}...` : `Buscar en ${entidadConsulta}`}
              </Button>
            </div>

            {docResult && (
              <div className="mt-3 space-y-2">
                <div className={`p-3 rounded border ${
                  docResult.estado && docResult.estado !== 'ACTIVO'
                    ? 'bg-orange-50 border-orange-300'
                    : 'bg-green-50 border-green-300'
                }`}>
                  <div className="font-semibold text-lg">{docResult.nombre}</div>
                  <div className="text-sm text-gray-700"><b>{docResult.tipo}:</b> {docResult.numero}</div>
                  {docResult.direccion && (
                    <div className="text-sm text-gray-700"><b>Direccion:</b> {docResult.direccion}</div>
                  )}
                  {docResult.estado && (
                    <div className="text-sm text-gray-700 mt-1">
                      <b>Estado:</b>{' '}
                      <Badge color={docResult.estado === 'ACTIVO' ? 'ok' : 'alerta'}>
                        {docResult.estado}
                      </Badge>
                      {docResult.condicion && (
                        <span className="ml-2 text-xs text-gray-500">({docResult.condicion})</span>
                      )}
                    </div>
                  )}
                </div>
                {docResult.estado && docResult.estado !== 'ACTIVO' && (
                  <Alert tipo="advertencia">
                    Este RUC no esta activo en SUNAT. ¿Desea continuar?
                  </Alert>
                )}
                <Button onClick={confirmarClienteConsultado} loading={confirmandoCliente}>
                  Usar este cliente
                </Button>
              </div>
            )}

            {docError === 'noEncontrado' && (
              <div className="mt-3 space-y-2">
                <Alert tipo="error">{tipoDoc} no encontrado en {entidadConsulta}</Alert>
                <input
                  value={razonSocialManual}
                  onChange={(e) => setRazonSocialManual(e.target.value)}
                  placeholder={tipoDoc === 'RUC' ? 'Razon social del cliente' : 'Nombre completo del cliente'}
                  className="input-field"
                />
                <Button onClick={confirmarClienteManual} loading={confirmandoCliente}>
                  Continuar con este nombre
                </Button>
              </div>
            )}

            {docError === 'conexion' && (
              <div className="mt-3 space-y-2">
                <Alert tipo="advertencia">
                  No se pudo conectar con {entidadConsulta}. Ingrese el nombre del cliente manualmente.
                </Alert>
                <input
                  value={razonSocialManual}
                  onChange={(e) => setRazonSocialManual(e.target.value)}
                  placeholder={tipoDoc === 'RUC' ? 'Razon social del cliente' : 'Nombre completo del cliente'}
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
              <div className="text-sm text-gray-600">
                {cliente.tipo_documento || 'RUC'}: {cliente.ruc || 'sin documento'}
              </div>
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
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}
                  className="input-field max-w-[200px]">
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
                  <th className="text-center px-3 py-2">Cantidad</th>
                  <th className="text-right px-3 py-2">Precio</th>
                  <th className="text-right px-3 py-2">Descuento</th>
                  <th className="text-right px-3 py-2">Subtotal</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map(it => {
                  const desc = descuentoPorProd[it.producto_id];
                  const pct = desc?.porcentaje_descuento || 0;
                  const precioFinal = desc?.precio_final ?? it.precio_unitario;
                  const sub = (desc?.subtotal) ?? (it.precio_unitario * it.cantidad);
                  return (
                    <tr key={it.producto_id} className="border-t">
                      <td className="px-3 py-2">{it.nombre}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => cambiarCantidad(it.producto_id, -1)}
                                  className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300">-</button>
                          <span className="w-8 text-center font-semibold">{it.cantidad}</span>
                          <button onClick={() => cambiarCantidad(it.producto_id, +1)}
                                  className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300">+</button>
                        </div>
                      </td>
                      <td className="text-right px-3 py-2">
                        {pct > 0 ? (
                          <div>
                            <div className="text-xs text-gray-400 line-through">{formatSoles(it.precio_unitario)}</div>
                            <div>{formatSoles(precioFinal)}</div>
                          </div>
                        ) : formatSoles(it.precio_unitario)}
                      </td>
                      <td className="text-right px-3 py-2">
                        {pct > 0 ? <Badge color="ok">-{pct}%</Badge> : <span className="text-gray-400 text-xs">-</span>}
                      </td>
                      <td className="text-right px-3 py-2 font-semibold">{formatSoles(sub)}</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => eliminarDelCarrito(it.producto_id)}
                                className="text-critico hover:text-red-700 font-bold">&times;</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end">
              <div className="w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal sin descuento:</span><span>{formatSoles(subtotalBruto)}</span>
                </div>
                {descuentoTotal > 0 && (
                  <div className="flex justify-between text-ok font-semibold">
                    <span>Ahorro por volumen:</span><span>- {formatSoles(descuentoTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1">
                  <span>Subtotal:</span><span>{formatSoles(subtotalNeto)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGV (18%):</span><span>{formatSoles(igv)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-lg text-primary">
                  <span>TOTAL:</span><span>{formatSoles(total)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Seccion 4 - Entrega */}
      <div className="card">
        <h2 className="text-lg font-semibold text-primary mb-3">4. Entrega / Recojo</h2>
        <div className="flex flex-wrap gap-3 mb-3">
          {[
            { val: 'recojo_inmediato', label: 'Recojo inmediato (se lleva ahora)' },
            { val: 'recojo_programado', label: 'Recojo programado' },
            { val: 'delivery', label: 'Delivery a domicilio' }
          ].map(opt => (
            <label key={opt.val} className={`flex items-center gap-2 px-3 py-2 border rounded cursor-pointer ${
              tipoEntrega === opt.val ? 'border-primary bg-blue-50' : 'border-gray-300'
            }`}>
              <input
                type="radio"
                name="tipoEntrega"
                value={opt.val}
                checked={tipoEntrega === opt.val}
                onChange={(e) => setTipoEntrega(e.target.value)}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>

        {tipoEntrega === 'recojo_programado' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora de recojo</label>
              <input
                type="datetime-local"
                value={fechaRecojo}
                onChange={(e) => setFechaRecojo(e.target.value)}
                min={isoLocalAhora(15)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contacto en el local (opcional)</label>
              <input
                value={contactoEntrega}
                onChange={(e) => setContactoEntrega(e.target.value)}
                placeholder="Nombre y telefono"
                className="input-field"
              />
            </div>
          </div>
        )}

        {tipoEntrega === 'delivery' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Direccion de entrega</label>
              <input
                value={direccionEntrega}
                onChange={(e) => setDireccionEntrega(e.target.value)}
                placeholder="Av., distrito, referencia"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contacto de recepcion</label>
              <input
                value={contactoEntrega}
                onChange={(e) => setContactoEntrega(e.target.value)}
                placeholder="Nombre y telefono"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha estimada (opcional)</label>
              <input
                type="datetime-local"
                value={fechaRecojo}
                onChange={(e) => setFechaRecojo(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        )}
      </div>

      {/* Seccion 5 - Pago */}
      <div className="card">
        <h2 className="text-lg font-semibold text-primary mb-3">5. Pago</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de comprobante</label>
            <select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value)} className="input-field">
              <option value="boleta">Boleta (con DNI)</option>
              <option value="factura" disabled={!!cliente && cliente.tipo_documento !== 'RUC'}>
                Factura (requiere RUC)
              </option>
              <option value="nota_venta">Nota de Venta (sin IGV)</option>
            </select>
            {cliente && cliente.tipo_documento !== 'RUC' && (
              <p className="text-xs text-gray-500 mt-1">
                Las facturas solo se emiten a clientes con RUC.
              </p>
            )}
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

        {!validacion.ok && (
          <Alert tipo="advertencia" className="mb-3">{validacion.motivo}</Alert>
        )}

        <Button
          onClick={registrarVenta}
          loading={loading}
          disabled={loading || !validacion.ok}
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
            {Number(exito.descuento_total) > 0 && (
              <div className="text-center text-sm text-ok">
                Ahorro por volumen aplicado: {formatSoles(exito.descuento_total)}
              </div>
            )}
            <Badge color="ok" className="block text-center">Comprobante generado correctamente</Badge>
            {exito.tipo_entrega && exito.tipo_entrega !== 'recojo_inmediato' && (
              <div className="bg-orange-50 border border-orange-300 rounded p-3 text-sm">
                <div className="font-semibold mb-1">Entrega programada</div>
                <div>Tipo: {exito.tipo_entrega.replace('_', ' ')}</div>
                {exito.fecha_recojo && <div>Fecha: {new Date(exito.fecha_recojo).toLocaleString('es-PE')}</div>}
                {exito.direccion_entrega && <div>Direccion: {exito.direccion_entrega}</div>}
              </div>
            )}
            <Button variant="secondary" onClick={() => abrirComprobanteImprimible(exito)} className="w-full">
              Descargar / Imprimir comprobante
            </Button>
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
  const sinStock = producto.stock_actual <= 0;

  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="px-3 py-2">
        <div className="font-medium">{producto.nombre}</div>
        <div className="text-xs text-gray-500">{producto.dimension}</div>
      </td>
      <td className="px-3 py-2 capitalize">{producto.tipo_madera}</td>
      <td className="text-right px-3 py-2">{formatSoles(producto.precio_unitario)}</td>
      <td className="text-right px-3 py-2">
        {sinStock ? <Badge color="critico">Agotado</Badge>
          : stockBajo ? <Badge color="alerta">{producto.stock_actual}</Badge>
          : producto.stock_actual}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1 justify-center items-center">
          <input
            type="number" min={1} max={producto.stock_actual}
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 1)}
            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
            disabled={sinStock}
          />
          <Button variant="secondary"
                  onClick={() => onAgregar(producto, cantidad)}
                  disabled={sinStock}
                  className="text-xs px-2 py-1">
            Agregar
          </Button>
        </div>
      </td>
    </tr>
  );
}
