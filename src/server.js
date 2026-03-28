const buildApp = require('./app');

async function start() {
  const app = buildApp();

  try {
    await app.ready();
    await app.listen({
      port: app.config.PORT,
      host: '0.0.0.0',
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
