// controllers/adminController.js
const mongoose = require('mongoose');
const Content = require('../models/Content');
const WatchHistory = require('../models/WatchHistory');
let logger = console;
try { logger = require('../utils/logger'); } catch (_) { /* no-op */ }

const axios = require('axios');

// שליפת דירוגים חיצונית (לא חובה להפעלה)
async function fetchRatings(title, year) {
  try {
    const apiKey = process.env.IMDB_API_KEY;
    if (!apiKey) {
      logger.warn('IMDB API key not configured');
      return null;
    }

    const response = await axios.get('http://www.omdbapi.com/', {
      params: { apikey: apiKey, t: title, y: year }
    });

    if (response.data && response.data.Response === 'True') {
      const ratings = {
        imdb: parseFloat(response.data.imdbRating) || 0,
        rottenTomatoes: 0
      };
      const rtRating = response.data.Ratings?.find(r => r.Source === 'Rotten Tomatoes');
      if (rtRating) ratings.rottenTomatoes = parseInt(rtRating.Value) || 0;
      return ratings;
    }
    return null;
  } catch (error) {
    logger.error('Error fetching ratings', error);
    return null;
  }
}

// POST /api/admin/content
exports.addContent = async (req, res) => {
  try {
    const {
      title,
      description,
      type,                // 'movie' | 'series'
      genres,
      releaseYear,
      director,
      cast,
      duration,            // movie only (minutes)
      thumbnailUrl,
      // bannerUrl הוסר מה-UI — לא משתמשים בו, אך אם יגיע לא נכשיל
      bannerUrl,
      trailerUrl,
      videoUrl,            // movie only
      episodes,            // series only: [{seasonNumber, episodeNumber, title, duration, videoUrl, thumbnailUrl}]
      totalSeasons,        // series only
      ageRating,
      language,
      subtitles
    } = req.body;

    if (!title || !description || !type || !genres || !releaseYear || !thumbnailUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Title, description, type, genres, releaseYear and thumbnailUrl are required'
      });
    }

    if (type === 'movie' && (!duration || !videoUrl)) {
      return res.status(400).json({
        error: 'Missing required fields for movie',
        message: 'Duration and videoUrl are required for movies'
      });
    }

    if (type === 'series' && (!episodes || !totalSeasons)) {
      return res.status(400).json({
        error: 'Missing required fields for series',
        message: 'Episodes and totalSeasons are required for series'
      });
    }

    // דירוגים (אופציונלי)
    const ratings = await fetchRatings(title, releaseYear);

    const content = new Content({
      title,
      description,
      type,
      genres: Array.isArray(genres) ? genres : [genres],
      releaseYear,
      director,
      cast: Array.isArray(cast) ? cast : (cast ? [cast] : []),
      duration,
      thumbnailUrl,
      bannerUrl,    // לא מגיע מה-UI, אבל שדה קיים במודל — נשמור אם יגיע
      trailerUrl,
      videoUrl,
      episodes: episodes || [],
      totalSeasons,
      ageRating: ageRating || 'PG-13',
      language: language || 'he',
      subtitles: subtitles || [],
      rating: ratings || {},
      isActive: true,
      addedBy: req.session?.userId
    });

    await content.save();

    logger.info?.('Content added', {
      adminId: req.session?.userId,
      contentId: content._id,
      title: content.title
    });

    res.status(201).json({ success: true, data: content, message: 'Content added successfully' });
  } catch (error) {
    logger.error?.('Add content error', error);
    res.status(500).json({ error: 'Failed to add content', message: error.message });
  }
};

// PATCH /api/admin/content/:id
exports.updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const content = await Content.findById(id);
    if (!content) return res.status(404).json({ error: 'Content not found' });

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) content[key] = updates[key];
    });

    await content.save();

    logger.info?.('Content updated', { adminId: req.session?.userId, contentId: content._id });

    res.json({ success: true, data: content, message: 'Content updated successfully' });
  } catch (error) {
    logger.error?.('Update content error', error);
    res.status(500).json({ error: 'Failed to update content', message: error.message });
  }
};

// DELETE /api/admin/content/:id
// מחיקה קשיחה + ניקוי WatchHistory של התוכן לכל המשתמשים/פרופילים
exports.deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid content id' });
    }

    // מחיקה קשיחה
    const deleted = await Content.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    // ניקוי כל רשומות הצפייה של התוכן
    await WatchHistory.deleteMany({ contentId: new mongoose.Types.ObjectId(id) });

    // (אופציונלי) ניקוי לייקים אם מנהלים likedContent בפרופילים:
    // await Profile.updateMany({}, { $pull: { likedContent: new mongoose.Types.ObjectId(id) } });

    logger.info?.('Content hard-deleted and histories purged', { contentId: id });

    res.json({ success: true, message: 'Content deleted (and watch history removed)' });
  } catch (error) {
    logger.error?.('Delete content error', error);
    res.status(500).json({ success: false, error: 'Failed to delete content', message: error.message });
  }
};

// GET /api/admin/content (רשימה לאדמין)
exports.getAllContentAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = '-createdAt', search, isActive } = req.query;
    const query = {};
    if (search) query.$text = { $search: search };
    if (typeof isActive !== 'undefined') query.isActive = isActive === 'true';

    const skip = (page - 1) * limit;
    const [content, total] = await Promise.all([
      Content.find(query).sort(sort).skip(skip).limit(parseInt(limit))
        .populate('addedBy', 'username'),
      Content.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: content,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error?.('Get all content (admin) error', error);
    res.status(500).json({ error: 'Failed to fetch content', message: error.message });
  }
};

// GET /api/admin/platform-stats (דוגמה לסטטיסטיקות מערכת)
exports.getPlatformStats = async (req, res) => {
  try {
    const [
      totalContent,
      totalMovies,
      totalSeries,
      topViewedContent,
      contentByGenre
    ] = await Promise.all([
      Content.countDocuments({}),
      Content.countDocuments({ type: 'movie' }),
      Content.countDocuments({ type: 'series' }),
      Content.find({}).sort({ viewCount: -1 }).limit(10).select('title viewCount type'),
      Content.aggregate([
        { $unwind: '$genres' },
        { $group: { _id: '$genres', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: { totalContent, totalMovies, totalSeries, topViewedContent, contentByGenre }
    });
  } catch (error) {
    logger.error?.('Get platform stats error', error);
    res.status(500).json({ error: 'Failed to fetch platform statistics', message: error.message });
  }
};
