// controllers/watchController.js
const mongoose = require('mongoose');
const WatchHistory = require('../models/WatchHistory');
const Content = require('../models/Content');

let logger = console;
try { logger = require('../utils/logger'); } catch (_) { /* no-op */ }

// עדכון התקדמות נגן (סרט/סדרה)
exports.updateProgress = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { currentTime = 0, totalDuration = 0, episodeData = null, device, completed = null } = req.body;
    const { userId, currentProfileId } = req.session || {};

    if (!userId || !currentProfileId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!mongoose.isValidObjectId(contentId)) {
      return res.status(400).json({ error: 'Invalid content id' });
    }

    const content = await Content.findById(contentId);
    if (!content) return res.status(404).json({ error: 'Content not found' });

    let watchHistory = await WatchHistory.findOne({ userId, profileId: currentProfileId, contentId });
    if (!watchHistory) {
      watchHistory = new WatchHistory({
        userId,
        profileId: currentProfileId,
        contentId,
        contentType: content.type, // 'movie' | 'series'
        totalDuration: totalDuration || content.duration || 0,
        device: device || 'desktop'
      });
    }

    const wasCompleted = !!watchHistory.completed;

    await watchHistory.updateProgress(
      Number(currentTime) || 0,
      Number(totalDuration) || watchHistory.totalDuration || 0,
      episodeData || null,
      (completed === true || completed === false) ? completed : null
    );

    if (!wasCompleted && watchHistory.completed) {
      if (typeof content.incrementViews === 'function') {
        await content.incrementViews();
      } else {
        content.viewCount = (content.viewCount || 0) + 1;
        await content.save();
      }
    }

    logger.info?.('Watch progress updated', {
      userId, profileId: currentProfileId, contentId, currentTime, completed: watchHistory.completed
    });

    return res.json({ success: true, data: watchHistory, message: 'Progress updated successfully' });
  } catch (error) {
    logger.error?.('Update progress error', error);
    return res.status(500).json({ error: 'Failed to update progress', message: error.message });
  }
};

// היסטוריית צפייה (לדף “הגדרות” וכו’)
exports.getWatchHistory = async (req, res) => {
  try {
    const { userId, currentProfileId } = req.session || {};
    if (!userId || !currentProfileId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      WatchHistory.find({ userId, profileId: currentProfileId })
        .populate('contentId', 'title thumbnailUrl type duration episodes rating genres isActive releaseYear')
        .sort({ lastWatchedAt: -1 })
        .skip(skip)
        .limit(limit),
      WatchHistory.countDocuments({ userId, profileId: currentProfileId })
    ]);

    const filtered = history.filter(h => h.contentId && h.contentId.isActive !== false);

    return res.json({
      success: true,
      data: filtered,
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit) || 1
      }
    });
  } catch (error) {
    logger.error?.('Get watch history error', error);
    return res.status(500).json({ error: 'Failed to fetch watch history', message: error.message });
  }
};

// המשך צפייה — מחזיר אוסף שבו השדה contentId כבר מכיל את מסמך התוכן (כמו שה-UI שלך מצפה)
exports.getContinueWatching = async (req, res) => {
  try {
    const { userId, currentProfileId } = req.session || {};
    if (!userId || !currentProfileId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);

    const items = await WatchHistory.aggregate([
      // סינון לפי משתמש/פרופיל
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          profileId: new mongoose.Types.ObjectId(currentProfileId)
        }
      },
      // דאגה ל-contentId שנשמר בטעות כמחרוזת
      {
        $addFields: {
          contentIdObj: {
            $cond: [
              { $eq: [{ $type: '$contentId' }, 'objectId'] },
              '$contentId',
              {
                $convert: {
                  input: '$contentId',
                  to: 'objectId',
                  onError: null,
                  onNull: null
                }
              }
            ]
          }
        }
      },
      { $match: { contentIdObj: { $ne: null } } },

      { $sort: { updatedAt: -1 } },
      { $group: { _id: '$contentIdObj', last: { $first: '$$ROOT' } } },

      // צירוף מסמך התוכן
      {
        $lookup: {
          from: Content.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'content'
        }
      },
      { $unwind: { path: '$content', preserveNullAndEmptyArrays: false } },

      // אם משתמשים isActive – נשמור רק פעיל
      { $match: { 'content.isActive': { $ne: false } } },

      // החזרה בפורמט שה-UI מצפה לו: item.contentId = contentDoc
      {
        $project: {
          _id: 0,
          contentId: {
            _id: '$content._id',
            title: '$content.title',
            type: '$content.type',
            thumbnailUrl: {
              $ifNull: [
                '$content.thumbnailUrl',
                {
                  $let: {
                    vars: { firstEp: { $arrayElemAt: ['$content.episodes', 0] } },
                    in: '$$firstEp.thumbnailUrl'
                  }
                }
              ]
            },
            releaseYear: '$content.releaseYear',
            rating: '$content.rating'
          }
        }
      },
      { $limit: limit }
    ]);

    return res.json({ success: true, data: items });
  } catch (error) {
    logger.error?.('Get continue watching error', error);
    return res.status(500).json({ error: 'Failed to fetch continue watching', message: error.message });
  }
};

// סטטיסטיקות צפייה
exports.getWatchStats = async (req, res) => {
  try {
    const { userId, currentProfileId } = req.session || {};
    if (!userId || !currentProfileId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const days = parseInt(req.query.days || '30', 10);

    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(currentProfileId)) {
      return res.status(400).json({ error: 'Invalid user/profile id' });
    }

    const dailyStats = await WatchHistory.getWatchStats(userId, currentProfileId, days);

    const genreStats = await WatchHistory.aggregate([
      { $match: {
          userId: new mongoose.Types.ObjectId(userId),
          profileId: new mongoose.Types.ObjectId(currentProfileId)
        }
      },
      { $lookup: {
          from: Content.collection.name,
          localField: 'contentId',
          foreignField: '_id',
          as: 'content'
        }
      },
      { $unwind: '$content' },
      { $match: { 'content.isActive': { $ne: false } } },
      { $unwind: '$content.genres' },
      { $group: {
          _id: '$content.genres',
          count: { $sum: 1 },
          totalDuration: { $sum: '$watchedDuration' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const summaryAgg = await WatchHistory.aggregate([
      { $match: {
          userId: new mongoose.Types.ObjectId(userId),
          profileId: new mongoose.Types.ObjectId(currentProfileId)
        }
      },
      { $group: {
          _id: null,
          totalWatched: { $sum: 1 },
          totalCompleted: { $sum: { $cond: ['$completed', 1, 0] } },
          totalDuration: { $sum: '$watchedDuration' }
        }
      }
    ]);
    const summary = summaryAgg[0] || { totalWatched: 0, totalCompleted: 0, totalDuration: 0 };

    return res.json({ success: true, data: { daily: dailyStats, byGenre: genreStats, summary } });
  } catch (error) {
    logger.error?.('Get watch stats error', error);
    return res.status(500).json({ error: 'Failed to fetch watch statistics', message: error.message });
  }
};

// מחיקת היסטוריה לפריט מסוים (לפרופיל הנוכחי)
exports.deleteWatchHistory = async (req, res) => {
  try {
    const { userId, currentProfileId } = req.session || {};
    const { contentId } = req.params;

    if (!userId || !currentProfileId) return res.status(401).json({ error: 'Authentication required' });
    if (!mongoose.isValidObjectId(contentId)) return res.status(400).json({ error: 'Invalid content id' });

    await WatchHistory.deleteOne({ userId, profileId: currentProfileId, contentId });

    logger.info?.('Watch history deleted', { userId, profileId: currentProfileId, contentId });
    return res.json({ success: true, message: 'Watch history deleted successfully' });
  } catch (error) {
    logger.error?.('Delete watch history error', error);
    return res.status(500).json({ error: 'Failed to delete watch history', message: error.message });
  }
};
