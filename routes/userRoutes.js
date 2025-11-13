// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/auth');

// כל הנתיבים פה דורשים משתמש מחובר
router.use(isAuthenticated);

// קבלת כל הפרופילים
router.get('/profiles', userController.getProfiles);

// קבלת פרופיל נוכחי
router.get('/profiles/current', userController.getCurrentProfile);

// יצירת פרופיל חדש
router.post('/profiles', userController.createProfile);

// עדכון פרופיל
router.put('/profiles/:profileId', userController.updateProfile);

// מחיקת פרופיל
router.delete('/profiles/:profileId', userController.deleteProfile);

// החלפת פרופיל פעיל
router.post('/profiles/:id/switch', userController.switchProfile);

module.exports = router;
