// Autor: Yarkoff
// MaderaControl v1.0 - Capa logica del modulo de autenticacion
// Recibe la request, valida los datos, llama al service y arma la
// respuesta. Nunca habla directamente con la base de datos.

const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      const err = new Error('Email y password son obligatorios');
      err.status = 400;
      return next(err);
    }

    const user = await authService.findUserByEmail(email);
    if (!user) {
      const err = new Error('Credenciales invalidas');
      err.status = 401;
      return next(err);
    }

    if (user.activo === false) {
      const err = new Error('Usuario desactivado, contacte al administrador');
      err.status = 401;
      return next(err);
    }

    const ok = await authService.validatePassword(password, user.password_hash);
    if (!ok) {
      const err = new Error('Credenciales invalidas');
      err.status = 401;
      return next(err);
    }

    const token = authService.generateToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
    });
  } catch (e) {
    return next(e);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.findUserById(req.user.id);
    if (!user) {
      const err = new Error('Usuario no encontrado');
      err.status = 404;
      return next(err);
    }
    return res.json(user);
  } catch (e) {
    return next(e);
  }
}

module.exports = { login, me };
