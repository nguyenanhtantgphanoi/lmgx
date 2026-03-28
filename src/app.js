const Fastify = require('fastify');

const envPlugin = require('./plugins/env');
const mongodbPlugin = require('./plugins/mongodb');
const staticPlugin = require('./plugins/static');
const viewPlugin = require('./plugins/view');
const routeRegistry = require('./routes');

function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(envPlugin);
  app.register(mongodbPlugin);
  app.register(staticPlugin);
  app.register(viewPlugin);
  app.register(routeRegistry);

  return app;
}

module.exports = buildApp;
