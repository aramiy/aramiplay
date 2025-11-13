// Charts.js - Statistics and Charts Management

class NetflixCharts {
  constructor() {
    this.dailyChart = null;
    this.genreChart = null;
    this.colors = {
      primary: '#0078FF',
      secondary: '#FFD24C',
      tertiary: '#FFCC33',
      light: '#B5D5FF',
      lighter: '#F4F8FF'
    };
  }

  async loadStats() {
    try {
      const response = await fetch('/api/watch/stats');
      const data = await response.json();
      
      if (data.success) {
        this.renderDailyChart(data.data.daily);
        this.renderGenreChart(data.data.byGenre);
        this.updateSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  renderDailyChart(dailyData) {
    if (!dailyData || dailyData.length === 0) {
      console.log('No daily data available');
      return;
    }

    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;

    // Group by date
    const groupedData = {};
    dailyData.forEach(item => {
      const date = item._id.date;
      if (!groupedData[date]) {
        groupedData[date] = 0;
      }
      groupedData[date] += item.count;
    });

    const dates = Object.keys(groupedData).sort();
    const counts = dates.map(date => groupedData[date]);

    // Destroy existing chart
    if (this.dailyChart) {
      this.dailyChart.destroy();
    }

    // Create new chart
    this.dailyChart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: dates.map(d => this.formatDate(d)),
        datasets: [{
          label: 'צפיות ביום',
          data: counts,
          backgroundColor: this.colors.primary,
          borderColor: this.colors.primary,
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 14,
              family: 'Segoe UI'
            },
            bodyFont: {
              size: 13,
              family: 'Segoe UI'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: {
                family: 'Segoe UI'
              }
            },
            grid: {
              color: '#E8F2FF'
            }
          },
          x: {
            ticks: {
              font: {
                family: 'Segoe UI'
              }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  renderGenreChart(genreData) {
    if (!genreData || genreData.length === 0) {
      console.log('No genre data available');
      return;
    }

    const ctx = document.getElementById('genreChart');
    if (!ctx) return;

    const genres = genreData.map(g => g._id);
    const counts = genreData.map(g => g.count);
    
    const colors = [
      this.colors.primary,
      this.colors.secondary,
      this.colors.tertiary,
      this.colors.light,
      this.colors.lighter,
      '#A0C4FF',
      '#FFE699',
      '#CCDDFF'
    ];

    // Destroy existing chart
    if (this.genreChart) {
      this.genreChart.destroy();
    }

    // Create new chart
    this.genreChart = new Chart(ctx.getContext('2d'), {
      type: 'pie',
      data: {
        labels: genres,
        datasets: [{
          data: counts,
          backgroundColor: colors.slice(0, genres.length),
          borderColor: '#FFFFFF',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 12,
                family: 'Segoe UI'
              },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 14,
              family: 'Segoe UI'
            },
            bodyFont: {
              size: 13,
              family: 'Segoe UI'
            },
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((context.parsed / total) * 100);
                return ` ${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  updateSummary(summary) {
    const totalWatched = document.getElementById('totalWatched');
    const totalCompleted = document.getElementById('totalCompleted');
    const totalHours = document.getElementById('totalHours');

    if (totalWatched) {
      totalWatched.textContent = summary.totalWatched || 0;
      this.animateNumber(totalWatched, 0, summary.totalWatched || 0);
    }

    if (totalCompleted) {
      totalCompleted.textContent = summary.totalCompleted || 0;
      this.animateNumber(totalCompleted, 0, summary.totalCompleted || 0);
    }

    if (totalHours) {
      const hours = Math.round((summary.totalDuration || 0) / 3600);
      totalHours.textContent = hours;
      this.animateNumber(totalHours, 0, hours);
    }
  }

  animateNumber(element, start, end, duration = 1000) {
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const current = Math.floor(start + (end - start) * this.easeOutQuad(progress));
      element.textContent = current;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  easeOutQuad(t) {
    return t * (2 - t);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  }

  destroy() {
    if (this.dailyChart) {
      this.dailyChart.destroy();
      this.dailyChart = null;
    }
    
    if (this.genreChart) {
      this.genreChart.destroy();
      this.genreChart = null;
    }
  }
}

// Create global instance
window.netflixCharts = new NetflixCharts();