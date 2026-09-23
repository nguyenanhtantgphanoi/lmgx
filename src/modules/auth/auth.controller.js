const bcrypt = require('bcryptjs');
const User = require('../../models/user.model');

async function validateCredentials(server, username, password) {
  const normalizedIdentifier = String(username || '').trim();
  const normalizedPassword = String(password || '');

  if (!normalizedIdentifier || !normalizedPassword) {
    return { ok: false };
  }

  const isAdminUsername = normalizedIdentifier === server.config.ADMIN_USERNAME;
  if (isAdminUsername) {
    const adminPasswordValid = bcrypt.compareSync(
      normalizedPassword,
      server.config.ADMIN_PASSWORD_HASH
    );

    if (adminPasswordValid) {
      return {
        ok: true,
        principal: {
          type: 'admin',
          username: server.config.ADMIN_USERNAME,
        },
      };
    }
  }

  const identifierAsEmail = normalizedIdentifier.toLowerCase();
  const user = await User.findOne({ email: identifierAsEmail }).select('+password');
  if (!user || !user.password) {
    return { ok: false };
  }

  const userPasswordValid = await bcrypt.compare(normalizedPassword, user.password);
  if (!userPasswordValid) {
    return { ok: false };
  }

  return {
    ok: true,
    principal: {
      type: 'user',
      userId: String(user._id),
      username: user.email,
      name: user.name,
    },
  };
}

async function loginPageHandler(request, reply) {
  if (request.session.get('isAuthenticated')) {
    return reply.redirect('/admin-dashboard');
  }
  return reply.view('pages/login.ejs', { error: null });
}

async function loginHandler(request, reply) {
  const { username, password } = request.body;

  const validation = await validateCredentials(request.server, username, password);
  if (!validation.ok) {
    return reply.view('pages/login.ejs', { error: 'Invalid username or password.' });
  }

  request.session.set('isAuthenticated', true);
  request.session.set('username', validation.principal.username);
  request.session.set('principalType', validation.principal.type);

  if (validation.principal.userId) {
    request.session.set('userId', validation.principal.userId);
  }

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

  const validation = await validateCredentials(request.server, username, password);
  if (!validation.ok) {
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
