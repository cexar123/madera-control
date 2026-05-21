// Capa de acceso a datos de clientes

const { query } = require('../config/db');

async function getAllClientes() {
  const sql = `
    SELECT id, ruc, razon_social, direccion, telefono, created_at
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
    SELECT id, ruc, razon_social, direccion, telefono, created_at
    FROM clientes
    WHERE ruc ILIKE $1 OR razon_social ILIKE $1
    ORDER BY razon_social ASC
    LIMIT 50
  `;
  const result = await query(sql, [`%${termino}%`]);
  return result.rows;
}

async function createCliente(datos) {
  const sql = `
    INSERT INTO clientes (ruc, razon_social, direccion, telefono)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await query(sql, [
    datos.ruc || null,
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

module.exports = {
  getAllClientes,
  findById,
  findByRuc,
  buscar,
  createCliente,
  findOrCreate,
  consultarRucSunat
};
