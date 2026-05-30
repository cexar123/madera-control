// Genera una ventana imprimible del comprobante (boleta/factura/nota de venta).
// El usuario puede usar "Guardar como PDF" desde el dialogo de impresion del navegador.

const EMPRESA = {
  razon_social: 'Inversiones y Transportes Cesar y Diana E.I.R.L',
  nombre_comercial: 'MaderaControl',
  ruc: '',
  direccion: ''
};

function soles(v) { return `S/. ${Number(v || 0).toFixed(2)}`; }
function fecha(f) { return f ? new Date(f).toLocaleString('es-PE') : '-'; }
function escapar(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function tituloComprobante(tipo) {
  if (tipo === 'factura') return 'FACTURA ELECTRONICA';
  if (tipo === 'boleta') return 'BOLETA DE VENTA ELECTRONICA';
  return 'NOTA DE VENTA';
}

export function abrirComprobanteImprimible(venta) {
  if (!venta) return;
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) {
    alert('Permite las ventanas emergentes para descargar el comprobante.');
    return;
  }

  const itemsHtml = (venta.items || []).map(it => `
    <tr>
      <td>${escapar(it.producto_nombre || it.nombre || '-')}</td>
      <td class="num">${escapar(it.cantidad)}</td>
      <td class="num">${soles(it.precio_unitario)}</td>
      <td class="num">${Number(it.porcentaje_descuento) > 0 ? '-' + Number(it.porcentaje_descuento) + '%' : '-'}</td>
      <td class="num">${soles(it.subtotal)}</td>
    </tr>
  `).join('');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${escapar(venta.numero_comprobante || 'comprobante')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; padding: 32px; font-size: 13px; }
  h1 { font-size: 18px; margin: 0; color: #1e3a8a; }
  h2 { font-size: 14px; margin: 0 0 4px 0; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 16px; }
  .empresa { max-width: 60%; }
  .doc-box { border: 2px solid #1e3a8a; padding: 10px 14px; text-align: center; min-width: 220px; }
  .doc-box .tipo { font-weight: bold; color: #1e3a8a; }
  .doc-box .numero { font-size: 16px; font-weight: bold; margin-top: 4px; }
  .info-cliente { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 16px; }
  .info-cliente div { padding: 4px 0; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.items th, table.items td { border: 1px solid #d1d5db; padding: 6px 8px; }
  table.items th { background: #f3f4f6; text-align: left; }
  td.num, th.num { text-align: right; }
  .totales { margin-top: 16px; display: flex; justify-content: flex-end; }
  .totales table { border-collapse: collapse; }
  .totales td { padding: 4px 12px; }
  .totales .total { font-size: 16px; font-weight: bold; color: #1e3a8a; border-top: 2px solid #1e3a8a; }
  .anulada { margin-top: 16px; padding: 10px; border: 2px solid #b91c1c; color: #b91c1c; font-weight: bold; text-align: center; }
  .pie { margin-top: 32px; font-size: 11px; color: #6b7280; text-align: center; border-top: 1px solid #d1d5db; padding-top: 10px; }
  @media print {
    body { padding: 12px; }
    .no-print { display: none; }
  }
  .acciones { text-align: right; margin-bottom: 16px; }
  .btn { background: #1e3a8a; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
</style>
</head>
<body>
  <div class="acciones no-print">
    <button class="btn" onclick="window.print()">Descargar / Imprimir</button>
  </div>

  <div class="header">
    <div class="empresa">
      <h1>${escapar(EMPRESA.razon_social)}</h1>
      <div>${escapar(EMPRESA.nombre_comercial)}</div>
      ${EMPRESA.ruc ? `<div>RUC: ${escapar(EMPRESA.ruc)}</div>` : ''}
      ${EMPRESA.direccion ? `<div>${escapar(EMPRESA.direccion)}</div>` : ''}
    </div>
    <div class="doc-box">
      <div class="tipo">${tituloComprobante(venta.tipo_comprobante || venta.tipo)}</div>
      <div class="numero">${escapar(venta.numero_comprobante || '-')}</div>
      <div style="margin-top:4px;">${fecha(venta.created_at)}</div>
    </div>
  </div>

  <div class="info-cliente">
    <div><b>Cliente:</b> ${escapar(venta.cliente_razon_social || 'Sin cliente')}</div>
    <div><b>RUC / DNI:</b> ${escapar(venta.cliente_ruc || '-')}</div>
    <div><b>Vendedor:</b> ${escapar(venta.usuario_nombre || '-')}</div>
    <div><b>Forma de pago:</b> ${escapar(venta.forma_pago || '-')}</div>
    <div><b>Tipo de entrega:</b> ${escapar((venta.tipo_entrega || '-').replace(/_/g, ' '))}</div>
    ${venta.direccion_entrega ? `<div><b>Direccion:</b> ${escapar(venta.direccion_entrega)}</div>` : ''}
  </div>

  <table class="items">
    <thead>
      <tr>
        <th>Producto</th>
        <th class="num">Cant.</th>
        <th class="num">P. Unit.</th>
        <th class="num">Desc.</th>
        <th class="num">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml || '<tr><td colspan="5" style="text-align:center;color:#6b7280">Sin items</td></tr>'}
    </tbody>
  </table>

  <div class="totales">
    <table>
      ${Number(venta.descuento_total) > 0 ? `<tr><td>Descuento por volumen:</td><td class="num">- ${soles(venta.descuento_total)}</td></tr>` : ''}
      <tr><td>Subtotal:</td><td class="num">${soles(venta.subtotal)}</td></tr>
      <tr><td>IGV (18%):</td><td class="num">${soles(venta.igv)}</td></tr>
      <tr class="total"><td>TOTAL:</td><td class="num">${soles(venta.total)}</td></tr>
    </table>
  </div>

  ${venta.estado === 'anulada' ? `
    <div class="anulada">
      COMPROBANTE ANULADO<br/>
      <span style="font-weight:normal;font-size:12px;">${escapar(venta.motivo_anulacion || '')}</span>
    </div>
  ` : ''}

  <div class="pie">
    Documento generado por MaderaControl v1.0 - ${new Date().toLocaleString('es-PE')}
  </div>

  <script>
    window.onload = function () { setTimeout(function(){ window.print(); }, 300); };
  </script>
</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}
