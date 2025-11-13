// models/Content.js
const mongoose = require('mongoose');
const { fetchImdbRating } = require('../utils/imdb');

const episodeSchema = new mongoose.Schema({
  episodeNumber: { type: Number, required: true },
  seasonNumber:  { type: Number, required: true },
  title:         { type: String, required: true },
  description:   String,
  duration:      { type: Number, required: true },
  videoUrl:      { type: String, required: true },
  thumbnailUrl:  String,
  releaseDate:   Date
}, { _id: false });

const contentSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  description:  { type: String, required: true },

  // 'movie' | 'series'
  type:         { type: String, enum: ['movie', 'series'], required: true },

  genres:       [{ type: String, required: true }],

  releaseYear:  { type: Number, required: true },
  director:     { type: String, trim: true },

  // *** כאן התיקון: מערך מחרוזות, לא אובייקטים מוטמעים ***
  cast:         { type: [String], default: [] },

  rating: {
    imdb:           { type: Number, min: 0, max: 10 },
    rottenTomatoes: { type: Number, min: 0, max: 100 }
  },

  // לסרטים
  duration: {
    type: Number,
    required: function () { return this.type === 'movie'; }
  },
  videoUrl: {
    type: String,
    required: function () { return this.type === 'movie'; }
  },

  // לסדרות
  episodes: {
    type: [episodeSchema],
    required: function () { return this.type === 'series'; },
    default: undefined
  },
  totalSeasons: {
    type: Number,
    required: function () { return this.type === 'series'; }
  },

  // מדיה
  thumbnailUrl: { type: String, required: true, trim: true },
  bannerUrl:    String,
  trailerUrl:   String,

  // שפה/כתוביות
  ageRating:    { type: String, enum: ['G', 'PG', 'PG-13', '16+', '18+'], default: 'PG-13' },
  language:     { type: String, default: 'he' },
  subtitles:    { type: [String], default: [] },

  // מערכת
  viewCount:    { type: Number, default: 0 },
  isActive:     { type: Boolean, default: true },
  addedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  externalIds:  { imdbId: { type: String } },
  createdAt:    { type: Date, default: Date.now }
}, { timestamps: true });

/**
 * Hook לפני שמירה:
 * אם זה תוכן חדש/השתנתה כותרת/שנה ואין rating.imdb – ננסה להביא מאומד"ב
 */
contentSchema.pre('save', async function (next) {
  try {
    const doc = this;
    if (!doc.title) return next();

    const titleChanged = doc.isNew || doc.isModified('title');
    const yearChanged  = doc.isNew || doc.isModified('releaseYear');
    const noImdbRating = !doc.rating || typeof doc.rating.imdb !== 'number';
    const shouldFetch  = (titleChanged || yearChanged) && noImdbRating;

    if (!shouldFetch) return next();

    const ratingInfo = await fetchImdbRating(doc.title, doc.releaseYear);
    if (ratingInfo && typeof ratingInfo.imdb === 'number') {
      doc.rating = doc.rating || {};
      doc.rating.imdb = ratingInfo.imdb;

      if (ratingInfo.imdbId) {
        doc.externalIds = doc.externalIds || {};
        doc.externalIds.imdbId = ratingInfo.imdbId;
      }
      console.log(`IMDb rating set for "${doc.title}" (${doc.releaseYear || ''}):`, ratingInfo.imdb);
    }
    next();
  } catch (err) {
    console.error('Error in Content pre-save IMDb hook:', err.message);
    next(); // לא נכשיל שמירה בגלל כשל חיצוני
  }
});

// אינדקסים
contentSchema.index(
  { title: 'text', description: 'text' },
  {
    default_language: 'none',  // לא לנתח שפה
    language_override: 'dummy' // שדה לא קיים – מונע "language override unsupported: he"
  }
);
contentSchema.index({ genres: 1 });
contentSchema.index({ releaseYear: -1 });
contentSchema.index({ viewCount: -1 });
contentSchema.index({ 'rating.imdb': -1 });

// עזר
contentSchema.methods.getSeasonEpisodes = function (seasonNumber) {
  if (this.type !== 'series') return [];
  return this.episodes
    .filter(ep => ep.seasonNumber === seasonNumber)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
};

contentSchema.methods.incrementViews = async function () {
  this.viewCount = (this.viewCount || 0) + 1;
  return this.save();
};

// מניעת OverwriteModelError בעת טעינה מחדש
module.exports = mongoose.models.Content || mongoose.model('Content', contentSchema);
