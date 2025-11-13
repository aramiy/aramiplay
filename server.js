// server.js
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
require('dotenv').config();

const { isAuthenticated, isAdmin } = require('./middleware/auth');

// אתחול אפליקציה
const app = express();
const PORT = process.env.PORT || 3000;

// ===== חיבור למסד נתונים =====
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/netflix-clone', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ===== אמצעי עזר =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session – לשמירת התחברות
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ===== חיבור ראוטים ל־API =====
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contentRoutes = require('./routes/contentRoutes');
const watchRoutes = require('./routes/watchRoutes');
let userRoutes;
try {
  userRoutes = require('./routes/userRoutes');
} catch (e) {
  console.warn('⚠️ userRoutes not found, skipping /api/users routes');
}

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/watch', watchRoutes);
if (userRoutes) {
  app.use('/api/users', userRoutes);
}

// ===== עמודים (Views) =====
const view = (page) => path.join(__dirname, 'views', `${page}.html`);

// דף התחברות
app.get('/', (req, res) => res.sendFile(view('login')));
app.get('/login', (req, res) => res.sendFile(view('login')));

// פיד
app.get('/feed', (req, res) => res.sendFile(view('feed')));

// הרשמה
app.get('/register', (req, res) => res.sendFile(view('register')));

// תוכן (דף פריט סרט/סדרה) – גם בלי וגם עם ID
app.get('/content/:id', (req, res) => res.sendFile(view('content')));
app.get('/content', (req, res) => res.sendFile(view('content')));

// נגן – גם בלי וגם עם ID
app.get('/player/:id', (req, res) => res.sendFile(view('player')));
app.get('/player', (req, res) => res.sendFile(view('player')));

// הגדרות
app.get('/settings', (req, res) => res.sendFile(view('settings')));

// ז'אנרים – גם בלי וגם עם שם ז'אנר
app.get('/genre/:genre', (req, res) => res.sendFile(view('genre')));
app.get('/genre', (req, res) => res.sendFile(view('genre')));

// אדמין
app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
  res.sendFile(view('admin'));
});

// ===== יצירת משתמש admin ברירת מחדל =====
const User = require('./models/User');

async function createDefaultAdmin() {
  try {
    const existingAdmin = await User.findOne({ username: 'admin' });

    if (!existingAdmin) {
      const newAdmin = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin',
        isAdmin: true
      });

      await newAdmin.save();
      console.log('✅ Default admin created (username: admin, password: admin)');
    } else {
      console.log('ℹ️ Admin user already exists.');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
  }
}

// ===== הרצת השרת =====
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await createDefaultAdmin();
});
