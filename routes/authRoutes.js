const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// הרשמה
router.post('/register', authController.register);

// התחברות
router.post('/login', authController.login);

// התנתקות
router.post('/logout', authController.logout);

// בדיקת מצב התחברות
router.get('/check', authController.checkAuth);

module.exports = router;