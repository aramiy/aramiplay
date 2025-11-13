const mongoose = require('mongoose');

const watchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  contentType: {
    type: String,
    enum: ['movie', 'series'],
    required: true
  },
  // זמן שנצפה (לסרטים וגם לסדרות – בדקות/שניות של הווידאו)
  watchedDuration: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,
    required: true
  },
  // לסדרות
  currentEpisode: {
    seasonNumber: Number,
    episodeNumber: Number,
    episodeId: mongoose.Schema.Types.ObjectId
  },
  episodeProgress: {
    type: Number,
    default: 0
  },
  // כללי
  completed: {
    type: Boolean,
    default: false
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now
  },
  device: {
    type: String,
    enum: ['desktop', 'tablet', 'mobile'],
    default: 'desktop'
  },
  watchCount: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// אינדקסים ייחודיים למניעת כפילויות
watchHistorySchema.index({ userId: 1, profileId: 1, contentId: 1 }, { unique: true });
watchHistorySchema.index({ userId: 1, lastWatchedAt: -1 });

// מתודה לעדכון התקדמות
// שים לב: הוספתי completedOverride כדי להשתמש בדגל שמגיע מה-player
watchHistorySchema.methods.updateProgress = async function (
  currentTime,
  totalTime,
  episodeData = null,
  completedOverride = null
) {
  this.lastWatchedAt = new Date();
  this.watchCount += 1;

  const safeTotal = totalTime || this.totalDuration || 0;
  const ratio = safeTotal > 0 ? (currentTime / safeTotal) : 0;

  if (this.contentType === 'movie') {
    this.watchedDuration = currentTime;
    if (totalTime) {
      this.totalDuration = totalTime;
    }
  } else if (episodeData) {
    this.currentEpisode = episodeData;
    this.episodeProgress = currentTime;
    if (totalTime) {
      this.totalDuration = totalTime;
    }
    // גם לסדרות נעדכן watchedDuration כדי שיהיה מה לספור בסטטיסטיקות
    this.watchedDuration = currentTime;
  }

  if (completedOverride !== null && completedOverride !== undefined) {
    this.completed = !!completedOverride;
  } else {
    this.completed = ratio >= 0.9; // 90% נחשב כצפייה מלאה
  }

  return await this.save();
};

// מתודה סטטית לקבלת המשך צפייה
watchHistorySchema.statics.getContinueWatching = async function (userId, profileId, limit = 10) {
  return await this.find({
    userId,
    profileId,
    completed: false
  })
    .sort({ lastWatchedAt: -1 })
    .limit(limit)
    .populate('contentId', 'title thumbnailUrl type duration episodes');
};

// מתודה סטטית לקבלת סטטיסטיקות צפייה
watchHistorySchema.statics.getWatchStats = async function (userId, profileId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
		userId: new mongoose.Types.ObjectId(userId),
		profileId: new mongoose.Types.ObjectId(profileId),
        lastWatchedAt: { $gte: startDate }
      }
    },
    {
      $lookup: {
        from: 'contents',
        localField: 'contentId',
        foreignField: '_id',
        as: 'content'
      }
    },
    { $unwind: '$content' },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$lastWatchedAt' } },
          genre: { $arrayElemAt: ['$content.genres', 0] }
        },
        count: { $sum: 1 },
        totalDuration: { $sum: '$watchedDuration' }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);

  return stats;
};

module.exports = mongoose.model('WatchHistory', watchHistorySchema);