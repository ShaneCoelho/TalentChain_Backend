const mongoose = require('mongoose');
const bcrypt = require('bcrypt')

const campaignSchema = new mongoose.Schema({
    photo: {
        type: String,
    },
    name: {
        type: String,
    },
    desc: {
        type: String,
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
    discord_link: {
        type: String,
    }
});

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

    skills: {
        type: Array,
    },

    companytype: {
        type: Array,
    },

    campaigns: [campaignSchema]
    

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

mongoose.model('Users', usersSchema)