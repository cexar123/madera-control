// Autor: Miembro 5
// MaderaControl v2.0 - Gestion de descuentos por volumen (solo gerente)

import { useEffect, useState } from 'react';

import { descuentosApi } from '../../api/descuentos.api';

import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Alert from '../../components/ui/Alert.jsx';

const TIPOS_MADERA = ['eucalipto','varas','vigas','parantes','listones','otro'];

const ESTADO_VACIO = {
  nombre: '',
  tipo_madera: '',
  cantidad_minima: 10,
  porcentaje_descuento: 5,
  activo: true
};

export default function Descuentos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(ESTADO_VACIO);
  const [errorForm, setErrorForm] = useState(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      setItems(await descuentosApi.listar(false));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditando('nuevo');
    setForm(ESTADO_VACIO);
    setErrorForm(null);
  }
  function abrirEditar(d) {
    setEditando(d.id);
    setForm({
      nombre: d.nombre,
      tipo_madera: d.tipo_madera || '',
      cantidad_minima: d.cantidad_minima,
      porcentaje_descuento: Number(d.porcentaje_descuento),
      activo: d.activo
    });
    setErrorForm(null);
  }

  async function guardar() {
    setErrorForm(null);
    if (!form.nombre.trim()) { setErrorForm('El nombre es obligatorio'); return; }
    if (Number(form.cantidad_minima) <= 0) { setErrorForm('La cantidad minima debe ser > 0'); return; }
    const pct = Number(form.porcentaje_descuento);
    if (pct < 0 || pct > 50) { setErrorForm('El porcentaje debe estar entre 0 y 50'); return; }

    setGuardando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        tipo_madera: form.tipo_madera || null,
        cantidad_minima: parseInt(form.cantidad_minima, 10),
        porcentaje_descuento: pct,
        activo: !!form.activo
      };
      if (editando === 'nuevo') await descuentosApi.crear(payload);
      else await descuentosApi.actualizar(editando, payload);
      setEditando(null);
      cargar();
    } catch (e) {
      setErrorForm(e.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(d) {
    if (!confirm(`¿Desactivar el descuento "${d.nombre}"?`)) return;
    try {
      await descuentosApi.eliminar(d.id);
      cargar();
    } catch (e) {
      alert(e.response?.data?.error || 'Error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-primary">Descuentos por volumen</h2>
          <p className="text-sm text-gray-600">
            Se aplican automaticamente al registrar una venta segun la cantidad de unidades.
          </p>
        </div>
        <Button onClick={abrirNuevo}>+ Nuevo descuento</Button>
      </div>

      {error && <Alert tipo="error">{error}</Alert>}

      <div className="card">
        {loading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">Nombre</th>
                <th className="text-left px-3 py-2">Tipo de madera</th>
                <th className="text-right px-3 py-2">Cantidad minima</th>
                <th className="text-right px-3 py-2">% Descuento</th>
                <th className="text-center px-3 py-2">Estado</th>
                <th className="text-center px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(d => (
                <tr key={d.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{d.nombre}</td>
                  <td className="px-3 py-2 capitalize">{d.tipo_madera || 'Todos'}</td>
                  <td className="text-right px-3 py-2">{d.cantidad_minima}</td>
                  <td className="text-right px-3 py-2 font-semibold text-ok">{Number(d.porcentaje_descuento)}%</td>
                  <td className="text-center px-3 py-2">
                    <Badge color={d.activo ? 'ok' : 'critico'}>{d.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="text-center px-3 py-2 space-x-2">
                    <button className="text-primary hover:underline text-sm" onClick={() => abrirEditar(d)}>
                      Editar
                    </button>
                    {d.activo && (
                      <button className="text-critico hover:underline text-sm" onClick={() => desactivar(d)}>
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-500 py-6">
                  Aun no hay reglas de descuento configuradas
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={editando !== null} onClose={() => setEditando(null)}
             titulo={editando === 'nuevo' ? 'Nuevo descuento por volumen' : 'Editar descuento'}>
        <div className="space-y-3">
          {errorForm && <Alert tipo="error">{errorForm}</Alert>}
          <div>
            <label className="block text-sm font-medium mb-1">Nombre del descuento</label>
            <input className="input-field"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Promocion mayorista 10+" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Aplica a tipo de madera</label>
              <select className="input-field"
                value={form.tipo_madera}
                onChange={(e) => setForm({ ...form, tipo_madera: e.target.value })}>
                <option value="">Todos los tipos</option>
                {TIPOS_MADERA.map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cantidad minima</label>
              <input type="number" min={1} className="input-field"
                value={form.cantidad_minima}
                onChange={(e) => setForm({ ...form, cantidad_minima: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">% de descuento (0-50)</label>
              <input type="number" min={0} max={50} step={0.5} className="input-field"
                value={form.porcentaje_descuento}
                onChange={(e) => setForm({ ...form, porcentaje_descuento: e.target.value })} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox"
                  checked={!!form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                Activo
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={guardar} loading={guardando}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
