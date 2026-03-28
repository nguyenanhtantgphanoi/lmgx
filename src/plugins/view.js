const fp = require('fastify-plugin');
const fastifyView = require('@fastify/view');
const path = require('path');
const ejs = require('ejs');

module.exports = fp(async function viewPlugin(app) {
  app.register(fastifyView, {
    engine: {
      ejs,
    },
    root: path.join(__dirname, '../views'),
  });
});
