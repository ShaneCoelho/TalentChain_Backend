const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
    inst_name: {
        type: String,
    },
    degree: {
        type: String,
    },
    start_year: {
        type: String,
    },
    end_year: {
        type: String,
    },
})

module.exports = mongoose.model('Education', educationSchema);
module.exports.educationSchema = educationSchema;