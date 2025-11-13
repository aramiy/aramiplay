// public/js/main.js

// ============ API Helper Functions ============
const API = {
  // Generic fetch wrapper
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        credentials: 'include',            // חשוב לסשנים/קוקיז
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });

      // ננסה תמיד לפרש JSON (גם בשגיאה)
      let data = {};
      try { data = await response.json(); } catch (_) { /* no-op */ }

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Auth APIs
  async login(username, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  async register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  },

  async checkAuth() {
    // שומר על ה-API הקיים אצלך
    return this.request('/api/auth/check');
  },

  // Content APIs
  async getContent(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/api/content?${queryString}`);
  },

  async getContentById(id) {
    return this.request(`/api/content/${id}`);
  },

  // שומר על הנתיבים המקוריים שלך:
  async getPopular(type = null) {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    return this.request(`/api/content/popular/all${query}`);
  },

  async getNewByGenre() {
    return this.request('/api/content/new/by-genre');
  },

  async getRecommendations() {
    return this.request('/api/content/recommendations/personal');
  },

  async toggleLike(contentId) {
    return this.request(`/api/content/${contentId}/like`, { method: 'POST' });
  },

  async getGenres() {
    return this.request('/api/content/genres');
  },

  // Watch APIs
  async updateProgress(contentId, progressData) {
    return this.request(`/api/watch/${contentId}/progress`, {
      method: 'POST',
      body: JSON.stringify(progressData)
    });
  },

  async getContinueWatching() {
    return this.request('/api/watch/continue');
  },

  async getWatchHistory() {
    return this.request('/api/watch/history');
  },

  async getWatchStats() {
    return this.request('/api/watch/stats');
  },

  // Profile APIs
  async getProfiles() {
    return this.request('/api/users/profiles');
  },

  async createProfile(profileData) {
    return this.request('/api/users/profiles', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
  },

  async updateProfile(profileId, profileData) {
    return this.request(`/api/users/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  async deleteProfile(profileId) {
    return this.request(`/api/users/profiles/${profileId}`, {
      method: 'DELETE'
    });
  },

  async switchProfile(profileId) {
    return this.request(`/api/users/profiles/${profileId}/switch`, {
      method: 'POST'
    });
  }
};

// ============ UI Helper Functions ============
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

const UI = {
  showLoading(element) {
    if (typeof element === 'string') element = document.querySelector(element);
    if (element) {
      element.innerHTML = `
        <div class="text-center py-5">
          <div class="loading-spinner"></div>
        </div>
      `;
    }
  },

  showError(message, element) {
    if (typeof element === 'string') element = document.querySelector(element);
    if (element) {
      element.innerHTML = `
        <div class="alert alert-danger" role="alert">${esc(message)}</div>
      `;
    }
  },

  showSuccess(message, element) {
    if (typeof element === 'string') element = document.querySelector(element);
    if (element) {
      element.innerHTML = `
        <div class="alert alert-success" role="alert">${esc(message)}</div>
      `;
    }
  },

  // כרטיס תוכן – סלחני לשדות חסרים כדי למנוע "undefined"
  createContentCard(content) {
    if (!content) return '';
    const id    = content._id || '';
    const title = esc(content.title || 'ללא כותרת');
    const img   = content.thumbnailUrl || '/images/placeholder.jpg';
    const type  = content.type === 'movie' ? 'סרט' : (content.type === 'series' ? 'סדרה' : '');
    const year  = (typeof content.releaseYear === 'number' || typeof content.releaseYear === 'string')
                  ? String(content.releaseYear) : '';
    const metaParts = [];
    if (year) metaParts.push(year);
    if (type) metaParts.push(type);
    if (content.rating && typeof content.rating.imdb === 'number') {
      metaParts.push(`⭐ ${content.rating.imdb}`);
    }
    const meta = metaParts.join(' • ');

    return `
      <div class="content-card" data-id="${id}" onclick="goToContent('${id}')">
        <img src="${img}" alt="${title}">
        <div class="content-card-overlay">
          <h4 class="content-card-title">${title}</h4>
          <p class="content-card-meta">${esc(meta)}</p>
        </div>
      </div>
    `;
  },

  formatDuration(seconds) {
    const s = Number(seconds) || 0;
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')} שעות`;
    return `${minutes} דקות`;
  },

  formatDate(dateString) {
    const d = new Date(dateString);
    return isNaN(+d) ? '' : d.toLocaleDateString('he-IL');
  }
};

// ============ Navigation Functions ============
function goToContent(contentId) {
  if (contentId) window.location.href = `/content/${contentId}`;
}

function goToPlayer(contentId) {
  if (contentId) window.location.href = `/player/${contentId}`;
}

function goToGenre(genre) {
  window.location.href = `/genre/${encodeURIComponent(genre)}`;
}

function goToFeed() {
  window.location.href = '/feed';
}

// ============ Navbar Scroll Effect ============
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar-custom');
  if (navbar) {
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  }
});

// ============ Check Authentication on Page Load ============
async function checkAuthStatus() {
  try {
    const response = await API.checkAuth();
    if (!response.authenticated) {
      const publicPages = ['/login', '/register', '/'];
      if (!publicPages.includes(window.location.pathname)) {
        window.location.href = '/';
      }
    }
    return response;
  } catch (error) {
    console.error('Auth check failed:', error);
    return { authenticated: false };
  }
}

// ============ Logout Function ============
async function logout() {
  try {
    await API.logout();
    window.location.href = '/';
  } catch (error) {
    alert('שגיאה בהתנתקות');
  }
}

// ============ Search Functionality ============
let searchTimeout;
function handleSearch(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    if (!query || query.trim().length < 2) {
      const container = document.getElementById('searchResults');
      if (container) container.innerHTML = '';
      return;
    }

    try {
      const results = await API.getContent({ search: query.trim() });
      displaySearchResults(results.data || []);
    } catch (error) {
      console.error('Search error:', error);
    }
  }, 400);
}

function displaySearchResults(results) {
  const container = document.getElementById('searchResults');
  if (!container) return;

  if (!results.length) {
    container.innerHTML = '<p class="text-center text-muted">לא נמצאו תוצאות</p>';
    return;
  }
  container.innerHTML = results.map(content => UI.createContentCard(content)).join('');
}

// ============ Infinite Scroll ============
let isLoading = false;
let currentPage = 1;

function setupInfiniteScroll(loadMoreFunction) {
  window.addEventListener('scroll', async () => {
    if (isLoading) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = document.documentElement.scrollTop;
    const clientHeight = document.documentElement.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - 500) {
      isLoading = true;
      currentPage++;
      await loadMoreFunction(currentPage);
      isLoading = false;
    }
  });
}

// ============ Local Storage Helpers ============
const Storage = {
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.error('Storage error:', error); }
  },
  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Storage error:', error);
      return null;
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); }
    catch (error) { console.error('Storage error:', error); }
  }
};

// ============ Initialize on DOM Load ============
document.addEventListener('DOMContentLoaded', () => {
  // Check auth status
  checkAuthStatus();

  // Setup search if search input exists
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
  }

  // Setup logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
});
