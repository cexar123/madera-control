// Capa de acceso a datos de autenticacion
// Aqui viven las queries SQL contra la tabla usuarios y la
// generacion / validacion de credenciales (bcrypt + JWT).

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { query } = require('../config/db');

const JWT_EXPIRES_IN = '8h';

async function findUserByEmail(email) {
  const sql = `
    SELECT id, nombre, email, password_hash, rol, activo
    FROM usuarios
    WHERE email = $1
    LIMIT 1
  `;
  const result = await query(sql, [email]);
  return result.rows[0] || null;
}

async function findUserById(id) {
  const sql = `
    SELECT id, nombre, email, rol, activo, created_at
    FROM usuarios
    WHERE id = $1
    LIMIT 1
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

async function validatePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

function generateToken(user) {
  const payload = {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

module.exports = {
  findUserByEmail,
  findUserById,
  validatePassword,
  generateToken
};
