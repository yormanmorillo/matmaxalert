const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Hash de relleno para que un usuario inexistente tarde lo mismo que uno real.
const DUMMY_HASH = bcrypt.hashSync('alertool-invalid-password', 10);

const publicUser = (user) => ({
  id: String(user._id),
  username: user.username,
  role: user.role,
  shiftId: user.shiftId,
  assignedPressIds: user.assignedPressIds || [],
  allowedSections: user.allowedSections || [],
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña requeridos' });
    }

    const user = await User.findOne({ username });
    const hash = user ? user.password : DUMMY_HASH;
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { sub: String(user._id) },
      process.env.JWT_SECRET,
      { expiresIn: '12h', algorithm: 'HS256' }
    );

    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});

// GET /api/auth/me — usuario actual recargado desde la BD
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/verify — compatibilidad con clientes antiguos
router.post('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

module.exports = router;
