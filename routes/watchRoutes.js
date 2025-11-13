const express = require('express');
const router = express.Router();
const watchController = require('../controllers/watchController');
const { isAuthenticated, hasActiveProfile } = require('../middleware/auth');

// כל הנתיבים דורשים אימות ופרופיל פעיל
router.use(isAuthenticated);
router.use(hasActiveProfile);

// עדכון התקדמות צפייה
router.post('/:contentId/progress', watchController.updateProgress);

// קבלת היסטוריית צפייה
router.get('/history', watchController.getWatchHistory);

// קבלת "המשך צפייה"
router.get('/continue', watchController.getContinueWatching);

// קבלת סטטיסטיקות צפייה
router.get('/stats', watchController.getWatchStats);

// מחיקת היסטוריית צפייה לתוכן מסוים
router.delete('/:contentId', watchController.deleteWatchHistory);


module.exports = router;
