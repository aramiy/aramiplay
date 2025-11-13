# Netflix Clone - מערכת הפצת תכנים דיגיטליים

##  טכנולוגיות

### Backend
- **Node.js** - סביבת ריצה
- **Express.js** - מסגרת שרת
- **MongoDB** - מסד נתונים
- **Mongoose** - ODM למונגו
- **bcrypt** - הצפנת סיסמאות
- **express-session** - ניהול sessions

### Frontend
- **HTML5** - תגיות סמנטיות ו-Video API
- **CSS3** + **Bootstrap 5** - עיצוב רספונסיבי
- **Chart.js** - גרפים וסטטיסטיקות

### ארכיטקטורה
- **MVC Pattern** - הפרדה מלאה בין Model, View, Controller
- **RESTful API** - תקשורת Client-Server
- **Ajax** - בקשות אסינכרוניות

## 📁 מבנה הפרויקט

```
netflix-clone/
│
├── server.js                 # נקודת כניסה ראשית
├── package.json              # תלויות
├── .env                      # משתני סביבה (לא ב-Git)
├── .gitignore
├── README.md
│
├── config/
│   └── database.js          # חיבור MongoDB
│
├── models/
│   ├── User.js              # מודל משתמשים
│   ├── Content.js           # מודל תוכן
│   └── WatchHistory.js      # מודל צפייה
│   └── Profile.js      # מודל פרופיל
│
├── controllers/
│   ├── authController.js    # בקר אימות
│   ├── userController.js    # בקר משתמשים
│   ├── contentController.js # בקר תוכן
│   ├── watchController.js   # בקר צפייה
│   └── adminController.js   # בקר מנהל
│
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── contentRoutes.js
│   ├── watchRoutes.js
│   └── adminRoutes.js
│
├── middleware/
│   └── auth.js              # אימות והרשאות
│
├── utils/
│   ├── logger.js            # מערכת לוגים
│   └── helpers.js           # פונקציות עזר
│
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── main.js
│   │   ├── player.js
│   │   └── charts.js
│   ├── videos/
│   └── images/
│
└── views/
    ├── login.html
    ├── register.html
    ├── feed.html
    ├── genre.html
    ├── content.html
    ├── player.html
    ├── settings.html
    └── admin.html
```

## 🚀 התקנה והרצה

### דרישות מקדימות
- Node.js (גרסה 14 ומעלה)
- MongoDB (מותקן ופועל)
- Git

### שלבי התקנה

1. **שכפול הפרויקט**
```bash
git clone <repository-url>
cd netflix-clone
```

2. **התקנת תלויות**
```bash
npm install
```

3. **הגדרת משתני סביבה**
צור קובץ `.env` בתיקיית הראשית:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/netflix-clone
SESSION_SECRET=your-super-secret-key-here
ITEMS_PER_PAGE=20
IMDB_API_KEY=your-api-key
```

4. **יצירת תיקיות נדרשות**
```bash
mkdir -p public/videos public/images public/images/uploads logs
```

5. **הרצת MongoDB**
וודא ש-MongoDB פועל על המחשב שלך:
```bash
mongod
```

6. **הרצת השרת**
```bash
npm start
```

7. **פתיחת הדפדפן**
```
http://localhost:3000
```

## 👤 משתמש ברירת מחדל

המערכת יוצרת אוטומטית משתמש Admin:
- **שם משתמש:** admin
- **סיסמה:** admin

##  פיצ'רים מרכזיים

### 1. אימות ואבטחה
- הרשמה והתחברות מאובטחת
- הצפנת סיסמאות עם bcrypt
- ניהול sessions
- הגבלת גישה לפי הרשאות

### 2. ניהול פרופילים
- יצירת עד 5 פרופילים למשתמש
- עריכה ומחיקת פרופילים
- החלפה בין פרופילים
- העדפות אישיות לכל פרופיל

### 3. קטלוג תוכן
- סרטים וסדרות
- חיפוש מתקדם
- סינון לפי ז'אנר
- מיון לפי פופולריות/דירוג
- גלילה אינסופית

### 4. נגן וידאו
- Play/Pause
- קדימה/אחורה 10 שניות
- מסך מלא
- פרק הבא (לסדרות)
- רשימת פרקים

### 5. המשך צפייה
- שמירת נקודת עצירה
- סנכרון בין מכשירים
- דיוק של עד 10 שניות

### 6. המלצות אישיות
- מבוססות על היסטוריית צפייה
- תכנים שסומנו ב"אהבתי"
- ז'אנרים מועדפים

### 7. סטטיסטיקות וגרפים
- גרף עמודות: צפיות יומיות
- גרף עוגה: תוכן לפי ז'אנר
- סיכום כללי של צפייה

### 8. ממשק Admin
- הוספת תוכן חדש
- העלאת וידאו ותמונות
- אינטגרציה עם IMDB API
- עריכה ומחיקת תוכן
- סטטיסטיקות פלטפורמה

## 🔌 API Endpoints

### אימות
```
POST   /api/auth/register     # הרשמה
POST   /api/auth/login        # התחברות
POST   /api/auth/logout       # התנתקות
GET    /api/auth/check        # בדיקת מצב
```

### משתמשים ופרופילים
```
GET    /api/users/profiles                    # קבלת פרופילים
POST   /api/users/profiles                    # יצירת פרופיל
PUT    /api/users/profiles/:profileId         # עדכון פרופיל
DELETE /api/users/profiles/:profileId         # מחיקת פרופיל
POST   /api/users/profiles/:profileId/switch  # החלפת פרופיל
```

### תוכן
```
GET    /api/content              # קבלת כל התוכן
GET    /api/content/:id          # תוכן לפי ID
GET    /api/content/popular/all  # תכנים פופולריים
GET    /api/content/new/by-genre # חדשים לפי ז'אנר
GET    /api/content/recommendations/personal # המלצות
POST   /api/content/:contentId/like # לייק
```

### צפייה
```
POST   /api/watch/:contentId/progress  # עדכון התקדמות
GET    /api/watch/history              # היסטוריה
GET    /api/watch/continue             # המשך צפייה
GET    /api/watch/stats                # סטטיסטיקות
DELETE /api/watch/:contentId           # מחיקה
```

### Admin
```
POST   /api/admin/content        # הוספת תוכן
POST   /api/admin/upload         # העלאת קבצים
PUT    /api/admin/content/:id    # עדכון תוכן
DELETE /api/admin/content/:id    # מחיקת תוכן
GET    /api/admin/stats          # סטטיסטיקות
```

## 🗃️ מבנה מסד הנתונים

### Users Collection
```javascript
{
  username: String,
  email: String,
  password: String (מוצפנת),
  isAdmin: Boolean,
  profiles: [{
    name: String,
    avatar: String,
    isKids: Boolean,
    likedContent: [ObjectId]
  }],
  currentProfile: Number
}
```

### Content Collection
```javascript
{
  title: String,
  description: String,
  type: 'movie' | 'series',
  genres: [String],
  releaseYear: Number,
  director: String,
  cast: [{name, role, imageUrl}],
  rating: {imdb, rottenTomatoes},
  thumbnailUrl: String,
  videoUrl: String,
  episodes: [{...}],
  viewCount: Number
}
```

### WatchHistory Collection
```javascript
{
  userId: ObjectId,
  profileId: ObjectId,
  contentId: ObjectId,
  watchedDuration: Number,
  totalDuration: Number,
  currentEpisode: {seasonNumber, episodeNumber},
  completed: Boolean,
  lastWatchedAt: Date
}
```

## 🔒 אבטחה

- סיסמאות מוצפנות עם bcrypt (salt rounds: 10)
- Sessions מאובטחות עם express-session
- הגבלת גישה לפי הרשאות (middleware)
- ולידציה של קלט משתמש
- הגנה מפני SQL Injection (באמצעות Mongoose)
- לוגים של פעולות רגישות

## רספונסיביות

המערכת מותאמת לכל המכשירים:
- **Desktop** (1920px+)
- **Tablet** (768px-1919px)
- **Mobile** (עד 767px)


## 📝 לוגים

הלוגים נשמרים ב:
- `logs/app.log` - כל הלוגים
- `logs/error.log` - שגיאות בלבד

**הערה חשובה:** פרויקט זה הוא פרויקט לימודי ולא מיועד לשימוש מסחרי.