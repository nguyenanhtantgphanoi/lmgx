async function healthRoutes(app) {
  app.get('/health', async () => {
    return { status: 'ok' };
  });
}

module.exports = healthRoutes;
