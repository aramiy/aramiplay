// controllers/userController.js
const User = require('../models/User');
const logger = require('../utils/logger');

// קבלת כל הפרופילים של המשתמש + הפרופיל הנוכחי מה-session
exports.getProfiles = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'יש להתחבר למערכת'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // אם אין פרופילים בכלל – ניצור אחד דיפולטי
    if (!user.profiles || user.profiles.length === 0) {
      const defaultName =
        user.displayName ||
        user.username ||
        (user.email ? user.email.split('@')[0] : 'פרופיל ראשי');

      user.profiles.push({
        name: defaultName,
        isKids: false
      });

      await user.save();
    }

    const profiles = user.profiles;

    // לוודא שיש currentProfileId תקין ב־session
    let currentProfileId = req.session.currentProfileId;

    if (!currentProfileId || !profiles.id?.(currentProfileId)) {
      currentProfileId = profiles[0]._id.toString();
      req.session.currentProfileId = currentProfileId;

      await new Promise((resolve, reject) => {
        req.session.save(err => (err ? reject(err) : resolve()));
      });
    }

    const currentProfile =
      (profiles.id && profiles.id(currentProfileId)) || profiles[0];

    res.json({
      success: true,
      data: profiles,
      currentProfileId,
      currentProfile
    });

  } catch (error) {
    console.error('Get profiles error:', error);
    res.status(500).json({
      error: 'Failed to fetch profiles',
      message: error.message
    });
  }
};

// יצירת פרופיל חדש
exports.createProfile = async (req, res) => {
  try {
    const { userId } = req.session;
    const { name, isKids } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Profile name is required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    if (user.profiles.length >= 5) {
      return res.status(400).json({
        error: 'Maximum profiles limit reached',
        message: 'ניתן ליצור עד 5 פרופילים'
      });
    }

    // אם user.profiles.create לא קיים (Array רגיל), ניצור אובייקט ידנית
    const newProfile = user.profiles.create
      ? user.profiles.create({
          name: name.trim(),
          isKids: !!isKids
        })
      : {
          _id: require('mongoose').Types.ObjectId(),
          name: name.trim(),
          isKids: !!isKids
        };

    user.profiles.push(newProfile);
    await user.save();

    logger.info('Profile created', {
      userId,
      profileId: newProfile._id,
      profileName: newProfile.name
    });

    res.status(201).json({
      success: true,
      data: newProfile,
      message: 'Profile created successfully'
    });

  } catch (error) {
    logger.error('Create profile error', error);
    res.status(500).json({
      error: 'Failed to create profile',
      message: error.message
    });
  }
};

// עדכון פרופיל קיים
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.session;
    const { profileId } = req.params;
    const { name, isKids } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // נמצא פרופיל לפי _id
    const profile =
      user.profiles.id?.(profileId) ||
      user.profiles.find(p => p._id.toString() === profileId);

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

    if (name && name.trim()) {
      profile.name = name.trim();
    }
    if (typeof isKids !== 'undefined') {
      profile.isKids = !!isKids;
    }

    await user.save();

    logger.info('Profile updated', {
      userId,
      profileId
    });

    res.json({
      success: true,
      data: profile,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    logger.error('Update profile error', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
};

// מחיקת פרופיל
exports.deleteProfile = async (req, res) => {
  try {
    const { userId } = req.session;
    const { profileId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    if (!user.profiles || user.profiles.length <= 1) {
      return res.status(400).json({
        error: 'Cannot delete last profile',
        message: 'חייב להיות לפחות פרופיל אחד'
      });
    }

    // ננסה למצוא אינדקס במערך
    const index = user.profiles.findIndex(
      p => p._id.toString() === profileId
    );

    if (index === -1) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

    user.profiles.splice(index, 1);
    await user.save();

    // אם מחקנו את הפרופיל הנוכחי – נעביר לראשון ברשימה
    if (req.session.currentProfileId === profileId) {
      req.session.currentProfileId = user.profiles[0]._id.toString();
      await new Promise((resolve, reject) => {
        req.session.save(err => (err ? reject(err) : resolve()));
      });
    }

    logger.info('Profile deleted', {
      userId,
      profileId
    });

    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });

  } catch (error) {
    logger.error('Delete profile error', error);
    res.status(500).json({
      error: 'Failed to delete profile',
      message: error.message
    });
  }
};

// החלפת פרופיל פעיל
exports.switchProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    const profileId = req.params.id || req.params.profileId;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'יש להתחבר למערכת'
      });
    }

    const user = await User.findById(userId);

    if (!user || !user.profiles || user.profiles.length === 0) {
      return res.status(404).json({
        error: 'User profiles not found'
      });
    }

    const profile =
      user.profiles.id?.(profileId) ||
      user.profiles.find(p => p._id.toString() === profileId);

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'הפרופיל לא נמצא או לא שייך למשתמש זה'
      });
    }

    req.session.currentProfileId = profile._id.toString();

    await new Promise((resolve, reject) => {
      req.session.save(err => (err ? reject(err) : resolve()));
    });

    res.json({
      success: true,
      message: 'Profile switched successfully',
      currentProfileId: req.session.currentProfileId,
      currentProfile: profile
    });

  } catch (error) {
    console.error('Switch profile error:', error);
    res.status(500).json({
      error: 'Failed to switch profile',
      message: error.message
    });
  }
};

// קבלת הפרופיל הנוכחי
exports.getCurrentProfile = async (req, res) => {
  try {
    const { userId, currentProfileId } = req.session;

    if (!userId || !currentProfileId) {
      return res.status(400).json({
        error: 'No active profile'
      });
    }

    const user = await User.findById(userId);

    if (!user || !user.profiles) {
      return res.status(404).json({
        error: 'User not found or no profiles'
      });
    }

    const profile =
      user.profiles.id?.(currentProfileId) ||
      user.profiles.find(p => p._id.toString() === currentProfileId);

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    logger.error('Get current profile error', error);
    res.status(500).json({
      error: 'Failed to fetch current profile',
      message: error.message
    });
  }
};
