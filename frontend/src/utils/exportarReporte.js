// Exporta el reporte de ventas en Excel (.xls) y PDF (ventana imprimible).
// No requiere librerias externas: Excel se genera como tabla HTML con MIME
// de Excel y el PDF se obtiene con "Guardar como PDF" del dialogo de impresion.

const EMPRESA = 'Inversiones y Transportes Cesar y Diana E.I.R.L';

function soles(v) { return `S/. ${Number(v || 0).toFixed(2)}`; }
function fecha(f) { return f ? new Date(f).toLocaleString('es-PE') : '-'; }
function escapar(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function descripcionFiltros(filtros = {}) {
  const partes = [];
  if (filtros.fecha_inicio) partes.push(`Desde: ${filtros.fecha_inicio}`);
  if (filtros.fecha_fin) partes.push(`Hasta: ${filtros.fecha_fin}`);
  if (filtros.tipo) partes.push(`Comprobante: ${filtros.tipo}`);
  if (filtros.estado) partes.push(`Estado: ${filtros.estado}`);
  return partes.length ? partes.join(' | ') : 'Todas las ventas';
}

function filasVentas(ventas) {
  return ventas.map(v => `
    <tr>
      <td>${escapar(v.numero_comprobante)}</td>
      <td>${escapar((v.tipo_comprobante || '').replace('_', ' '))}</td>
      <td>${escapar(fecha(v.created_at))}</td>
      <td>${escapar(v.cliente_razon_social || '-')}</td>
      <td>${escapar(v.cliente_ruc ? `${v.cliente_tipo_documento || 'RUC'} ${v.cliente_ruc}` : '-')}</td>
      <td>${escapar(v.forma_pago || '-')}</td>
      <td>${escapar(v.estado || '-')}</td>
      <td style="text-align:right">${soles(v.subtotal)}</td>
      <td style="text-align:right">${soles(v.igv)}</td>
      <td style="text-align:right">${soles(v.total)}</td>
    </tr>
  `).join('');
}

function tablaVentas(ventas) {
  const confirmadas = ventas.filter(v => v.estado !== 'anulada');
  const totalGeneral = confirmadas.reduce((s, v) => s + Number(v.total || 0), 0);
  return `
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:12px;">
      <thead>
        <tr style="background:#1e3a5f;color:#ffffff;">
          <th>Comprobante</th>
          <th>Tipo</th>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Documento</th>
          <th>Pago</th>
          <th>Estado</th>
          <th>Subtotal</th>
          <th>IGV</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${filasVentas(ventas) || '<tr><td colspan="10" style="text-align:center">Sin ventas</td></tr>'}
      </tbody>
      <tfoot>
        <tr style="background:#f3f4f6;font-weight:bold;">
          <td colspan="9" style="text-align:right">TOTAL (ventas confirmadas: ${confirmadas.length}):</td>
          <td style="text-align:right">${soles(totalGeneral)}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

export function exportarVentasExcel(ventas, filtros = {}) {
  const html = `
    <html xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="utf-8" /></head>
    <body>
      <h2>${escapar(EMPRESA)} - Reporte de ventas</h2>
      <p>${escapar(descripcionFiltros(filtros))} — Generado: ${escapar(new Date().toLocaleString('es-PE'))}</p>
      ${tablaVentas(ventas)}
    </body>
    </html>
  `;
  const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte_ventas_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportarVentasPDF(ventas, filtros = {}) {
  const w = window.open('', '_blank', 'width=1000,height=800');
  if (!w) {
    alert('Permite las ventanas emergentes para descargar el reporte.');
    return;
  }
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Reporte de ventas</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; padding: 24px; }
  h1 { font-size: 18px; color: #1e3a8a; margin: 0 0 4px 0; }
  .sub { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
  th, td { border: 1px solid #d1d5db; }
  @media print { .no-print { display: none; } }
  .btn { background: #1e3a8a; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
</style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:12px;">
    <button class="btn" onclick="window.print()">Descargar / Imprimir</button>
  </div>
  <h1>${escapar(EMPRESA)} - Reporte de ventas</h1>
  <div class="sub">${escapar(descripcionFiltros(filtros))} — Generado: ${escapar(new Date().toLocaleString('es-PE'))}</div>
  ${tablaVentas(ventas)}
  <script>window.onload = function () { setTimeout(function(){ window.print(); }, 300); };</script>
</body>
</html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
