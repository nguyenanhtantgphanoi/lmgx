const {
  loginPageHandler,
  loginHandler,
  logoutHandler,
  verifyIdentityHandler,
} = require('../modules/auth/auth.controller');

async function authRoutes(app) {
  app.get('/login', loginPageHandler);

  app.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
  }, loginHandler);

  app.post('/logout', { preHandler: [app.requireAuth] }, logoutHandler);

  app.post('/auth/verify-identity', {
    preHandler: [app.requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
  }, verifyIdentityHandler);
}

module.exports = authRoutes;
