const healthRoutes = require('./health.route');
const userRoutes = require('./user.route');
const priestRoutes = require('./priest.route');

const ADMIN_NAV_ITEMS = [
  { path: '/admin-dashboard', label: 'Dashboard' },
  { path: '/user-manager', label: 'User Manage' },
  { path: '/priest-manager', label: 'Priest Manager' },
  { path: '/parish-manage', label: 'Parish Manage' },
  { path: '/local-ordinary-manager', label: 'Local Ordinary Manager' },
];

function renderAdminPage(reply, options) {
  return reply.view('layouts/admin-layout.ejs', {
    navItems: ADMIN_NAV_ITEMS,
    pageData: {},
    styles: [],
    scripts: [],
    ...options,
  });
}

async function routeRegistry(app) {
  app.get('/admin-dashboard', async (_request, reply) => {
    return renderAdminPage(reply, {
      title: 'Admin Dashboard',
      heading: 'Admin Dashboard',
      subheading: 'Choose a management function to continue.',
      activePath: '/admin-dashboard',
      pagePartial: '../pages/dashboard-content.ejs',
      styles: ['dashboard.css'],
    });
  });

  app.get('/user-manager', async (_request, reply) => {
    return renderAdminPage(reply, {
      title: 'User Admin',
      heading: 'User Admin',
      subheading: 'Create, list, edit, and delete users from one dashboard.',
      activePath: '/user-manager',
      pagePartial: '../pages/user-manager-content.ejs',
      styles: ['admin.css'],
      scripts: ['admin.js'],
    });
  });

  app.get('/priest-manager', async (_request, reply) => {
    return renderAdminPage(reply, {
      title: 'Priest Manager',
      heading: 'Priest Manager',
      subheading: 'Create priests and open profile pages for a particular priest.',
      activePath: '/priest-manager',
      pagePartial: '../pages/priest-manager-content.ejs',
      styles: ['priest-manager.css'],
      scripts: ['priest-manager.js'],
    });
  });

  app.get('/priest-manager/:id', async (request, reply) => {
    return renderAdminPage(reply, {
      title: 'Priest Profile',
      heading: 'Priest Profile Manager',
      subheading: 'Edit or delete a particular priest profile.',
      activePath: '/priest-manager',
      pagePartial: '../pages/priest-profile-content.ejs',
      styles: ['priest-profile.css'],
      scripts: ['priest-profile.js'],
      pageData: {
        priestId: request.params.id,
      },
    });
  });

  app.get('/parish-manage', async (_request, reply) => {
    return renderAdminPage(reply, {
      title: 'Parish Manage',
      heading: 'Parish Manage',
      subheading: 'Manage parish profiles and related data.',
      activePath: '/parish-manage',
      pagePartial: '../pages/module-placeholder-content.ejs',
      styles: ['module-page.css'],
      pageData: {
        message: 'This module is ready for implementation.',
      },
    });
  });

  app.get('/local-ordinary-manager', async (_request, reply) => {
    return renderAdminPage(reply, {
      title: 'Local Ordinary Manager',
      heading: 'Local Ordinary Manager',
      subheading: 'Manage local ordinary information and contacts.',
      activePath: '/local-ordinary-manager',
      pagePartial: '../pages/module-placeholder-content.ejs',
      styles: ['module-page.css'],
      pageData: {
        message: 'This module is ready for implementation.',
      },
    });
  });

  app.register(healthRoutes, { prefix: '/api' });
  app.register(userRoutes, { prefix: '/api' });
  app.register(priestRoutes, { prefix: '/api' });
}

module.exports = routeRegistry;
