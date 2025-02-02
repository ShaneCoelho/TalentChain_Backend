const mongoose = require('mongoose');
const bcrypt = require('bcrypt')
const { campaignSchema } = require('./Campaigns');
const { educationSchema } = require('./Education');
const { experienceSchema } = require('./Experience');
const { projectSchema } = require('./Project');

const usersSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    
    email: {
        type: String,
        required: true
    },

    image: {
        type: String
    },

    password: {
        type: String,
    },

    role: {
        type: String,
        default: ""
    },

    existingUser: {
        type: Boolean,
        default: false
    },

    phone: {
        type: String,
    },

    regno: {
        type: String,
    },

    bio: {
        type: String,
        default: ""
    },

    about: {
        type: String,
        default: ""
    },

    skills: {
        type: Array,
        default: []
    },

    companytype: {
        type: Array,
    },

    campaigns: [campaignSchema],

    education: [educationSchema],

    experience: [experienceSchema],
    
    projects: [projectSchema],
})

usersSchema.pre('save', function (next) {
    const users = this;
    if (!users.isModified('password')) {
        return next()
    }
    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            return next(err)
        }

        bcrypt.hash(users.password, salt, (err, hash) => {
            if (err) {
                return next(err)
            }
            users.password = hash;
            next()
        })
    })

})

usersSchema.methods.comparePassword = function (candidatePassword) {
    const users = this;
    return new Promise((resolve, reject) => {
        bcrypt.compare(candidatePassword, users.password, (err, isMatch) => {
            if (err) {
                return reject(err)
            }
            if (!isMatch) {
                return reject(err)
            }
            resolve(true)
        })
    })
}

usersSchema.pre('save', function(next) {
    if (this.campaigns && this.campaigns.length > 0) {
      // Move the last element to the 0th position
      const lastCampaign = this.campaigns.pop();
      this.campaigns.unshift(lastCampaign);
    }
    next();
  });

mongoose.model('Users', usersSchema)