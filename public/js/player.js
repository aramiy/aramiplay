// Player.js - Advanced Video Player Logic

class NetflixPlayer {
  constructor(videoElement, contentId) {
    this.video = videoElement;
    this.contentId = contentId;
    this.updateInterval = null;
    this.currentEpisode = null;
    this.content = null;
    this.watchHistory = null;

    // האם הגענו עם restart=1 ב-URL
    const urlParams = new URLSearchParams(window.location.search);
    this.forceRestart = urlParams.get('restart') === '1';

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadContent();
  }

  setupEventListeners() {
    // Play/Pause
    this.video.addEventListener('play', () => this.onPlay());
    this.video.addEventListener('pause', () => this.onPause());

    // Progress update (ל־UI – לא לשמירה לשרת)
    this.video.addEventListener('timeupdate', () => this.onTimeUpdate());

    // Ended
    this.video.addEventListener('ended', () => this.onEnded());

    // Error handling
    this.video.addEventListener('error', (e) => this.onError(e));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Save progress before page unload
    window.addEventListener('beforeunload', () => this.saveProgress());
  }

  async loadContent() {
    try {
      const response = await fetch(`/api/content/${this.contentId}`);
      const data = await response.json();

      if (data.success) {
        this.content = data.data.content;
        this.watchHistory = data.data.watchHistory;

        if (this.content.type === 'movie') {
          this.loadMovie();
        } else {
          this.loadSeries();
        }
      } else {
        this.showError(data.message || 'שגיאה בטעינת התוכן');
      }
    } catch (error) {
      console.error('Error loading content:', error);
      this.showError('שגיאה בטעינת התוכן');
    }
  }

  loadMovie() {
    this.video.src = this.content.videoUrl;

    // אם זה restart – תמיד מתחיל מ-0, אחרת ממשיך מההתקדמות האחרונה אם קיימת
    if (!this.forceRestart && this.watchHistory && this.watchHistory.watchedDuration) {
      this.video.currentTime = this.watchHistory.watchedDuration;
    } else {
      this.video.currentTime = 0;
    }

    this.video.play().catch(err => {
      console.warn('Autoplay blocked:', err);
    });
  }

  loadSeries() {
    let episode;
    let startTime = 0;

    // Load last watched episode or first episode
    if (this.watchHistory && this.watchHistory.currentEpisode && !this.forceRestart) {
      episode = this.content.episodes.find(ep =>
        ep._id === this.watchHistory.currentEpisode.episodeId
      );

      if (episode && this.watchHistory.episodeProgress) {
        startTime = this.watchHistory.episodeProgress;
      }
    }

    if (!episode && this.content.episodes.length > 0) {
      episode = this.content.episodes[0];
      startTime = 0;
    }

    if (episode) {
      this.loadEpisode(episode, startTime);
    } else {
      this.showError('לא נמצאו פרקים להצגה');
    }
  }

  loadEpisode(episode, startTime = 0) {
    this.currentEpisode = episode;
    this.video.src = episode.videoUrl;
    this.video.currentTime = startTime || 0;

    this.video.play().catch(err => {
      console.warn('Autoplay blocked:', err);
    });

    // Update UI with episode info
    this.updateEpisodeInfo(episode);
  }

  updateEpisodeInfo(episode) {
    const episodeTitle = document.getElementById('episodeTitle');
    if (episodeTitle) {
      episodeTitle.textContent =
        `עונה ${episode.seasonNumber} פרק ${episode.episodeNumber}: ${episode.title}`;
    }
  }

  onPlay() {
    this.startProgressTracking();
  }

  onPause() {
    this.stopProgressTracking();
    this.saveProgress();
  }

  onTimeUpdate() {
    this.updateProgressBar();
  }

  onEnded() {
    this.stopProgressTracking();
    this.saveProgress(true);

    // For series, show next episode
    if (this.content && this.content.type === 'series') {
      this.showNextEpisodePrompt();
    }
  }

  onError(error) {
    console.error('Video error:', error);
    this.showError('שגיאה בהפעלת הווידאו');
  }

  updateProgressBar() {
    if (!this.video.duration || isNaN(this.video.duration)) return;

    const progress = (this.video.currentTime / this.video.duration) * 100;
    const progressBar = document.getElementById('progressFill');

    if (progressBar) {
      progressBar.style.width = progress + '%';
    }

    this.updateTimeDisplay();
  }

  updateTimeDisplay() {
    const timeDisplay = document.getElementById('timeDisplay');
    if (!timeDisplay) return;

    timeDisplay.textContent =
      `${this.formatTime(this.video.currentTime)} / ${this.formatTime(this.video.duration)}`;
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  startProgressTracking() {
    // Save progress every 10 seconds
    if (this.updateInterval) return;
    this.updateInterval = setInterval(() => {
      this.saveProgress();
    }, 10000);
  }

  stopProgressTracking() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async saveProgress(forceCompleted = false) {
    // אם אין וידאו מוכן עדיין – אין מה לשמור
    if (!this.video || !this.video.duration || isNaN(this.video.duration)) {
      return;
    }

    const ratio = this.video.currentTime / this.video.duration;
    const completed = forceCompleted || ratio >= 0.9; // 90% נחשב כסיום צפייה

    const progressData = {
      currentTime: this.video.currentTime,
      totalDuration: this.video.duration,
      device: this.getDeviceType(),
      completed
    };

    if (this.content && this.content.type === 'series' && this.currentEpisode) {
      progressData.episodeData = {
        seasonNumber: this.currentEpisode.seasonNumber,
        episodeNumber: this.currentEpisode.episodeNumber,
        episodeId: this.currentEpisode._id
      };
    }

    try {
      const res = await fetch(`/api/watch/${this.contentId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(progressData)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Failed to save progress:', res.status, data);
      } else {
        // אופציונלי: לעדכן את ה־watchHistory המקומי אם תרצה
        // const data = await res.json().catch(() => ({}));
        // this.watchHistory = data.data || this.watchHistory;
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  getDeviceType() {
    const width = window.innerWidth;
    if (width <= 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  handleKeyboard(event) {
    switch (event.key) {
      case ' ':
      case 'k':
        event.preventDefault();
        this.togglePlayPause();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.skip(-10);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.skip(10);
        break;
      case 'f':
        event.preventDefault();
        this.toggleFullscreen();
        break;
      case 'm':
        event.preventDefault();
        this.toggleMute();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.changeVolume(0.1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.changeVolume(-0.1);
        break;
    }
  }

  togglePlayPause() {
    if (this.video.paused) {
      this.video.play().catch(err => {
        console.warn('Autoplay blocked:', err);
      });
    } else {
      this.video.pause();
    }
  }

  skip(seconds) {
    if (!this.video.duration || isNaN(this.video.duration)) return;

    this.video.currentTime = Math.max(
      0,
      Math.min(this.video.currentTime + seconds, this.video.duration)
    );
  }

  toggleFullscreen() {
    const container = this.video.parentElement || this.video;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Exit fullscreen error:', err);
      });
    }
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
  }

  changeVolume(delta) {
    this.video.volume = Math.max(0, Math.min(1, this.video.volume + delta));
  }

  showNextEpisodePrompt() {
    const nextEpisode = this.getNextEpisode();

    if (nextEpisode) {
      const prompt = document.createElement('div');
      prompt.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 50px;
        background: rgba(0, 0, 0, 0.9);
        padding: 20px;
        border-radius: 8px;
        color: white;
        z-index: 10000;
      `;
      prompt.innerHTML = `
        <p>פרק הבא: ${nextEpisode.title}</p>
        <button onclick="player.playNextEpisode()" 
                style="background: #0078FF; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
          נגן עכשיו
        </button>
      `;

      document.body.appendChild(prompt);

      setTimeout(() => {
        if (document.body.contains(prompt)) {
          document.body.removeChild(prompt);
        }
      }, 15000);
    }
  }

  getNextEpisode() {
    if (!this.currentEpisode || !this.content || !this.content.episodes) return null;

    const currentIndex = this.content.episodes.findIndex(ep =>
      ep._id === this.currentEpisode._id
    );

    if (currentIndex >= 0 && currentIndex < this.content.episodes.length - 1) {
      return this.content.episodes[currentIndex + 1];
    }

    return null;
  }

  playNextEpisode() {
    const nextEpisode = this.getNextEpisode();
    if (nextEpisode) {
      this.loadEpisode(nextEpisode, 0);
    }
  }

  showError(message) {
    alert(message);
  }

  destroy() {
    this.stopProgressTracking();
    this.saveProgress();
  }
}

// Export for use
window.NetflixPlayer = NetflixPlayer;
