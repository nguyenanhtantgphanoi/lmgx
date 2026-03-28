const {
  createPriestHandler,
  listPriestsHandler,
  getPriestByIdHandler,
  updatePriestProfileHandler,
  deletePriestHandler,
} = require('../modules/priest/priest.controller');

const priestBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    // Personal
    saintName:         { type: 'string' },
    fullName:          { type: 'string', minLength: 1 },
    dateOfBirth:       { type: 'string' },
    placeOfBirth:      { type: 'string' },
    homeCommunity:     { type: 'string' },
    homeParish:        { type: 'string' },
    diocese:           { type: 'string' },
    permanentAddress:  { type: 'string' },
    nationalId:        { type: 'string' },
    passport:          { type: 'string' },
    healthInsuranceId: { type: 'string' },
    phone:             { type: 'string' },
    email:             { type: 'string' },
    dateOfDeath:       { type: 'string' },
    placeOfDeath:      { type: 'string' },
    burialDate:        { type: 'string' },
    placeOfBurial:     { type: 'string' },
    // Family
    fatherName:      { type: 'string' },
    motherName:      { type: 'string' },
    familyAddress:   { type: 'string' },
    familyCommunity: { type: 'string' },
    familyParish:    { type: 'string' },
    siblings:        { type: 'array' },
    // Education
    schools:       { type: 'array' },
    // Sacraments
    baptism:       { type: 'object' },
    confirmation:  { type: 'object' },
    // Ordination
    diaconate:     { type: 'object' },
    priesthood:    { type: 'object' },
    // Transfer
    originalDiocese:   { type: 'string' },
    joinedDioceseDate: { type: 'string' },
    // Ministry
    missions: { type: 'array' },
    // Status / Notes
    status: { type: 'string', enum: ['active', 'inactive', 'retired'] },
    notes:  { type: 'string' },
  },
};

async function priestRoutes(app) {
  app.get('/priests', listPriestsHandler);

  app.post('/priests', {
    schema: {
      body: {
        ...priestBodySchema,
        required: ['fullName'],
      },
    },
  }, createPriestHandler);

  app.get('/priests/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', minLength: 1 },
        },
      },
    },
  }, getPriestByIdHandler);

  app.put('/priests/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', minLength: 1 },
        },
      },
      body: {
        ...priestBodySchema,
        minProperties: 1,
      },
    },
  }, updatePriestProfileHandler);

  app.delete('/priests/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', minLength: 1 },
        },
      },
    },
  }, deletePriestHandler);
}

module.exports = priestRoutes;
