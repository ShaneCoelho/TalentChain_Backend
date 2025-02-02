const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    proj_name: {
        type: String,
    },
    desc: {
        type: String,
    },
    link: {
        type: String,
    }
})

module.exports = mongoose.model('Project', projectSchema);
module.exports.projectSchema = projectSchema;