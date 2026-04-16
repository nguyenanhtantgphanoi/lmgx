const fp = require('fastify-plugin');
const bcrypt = require('bcryptjs');
const cookie = require('@fastify/cookie');
const session = require('@fastify/session');

module.exports = fp(async function authPlugin(app) {
  // Hash the admin password once at startup so comparisons are safe
  const adminPasswordHash = bcrypt.hashSync(app.config.ADMIN_PASSWORD, 10);

  // Store the hash in config for use in the auth controller
  app.config.ADMIN_PASSWORD_HASH = adminPasswordHash;

  await app.register(cookie);

  await app.register(session, {
    secret: app.config.SESSION_SECRET,
    saveUninitialized: false,
    cookie: {
      secure: 'auto',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  });

  // Decorate request with a helper to check auth
  app.decorateRequest('isAuthenticated', function () {
    return this.session.get('isAuthenticated') === true;
  });

  // Reusable preHandler that guards protected routes
  app.decorate('requireAuth', async function requireAuth(request, reply) {
    if (!request.session.get('isAuthenticated')) {
      return reply.redirect('/login');
    }
  });
});
