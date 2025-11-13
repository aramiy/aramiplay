const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/netflix-clone', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // טיפול באירועי חיבור
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // יצירת משתמש admin אם לא קיים
    await createAdminUser();

  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// יצירת משתמש admin ברירת מחדל
const createAdminUser = async () => {
  const User = require('../models/User');
  
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (!adminExists) {
      const admin = new User({
        username: 'admin',
        email: 'admin@netflix.com',
        password: 'admin',
        isAdmin: true,
        profiles: [{
          name: 'Admin Profile',
          avatar: '/images/admin-avatar.png'
        }]
      });
      
      await admin.save();
      console.log('✅ Admin user created (username: admin, password: admin)');
      logger.info('Admin user created');
    }
  } catch (error) {
    logger.error('Error creating admin user:', error);
  }
};

module.exports = connectDB;