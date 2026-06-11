// Capa de acceso a datos de clientes

const { query } = require('../config/db');

async function getAllClientes() {
  const sql = `
    SELECT id, ruc, tipo_documento, razon_social, direccion, telefono, created_at
    FROM clientes
    ORDER BY razon_social ASC
  `;
  const result = await query(sql);
  return result.rows;
}

async function findById(id) {
  const sql = `SELECT * FROM clientes WHERE id = $1 LIMIT 1`;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

async function findByRuc(ruc) {
  if (!ruc) return null;
  const sql = `SELECT * FROM clientes WHERE ruc = $1 LIMIT 1`;
  const result = await query(sql, [ruc]);
  return result.rows[0] || null;
}

async function buscar(termino) {
  const sql = `
    SELECT id, ruc, tipo_documento, razon_social, direccion, telefono, created_at
    FROM clientes
    WHERE ruc ILIKE $1 OR razon_social ILIKE $1
    ORDER BY razon_social ASC
    LIMIT 50
  `;
  const result = await query(sql, [`%${termino}%`]);
  return result.rows;
}

function inferirTipoDocumento(numero) {
  if (!numero) return null;
  return String(numero).length === 8 ? 'DNI' : 'RUC';
}

async function createCliente(datos) {
  const sql = `
    INSERT INTO clientes (ruc, tipo_documento, razon_social, direccion, telefono)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const result = await query(sql, [
    datos.ruc || null,
    datos.tipo_documento || inferirTipoDocumento(datos.ruc),
    datos.razon_social,
    datos.direccion || null,
    datos.telefono || null
  ]);
  return result.rows[0];
}

async function findOrCreate(ruc, razon_social, extras = {}) {
  if (ruc) {
    const existente = await findByRuc(ruc);
    if (existente) return existente;
  }
  return createCliente({
    ruc,
    tipo_documento: extras.tipo_documento || inferirTipoDocumento(ruc),
    razon_social: razon_social || 'Cliente sin razon social',
    direccion: extras.direccion,
    telefono: extras.telefono
  });
}

async function consultarRucSunat(ruc) {
  if (!/^\d{11}$/.test(String(ruc || ''))) {
    return { error: 'invalido' };
  }

  const baseUrl = process.env.SUNAT_API_URL || 'https://api.apis.net.pe/v2/sunat/ruc';
  const url = `${baseUrl}?numero=${ruc}`;
  const headers = { Accept: 'application/json' };
  if (process.env.SUNAT_API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.SUNAT_API_TOKEN}`;
  }

  let response;
  try {
    response = await fetch(url, { method: 'GET', headers });
  } catch (e) {
    return { error: 'conexion' };
  }

  if (response.status === 404 || response.status === 422) {
    return null;
  }
  if (!response.ok) {
    return { error: 'conexion' };
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    return { error: 'conexion' };
  }

  if (!data || (!data.numero_documento && !data.numeroDocumento && !data.ruc && !data.razon_social && !data.razonSocial && !data.nombre)) {
    return null;
  }

  return {
    ruc: data.numero_documento || data.numeroDocumento || data.ruc || ruc,
    razonSocial: data.razon_social || data.razonSocial || data.nombre || '',
    direccion: data.direccion || data.direccion_completa || '',
    estado: data.estado || '',
    condicion: data.condicion || ''
  };
}

async function consultarDniReniec(dni) {
  if (!/^\d{8}$/.test(String(dni || ''))) {
    return { error: 'invalido' };
  }

  const baseUrl = process.env.RENIEC_API_URL || 'https://api.apis.net.pe/v2/reniec/dni';
  const url = `${baseUrl}?numero=${dni}`;
  const headers = { Accept: 'application/json' };
  const token = process.env.RENIEC_API_TOKEN || process.env.SUNAT_API_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, { method: 'GET', headers });
  } catch (e) {
    console.warn('[RENIEC] fallo de conexion:', e.message);
    return { error: 'conexion' };
  }

  if (!response.ok) {
    const cuerpo = await response.text().catch(() => '');
    console.warn(`[RENIEC] respuesta ${response.status} de ${baseUrl}: ${cuerpo.substring(0, 200)}`);
  }

  // El numero ya fue validado, asi que un 400 significa DNI inexistente
  if (response.status === 400 || response.status === 404 || response.status === 422) {
    return null;
  }
  if (!response.ok) {
    return { error: 'conexion' };
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    console.warn('[RENIEC] respuesta no es JSON valido');
    return { error: 'conexion' };
  }

  // Soporta apis.net.pe (nombres/apellidoPaterno) y decolecta (first_name/full_name)
  const nombres = data?.nombres || data?.nombre || data?.first_name || '';
  const apellidos = [
    data?.apellidoPaterno || data?.apellido_paterno || data?.first_last_name,
    data?.apellidoMaterno || data?.apellido_materno || data?.second_last_name
  ]
    .filter(Boolean)
    .join(' ');
  const nombreCompleto = data?.nombreCompleto || data?.nombre_completo || data?.full_name
    || `${nombres} ${apellidos}`.trim();

  if (!nombreCompleto) {
    console.warn('[RENIEC] respuesta 200 pero sin campos de nombre reconocibles:',
      JSON.stringify(data).substring(0, 200));
    return null;
  }

  return {
    dni: data.numeroDocumento || data.numero_documento || data.document_number || dni,
    nombreCompleto
  };
}

module.exports = {
  getAllClientes,
  findById,
  findByRuc,
  buscar,
  createCliente,
  findOrCreate,
  consultarRucSunat,
  consultarDniReniec
};
