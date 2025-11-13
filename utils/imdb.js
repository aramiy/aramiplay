// utils/imdb.js
const axios = require('axios');

/**
 * מביא דירוג IMDb דרך OMDb API לפי שם ושנה.
 * תומך גם ב-OMDB_API_KEY וגם ב-IMDB_API_KEY (למקרה שהשם .env שונה).
 */
async function fetchImdbRating(title, year) {
  const apiKey = process.env.OMDB_API_KEY || process.env.IMDB_API_KEY;
  const baseUrl = process.env.OMDB_API_URL || 'https://www.omdbapi.com/';

  if (!apiKey) {
    console.warn('OMDb/IMDb API key missing – set OMDB_API_KEY or IMDB_API_KEY in .env');
    return null;
  }

  try {
    const res = await axios.get(baseUrl, {
      params: {
        t: title,
        y: year || undefined,
        apikey: apiKey
      }
    });

    const data = res.data;

    if (data.Response === 'False') {
      console.warn('OMDb: no result for', title, year, 'error:', data.Error);
      return null;
    }

    if (!data.imdbRating || data.imdbRating === 'N/A') {
      return null;
    }

    const imdb = parseFloat(data.imdbRating);
    const votes = data.imdbVotes
      ? parseInt(String(data.imdbVotes).replace(/,/g, ''), 10)
      : undefined;

    return {
      imdb,
      votes,
      imdbId: data.imdbID || null,
      source: 'omdb'
    };
  } catch (err) {
    console.error('IMDb fetch failed for', title, year, err.message);
    return null;
  }
}

module.exports = { fetchImdbRating };
