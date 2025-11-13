const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// הגדרת Multer להעלאת קבצים
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith('video/')) {
      cb(null, 'public/videos/');
    } else if (file.mimetype.startsWith('image/')) {
      cb(null, 'public/images/');
    } else {
      cb(new Error('Invalid file type'), null);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
    );
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mov/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

// כל הנתיבים דורשים אימות + אדמין
router.use(isAuthenticated);
router.use(isAdmin);

// הוספת תוכן חדש
router.post('/content', adminController.addContent);

// העלאת קבצים (וידאו/תמונות)
router.post(
  '/upload',
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const files = {};

      if (req.files.video) {
        files.videoUrl = '/videos/' + req.files.video[0].filename;
      }
      if (req.files.thumbnail) {
        files.thumbnailUrl = '/images/' + req.files.thumbnail[0].filename;
      }
      if (req.files.banner) {
        files.bannerUrl = '/images/' + req.files.banner[0].filename;
      }

      res.json({
        success: true,
        data: files,
        message: 'Files uploaded successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Upload failed',
        message: error.message
      });
    }
  }
);

// עדכון תוכן קיים
router.put('/content/:id', adminController.updateContent);

// מחיקת תוכן
router.delete('/content/:id', adminController.deleteContent);

// קבלת כל התוכן (כולל לא פעיל) לצורך ממשק האדמין
router.get('/content', adminController.getAllContentAdmin);

// סטטיסטיקות פלטפורמה
router.get('/stats', adminController.getPlatformStats);

module.exports = router;
