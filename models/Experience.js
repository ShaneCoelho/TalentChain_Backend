const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
    company_name: {
        type: String,
    },
    position: {
        type: String,
    },
    start_date: {
        type: String,
    },
    end_date: {
        type: String,
    },
})

module.exports = mongoose.model('Experience', experienceSchema);
module.exports.experienceSchema = experienceSchema;