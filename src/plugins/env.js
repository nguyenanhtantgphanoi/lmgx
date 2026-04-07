const fp = require('fastify-plugin');
const dotenv = require('dotenv');

module.exports = fp(async function envPlugin(app) {
  dotenv.config();

  const {
    PORT = '3000',
    MONGODB_URI,
    ADMIN_USERNAME = 'admin',
    ADMIN_PASSWORD = 'Admin@1234',
    SESSION_SECRET,
  } = process.env;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET is required and must be at least 32 characters');
  }

  app.decorate('config', {
    PORT: Number(PORT),
    MONGODB_URI,
    ADMIN_USERNAME,
    ADMIN_PASSWORD,
    SESSION_SECRET,
  });
});
