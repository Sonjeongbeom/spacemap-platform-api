/* eslint-disable no-console */

const mongoose = require('mongoose');

class DataBase {
  static async initializeDatabase() {
    return mongoose.connect(process.env.MONGO_INFO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'SPACEMAP-PLATFORM',
    });
  }
}

module.exports = DataBase;
