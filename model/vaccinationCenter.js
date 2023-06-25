const mongoose = require('mongoose');

const vaccinationCenterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  workingHours: { type: String, required: true },
  availableSlots: { type: Number, default: 0 },
});

const VaccinationCenter = mongoose.model('VaccinationCenter', vaccinationCenterSchema);

module.exports = VaccinationCenter;
