const fp = require('fastify-plugin');
const mongoose = require('mongoose');

module.exports = fp(async function mongodbPlugin(app) {
  await mongoose.connect(app.config.MONGODB_URI);

  app.addHook('onClose', async () => {
    await mongoose.connection.close();
  });
});
