// Autor: Yarkoff
// MaderaControl v1.0 - Middleware de verificacion de JWT
// Lee Authorization: Bearer <token>, valida con JWT_SECRET y
// adjunta el payload decodificado a req.user.

const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization;

  if (!header || !header.startsWith('Bearer ')) {
    const err = new Error('Token no proporcionado');
    err.status = 401;
    return next(err);
  }

  const token = header.substring(7).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      nombre: payload.nombre,
      email: payload.email,
      rol: payload.rol
    };
    return next();
  } catch (e) {
    const err = new Error('Token invalido o expirado');
    err.status = 401;
    return next(err);
  }
}

module.exports = { verifyToken };
