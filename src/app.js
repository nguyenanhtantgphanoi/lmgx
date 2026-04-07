const Fastify = require('fastify');

const envPlugin = require('./plugins/env');
const mongodbPlugin = require('./plugins/mongodb');
const staticPlugin = require('./plugins/static');
const viewPlugin = require('./plugins/view');
const authPlugin = require('./plugins/auth');
const multipartPlugin = require('@fastify/multipart');
const routeRegistry = require('./routes');

function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(envPlugin);
  app.register(mongodbPlugin);
  app.register(staticPlugin);
  app.register(viewPlugin);
  app.register(authPlugin);
  app.register(require('@fastify/formbody'));
  app.register(multipartPlugin, {
    limits: {
      files: 10,
      fileSize: 10 * 1024 * 1024,
    },
  });
  app.register(routeRegistry);

  return app;
}

module.exports = buildApp;
