const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { isAuthenticated, attachUser } = require('../middleware/auth');

// נתיבים ציבוריים (לא דורשים אימות)
router.get('/genres', contentController.getGenres);

// נתיבים שדורשים אימות
router.use(isAuthenticated);
router.use(attachUser);

// קבלת כל התוכן
router.get('/', contentController.getAllContent);

// קבלת תכנים פופולריים
router.get('/popular/all', contentController.getPopularContent);

// קבלת תכנים חדשים לפי ז'אנר
router.get('/new/by-genre', contentController.getNewByGenre);

// קבלת המלצות מותאמות אישית
router.get('/recommendations/personal', contentController.getRecommendations);

// קבלת תוכן לפי ID (חשוב שזה יבוא אחרי הראוטים המפורשים!!)
router.get('/:id', contentController.getContentById);

// סימון/ביטול "אהבתי"
router.post('/:contentId/like', contentController.toggleLike);

module.exports = router;