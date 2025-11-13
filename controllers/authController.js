// controllers/authController.js
const User = require('../models/User');
const Profile = require('../models/Profile');

// הרשמה
exports.register = async (req, res) => {
  try {
    const { username, email, password, profileName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Username, email and password are required'
      });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'Username or email already registered'
      });
    }

    // ✅ יצירת משתמש עם פרופיל דיפולטי מובנה
    const displayName = profileName?.trim() || username.trim();

    const user = new User({
      username,
      email,
      password,
      profiles: [
        {
          name: displayName,
          isKids: false,
          preferredLanguage: 'he'
        }
      ]
    });

    await user.save();

    const defaultProfileId = user.profiles[0]._id.toString();

    req.session.userId = user._id;
    req.session.isAdmin = user.isAdmin;
    req.session.currentProfileId = defaultProfileId;

    console.log('New user registered:', username);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profiles: user.profiles,
        currentProfile: user.profiles[0]
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
};

// התחברות
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Login attempt for username:', username);

    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Username and password are required'
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log('Wrong password for user:', username);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // שליפת פרופילים עבור המשתמש מהקולקציית Profile
    let profiles = await Profile.find({ user: user._id }).sort({ createdAt: 1 });

    // אם אין פרופילים – ניצור אחד אוטומטי
    if (!profiles || profiles.length === 0) {
      const defaultProfile = new Profile({
        user: user._id,                        // ✅ אותו דבר – שדה user
        name: user.username,
        isKids: false,
        preferredLanguage: 'he'
      });
      await defaultProfile.save();
      profiles = [defaultProfile];
    }

    const firstProfile = profiles[0];

    // שמירת נתוני התחברות ב-session
    req.session.userId = user._id;
    req.session.isAdmin = user.isAdmin;
    req.session.currentProfileId = firstProfile._id;

    console.log('User logged in successfully:', username);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        profiles,
        currentProfile: firstProfile
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
};

// התנתקות
exports.logout = (req, res) => {
  const userId = req.session.userId;

  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        error: 'Logout failed',
        message: err.message
      });
    }

    console.log('User logged out:', userId);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
};

// בדיקת מצב התחברות
exports.checkAuth = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({
        authenticated: false
      });
    }

    const user = await User.findById(req.session.userId).select('-password');

    if (!user) {
      req.session.destroy();
      return res.json({
        authenticated: false
      });
    }

    // שליפת כל הפרופילים מהקולקציה עבור המשתמש
    const profiles = await Profile.find({ user: user._id }).sort({ createdAt: 1 });

    let currentProfile = null;

    if (profiles && profiles.length > 0) {
      const currentId = req.session.currentProfileId;

      if (currentId) {
        currentProfile =
          profiles.find((p) => p._id.toString() === currentId.toString()) || profiles[0];
      } else {
        currentProfile = profiles[0];
        req.session.currentProfileId = currentProfile._id;
      }
    }

    res.json({
      authenticated: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        profiles,
        currentProfile
      }
    });

  } catch (error) {
    console.error('Check auth error:', error);
    res.status(500).json({
      error: 'Authentication check failed',
      message: error.message
    });
  }
};
