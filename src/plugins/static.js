const fp = require('fastify-plugin');
const fastifyStatic = require('@fastify/static');
const path = require('path');

module.exports = fp(async function staticPlugin(app) {
  app.register(fastifyStatic, {
    root: path.join(__dirname, '../../public'),
  });
});
