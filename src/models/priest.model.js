const mongoose = require('mongoose');

// NOTE: If upgrading from the previous schema, the old unique index on `email`
// must be dropped manually: db.priests.dropIndex("email_1")

const degreeSchema = new mongoose.Schema(
  {
    degreeName: { type: String, trim: true, default: '' },
    level:      { type: String, trim: true, default: '' },
    major:      { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const schoolSchema = new mongoose.Schema(
  {
    schoolName: { type: String, trim: true, default: '' },
    from:       { type: Date, default: null },
    to:         { type: Date, default: null },
    degrees:    { type: [degreeSchema], default: [] },
  },
  { _id: false }
);

const siblingSchema = new mongoose.Schema(
  {
    saintAndFullName: { type: String, trim: true, default: '' },
    birthYear:        { type: Number, default: null },
    deathYear:        { type: Number, default: null },
    occupation:       { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const sacramentSchema = new mongoose.Schema(
  {
    date:      { type: Date, default: null },
    place:     { type: String, trim: true, default: '' },
    minister:  { type: String, trim: true, default: '' },
    godparent: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const ordinationSchema = new mongoose.Schema(
  {
    date:   { type: Date, default: null },
    place:  { type: String, trim: true, default: '' },
    bishop: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const missionSchema = new mongoose.Schema(
  {
    name:              { type: String, trim: true, default: '' },
    places:            { type: String, trim: true, default: '' },
    from:              { type: Date, default: null },
    to:                { type: Date, default: null },
    appointmentLetter: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const priestSchema = new mongoose.Schema(
  {
    // Personal information
    saintName:         { type: String, trim: true, default: '' },
    fullName:          { type: String, required: true, trim: true },
    dateOfBirth:       { type: Date, default: null },
    placeOfBirth:      { type: String, trim: true, default: '' },
    homeCommunity:     { type: String, trim: true, default: '' },
    homeParish:        { type: String, trim: true, default: '' },
    diocese:           { type: String, trim: true, default: '' },
    permanentAddress:  { type: String, trim: true, default: '' },
    nationalId:        { type: String, trim: true, default: '' },
    passport:          { type: String, trim: true, default: '' },
    healthInsuranceId: { type: String, trim: true, default: '' },
    phone:             { type: String, trim: true, default: '' },
    email:             { type: String, trim: true, lowercase: true, default: undefined },
    dateOfDeath:       { type: Date, default: null },
    placeOfDeath:      { type: String, trim: true, default: '' },
    burialDate:        { type: Date, default: null },
    placeOfBurial:     { type: String, trim: true, default: '' },

    // Family
    fatherName:     { type: String, trim: true, default: '' },
    motherName:     { type: String, trim: true, default: '' },
    familyAddress:  { type: String, trim: true, default: '' },
    familyCommunity:{ type: String, trim: true, default: '' },
    familyParish:   { type: String, trim: true, default: '' },
    siblings:       { type: [siblingSchema], default: [] },

    // Vocation / Education
    schools: { type: [schoolSchema], default: [] },

    // Sacraments
    baptism:      { type: sacramentSchema, default: () => ({}) },
    confirmation: { type: sacramentSchema, default: () => ({}) },

    // Ordination
    diaconate:  { type: ordinationSchema, default: () => ({}) },
    priesthood: { type: ordinationSchema, default: () => ({}) },

    // Diocese transfer
    originalDiocese:   { type: String, trim: true, default: '' },
    joinedDioceseDate: { type: Date, default: null },

    // Ministry history
    missions: { type: [missionSchema], default: [] },

    // Status / Notes
    status: {
      type: String,
      enum: ['active', 'inactive', 'retired'],
      default: 'active',
    },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

const Priest = mongoose.model('Priest', priestSchema);
module.exports = Priest;
