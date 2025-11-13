const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const profileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.png'
  },
  isKids: {
    type: Boolean,
    default: false
  },
  preferences: {
    favoriteGenres: [String],
    language: {
      type: String,
      default: 'he'
    }
  },
  likedContent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 4
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  profiles: {
    type: [profileSchema],
    validate: [arrayLimit, 'Cannot have more than 5 profiles']
  },
  currentProfile: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

function arrayLimit(val) {
  return val.length <= 5;
}

// הצפנת סיסמה לפני שמירה
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// השוואת סיסמה
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// קבלת פרופיל נוכחי
userSchema.methods.getCurrentProfile = function() {
  if (this.profiles.length === 0) return null;
  return this.profiles[this.currentProfile] || this.profiles[0];
};

// הוספת פרופיל חדש
userSchema.methods.addProfile = function(profileData) {
  if (this.profiles.length >= 5) {
    throw new Error('Maximum 5 profiles allowed');
  }
  this.profiles.push(profileData);
  return this.profiles[this.profiles.length - 1];
};

module.exports = mongoose.model('User', userSchema);