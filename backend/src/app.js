// Autor: Cesar
// MaderaControl v1.0 - Punto de entrada del backend Express
// Arquitectura en 4 capas: presentacion (routes) -> logica (controllers)
// -> acceso a datos (services) -> base de datos (PostgreSQL)

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { pool } = require('./config/db');

// Rutas (se integran desde las partes 2, 3 y 4)
const authRoutes = require('./routes/auth.routes');
const productosRoutes = require('./routes/productos.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const ventasRoutes = require('./routes/ventas.routes');
const clientesRoutes = require('./routes/clientes.routes');
const reportesRoutes = require('./routes/reportes.routes');

const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/', (req, res) => {
  res.json({
    name: 'MaderaControl API',
    version: '1.0.0',
    empresa: 'Inversiones y Transportes Cesar y Diana EIRL',
    status: 'ok'
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const r = await pool.query('SELECT NOW() AS now');
    res.json({ status: 'ok', db_time: r.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/reportes', reportesRoutes);

app.use((req, res, next) => {
  const err = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log('Conectado a PostgreSQL');
  });
}

module.exports = app;
