// models/Profile.js
const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  // למי הפרופיל שייך
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // שם הפרופיל (שחר, ילדים, ליאל...)
  name: {
    type: String,
    required: true,
    trim: true
  },

  // האם זה פרופיל ילדים
  isKids: {
    type: Boolean,
    default: false
  },

  // שפה מועדפת (לא חובה להשתמש עכשיו, אבל נחמד)
  preferredLanguage: {
    type: String,
    default: 'he'
  },

  // תוכן שסומן ב"אהבתי" – יושב על הפרופיל, לא על המשתמש
  likedContent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }]

}, {
  timestamps: true
});

module.exports = mongoose.model('Profile', profileSchema);
