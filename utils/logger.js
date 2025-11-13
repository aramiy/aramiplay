const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
    this.logFile = path.join(this.logDir, 'app.log');
    this.errorFile = path.join(this.logDir, 'error.log');
    
    // יצירת תיקיית logs אם לא קיימת
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      if (typeof data === 'object') {
        logMessage += '\n' + JSON.stringify(data, null, 2);
      } else {
        logMessage += ' ' + data;
      }
    }
    
    return logMessage + '\n';
  }

  writeToFile(filename, message) {
    try {
      fs.appendFileSync(filename, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message, data = null) {
    const formattedMessage = this.formatMessage('INFO', message, data);
    console.log(formattedMessage);
    this.writeToFile(this.logFile, formattedMessage);
  }

  warn(message, data = null) {
    const formattedMessage = this.formatMessage('WARN', message, data);
    console.warn(formattedMessage);
    this.writeToFile(this.logFile, formattedMessage);
  }

  error(message, data = null) {
    const formattedMessage = this.formatMessage('ERROR', message, data);
    console.error(formattedMessage);
    this.writeToFile(this.logFile, formattedMessage);
    this.writeToFile(this.errorFile, formattedMessage);
  }

  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = this.formatMessage('DEBUG', message, data);
      console.debug(formattedMessage);
      this.writeToFile(this.logFile, formattedMessage);
    }
  }
}

module.exports = new Logger();