// Autor: Yarkoff
// MaderaControl v1.0 - Capa de presentacion del modulo de autenticacion
// Solo define endpoints y delega en el controller.

const express = require('express');

const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', authController.login);
router.get('/me', verifyToken, authController.me);

module.exports = router;
