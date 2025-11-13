// controllers/contentController.js
const Content = require('../models/Content');
const WatchHistory = require('../models/WatchHistory');
const User = require('../models/User');
const logger = require('../utils/logger');

// קבלת כל התוכן עם סינון ומיון
exports.getAllContent = async (req, res) => {
  try {
    const {
      genre,
      type,
      search,
      sort = '-createdAt',
      page = 1,
      limit = parseInt(process.env.ITEMS_PER_PAGE) || 20,
      watched
    } = req.query;

    const query = { isActive: true };

    // סינון לפי ז'אנר
    if (genre) {
      query.genres = genre;
    }

    // סינון לפי סוג (סרט/סדרה)
    if (type) {
      query.type = type;
    }

    // חיפוש טקסטואלי
    if (search) {
      query.$text = { $search: search };
    }

    // סינון לפי נצפה / לא נצפה לפרופיל הנוכחי
    if (watched && req.session.userId && req.session.currentProfileId) {
      const watchedContent = await WatchHistory.find({
        userId: req.session.userId,
        profileId: req.session.currentProfileId,
        completed: watched === 'true'
      }).distinct('contentId');

      if (watched === 'true') {
        query._id = { $in: watchedContent };
      } else {
        query._id = { $nin: watchedContent };
      }
    }

    const skip = (page - 1) * limit;

    const [content, total] = await Promise.all([
      Content.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-episodes'),
      Content.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get all content error', error);
    res.status(500).json({
      error: 'Failed to fetch content',
      message: error.message
    });
  }
};

// קבלת תוכן לפי ID + סטטוס "אהבתי" לפי הפרופיל הנוכחי
exports.getContentById = async (req, res) => {
  try {
    const { id } = req.params;

    const content = await Content.findById(id);

    if (!content || !content.isActive) {
      return res.status(404).json({
        error: 'Content not found',
        message: 'The requested content does not exist'
      });
    }

    let watchHistory = null;
    let liked = false;

    // היסטוריית צפייה + לייקים לפי משתמש + פרופיל
    if (req.session.userId && req.session.currentProfileId) {
      const { userId, currentProfileId } = req.session;

      watchHistory = await WatchHistory.findOne({
        userId,
        profileId: currentProfileId,
        contentId: id
      });

      const user = await User.findById(userId).select('profiles');
      if (user && user.profiles && user.profiles.length > 0) {
        const profile = user.profiles.id(currentProfileId);
        if (profile && Array.isArray(profile.likedContent)) {
          liked = profile.likedContent.some(
            (cid) => cid.toString() === id.toString()
          );
        }
      }
    }

    // תכנים דומים לפי ז'אנרים
    const similarContent = await Content.find({
      _id: { $ne: id },
      genres: { $in: content.genres },
      isActive: true
    })
      .limit(6)
      .select('title thumbnailUrl type rating genres');

    res.json({
      success: true,
      data: {
        content,
        watchHistory,
        liked,
        similar: similarContent
      }
    });

  } catch (error) {
    logger.error('Get content by ID error', error);
    res.status(500).json({
      error: 'Failed to fetch content',
      message: error.message
    });
  }
};

// קבלת תכנים פופולריים (Top 10)
exports.getPopularContent = async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;

    const query = { isActive: true };
    if (type) {
      query.type = type;
    }

    const popular = await Content.aggregate([
      { $match: query },
      { $sort: { viewCount: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          title: 1,
          thumbnailUrl: 1,
          type: 1,
          viewCount: 1,
          rating: 1,
          genres: 1, 
		  releaseYear: 1 
        }
      }
    ]);

    res.json({
      success: true,
      data: popular
    });

  } catch (error) {
    logger.error('Get popular content error', error);
    res.status(500).json({
      error: 'Failed to fetch popular content',
      message: error.message
    });
  }
};

// קבלת תכנים חדשים לפי ז'אנר
exports.getNewByGenre = async (req, res) => {
  try {
    const genres = await Content.distinct('genres', { isActive: true });

    const newContentByGenre = {};

    for (const genre of genres) {
      const content = await Content.find({
        genres: genre,
        isActive: true
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title thumbnailUrl type rating releaseYear');

      newContentByGenre[genre] = content;
    }

    res.json({
      success: true,
      data: newContentByGenre
    });

  } catch (error) {
    logger.error('Get new by genre error', error);
    res.status(500).json({
      error: 'Failed to fetch content by genre',
      message: error.message
    });
  }
};

// קבלת כל הז'אנרים
exports.getGenres = async (req, res) => {
  try {
    const genres = await Content.distinct('genres', { isActive: true });

    res.json({
      success: true,
      data: genres.sort()
    });

  } catch (error) {
    logger.error('Get genres error', error);
    res.status(500).json({
      error: 'Failed to fetch genres',
      message: error.message
    });
  }
};

// קבלת המלצות מותאמות אישית (אישית לפרופיל, אבל בעזרת היסטוריית צפייה + לייקים)
exports.getRecommendations = async (req, res) => {
  try {
    const { userId, currentProfileId } = req.session;
    const limit = parseInt(req.query.limit) || 20;

    if (!userId || !currentProfileId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to get recommendations'
      });
    }

    // קבלת המשתמש והפרופיל המוטמע
    const user = await User.findById(userId).select('profiles');
    if (!user || !user.profiles || user.profiles.length === 0) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'Could not find current profile for recommendations'
      });
    }

    const profile = user.profiles.id(currentProfileId);
    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'Could not find current profile for recommendations'
      });
    }

    const likedContent = profile.likedContent || [];

    // קבלת היסטוריית צפייה
    const watchHistory = await WatchHistory.find({
      userId,
      profileId: currentProfileId
    })
      .populate('contentId', 'genres')
      .limit(50);

    // חישוב ז'אנרים מועדפים
    const genreCount = {};
    watchHistory.forEach(watch => {
      if (watch.contentId && Array.isArray(watch.contentId.genres)) {
        watch.contentId.genres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      }
    });

    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    const watchedIds = watchHistory
      .map(w => w.contentId?._id)
      .filter(Boolean);

    // אם אין עדיין היסטוריית צפייה/לייקים – פשוט נחזיר ריק
    if (topGenres.length === 0 && likedContent.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // שליפת תוכן מומלץ
    const recommendations = await Content.find({
      isActive: true,
      _id: { $nin: [...watchedIds, ...likedContent] },
      $or: [
        { genres: { $in: topGenres } },
        { _id: { $in: likedContent } }
      ]
    })
      .sort({ 'rating.imdb': -1, viewCount: -1 })
      .limit(limit)
	  .select('title thumbnailUrl type rating genres releaseYear');

    res.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    logger.error('Get recommendations error', error);
    res.status(500).json({
      error: 'Failed to fetch recommendations',
      message: error.message
    });
  }
};

// סימון/ביטול "אהבתי" – לפי פרופיל מובנה ב-User
exports.toggleLike = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { userId, currentProfileId } = req.session;

    if (!userId || !currentProfileId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const user = await User.findById(userId).select('profiles');
    if (!user || !user.profiles || user.profiles.length === 0) {
      return res.status(404).json({
        error: 'User profiles not found'
      });
    }

    const profile = user.profiles.id(currentProfileId);
    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

    if (!Array.isArray(profile.likedContent)) {
      profile.likedContent = [];
    }

    const idx = profile.likedContent.findIndex(
      (id) => id.toString() === contentId.toString()
    );

    let liked;
    if (idx > -1) {
      // הסרת לייק
      profile.likedContent.splice(idx, 1);
      liked = false;
    } else {
      // הוספת לייק
      profile.likedContent.push(contentId);
      liked = true;
    }

    await user.save();

    logger.info('Content like toggled', {
      userId,
      profileId: currentProfileId,
      contentId,
      liked
    });

    res.json({
      success: true,
      liked,
      message: liked ? 'Content liked' : 'Like removed'
    });

  } catch (error) {
    logger.error('Toggle like error', error);
    res.status(500).json({
      error: 'Failed to toggle like',
      message: error.message
    });
  }
};
	