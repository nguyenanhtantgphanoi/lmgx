const bcrypt = require('bcryptjs');

async function loginPageHandler(request, reply) {
  if (request.session.get('isAuthenticated')) {
    return reply.redirect('/admin-dashboard');
  }
  return reply.view('pages/login.ejs', { error: null });
}

async function loginHandler(request, reply) {
  const { username, password } = request.body;

  const validUsername = username === request.server.config.ADMIN_USERNAME;
  const validPassword =
    validUsername &&
    bcrypt.compareSync(password, request.server.config.ADMIN_PASSWORD_HASH);

  if (!validUsername || !validPassword) {
    return reply.view('pages/login.ejs', { error: 'Invalid username or password.' });
  }

  request.session.set('isAuthenticated', true);
  request.session.set('username', username);

  return reply.redirect('/admin-dashboard');
}

async function logoutHandler(request, reply) {
  await new Promise((resolve, reject) => {
    request.session.destroy((err) => (err ? reject(err) : resolve()));
  });
  return reply.redirect('/login');
}

async function verifyIdentityHandler(request, reply) {
  const { username, password } = request.body;

  const validUsername = username === request.server.config.ADMIN_USERNAME;
  const validPassword =
    validUsername &&
    bcrypt.compareSync(password, request.server.config.ADMIN_PASSWORD_HASH);

  if (!validUsername || !validPassword) {
    return reply.code(401).send({ message: 'Invalid username or password.' });
  }

  return reply.send({ verified: true });
}

module.exports = {
  loginPageHandler,
  loginHandler,
  logoutHandler,
  verifyIdentityHandler,
};
