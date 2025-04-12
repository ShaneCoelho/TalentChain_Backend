const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    desc: {
        type: String,
    },
    start_date: {
        type: String,
        default: () => {
            const date = new Date();
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
    },
    prize: {
        type: Number,
    },
    app_link: {
        type: String,
    },
    guide_link: {
        type: String,
    },
    documentation_link: {
        type: String,
    },
    forum_link: {
        type: String,
    },
    skills: {
        type: Array,
    },
    repository: {
        type: String,
    },
    status: {
        type: String,
        default: "Not Assigned"
    },

    interested: {
        type: Array,
    },

    assigned_to: {
        type: Array,
    },
    approval: {
        type: Array,
        default: []
    },
    completed_by: {
        type: Array,
    },
});

module.exports = mongoose.model('Campaigns', campaignSchema);
module.exports.campaignSchema = campaignSchema;