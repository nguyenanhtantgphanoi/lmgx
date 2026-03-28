const fp = require('fastify-plugin');
const dotenv = require('dotenv');

module.exports = fp(async function envPlugin(app) {
  dotenv.config();

  const { PORT = '3000', MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  app.decorate('config', {
    PORT: Number(PORT),
    MONGODB_URI,
  });
});
