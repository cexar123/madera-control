// Middleware de control por roles
// Uso: requireRole('gerente') o requireRole('gerente','contador').
// Debe usarse SIEMPRE despues de verifyToken.

function requireRole(...rolesPermitidos) {
  return function (req, res, next) {
    if (!req.user) {
      const err = new Error('No autenticado');
      err.status = 401;
      return next(err);
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      const err = new Error('No tienes permiso para esta accion');
      err.status = 403;
      return next(err);
    }

    return next();
  };
}

module.exports = { requireRole };
