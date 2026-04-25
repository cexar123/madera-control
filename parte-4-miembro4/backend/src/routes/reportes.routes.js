// Autor: Miembro 4
// MaderaControl v1.0 - Rutas del modulo BI (reportes)

const express = require('express');

const reportesController = require('../controllers/reportes.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');

const router = express.Router();

router.use(verifyToken);
router.use(requireRole('gerente', 'contador'));

router.get('/ventas-por-periodo',     reportesController.ventasPorPeriodo);
router.get('/productos-mas-vendidos', reportesController.productosMasVendidos);
router.get('/ingresos-totales',       reportesController.ingresosTotales);
router.get('/ventas-por-tipo-madera', reportesController.ventasPorTipoMadera);
router.get('/resumen-dashboard',      reportesController.resumenDashboard);

module.exports = router;
