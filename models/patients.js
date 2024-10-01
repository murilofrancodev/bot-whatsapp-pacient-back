const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    appointmentDay: { type: String, required: true },
    appointmentTime: { type: String, required: true },
    message: { type: String, required: true }
});

module.exports = mongoose.model('Patient', patientSchema);