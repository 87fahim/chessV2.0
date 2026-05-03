process.env.APP_ENV = 'development';
process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://127.0.0.1:4173';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/chessv2-test';
process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';