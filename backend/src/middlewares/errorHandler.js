// Manejador centralizado de errores
// Cualquier next(err) cae aqui y se serializa con un formato uniforme.

const STATUS_MESSAGES = {
  400: 'Solicitud invalida',
  401: 'No autenticado',
  403: 'No autorizado',
  404: 'Recurso no encontrado',
  409: 'Conflicto con el recurso existente',
  500: 'Error interno del servidor'
};

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || STATUS_MESSAGES[status] || 'Error desconocido';

  if (status >= 500) {
    console.error('[ERROR]', req.method, req.originalUrl, '-', err.stack || err);
  } else {
    console.warn('[WARN]', req.method, req.originalUrl, '-', message);
  }

  const payload = {
    error: message,
    code: status
  };

  if (err.details) payload.details = err.details;

  res.status(status).json(payload);
}

module.exports = errorHandler;
