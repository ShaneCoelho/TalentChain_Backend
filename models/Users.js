const mongoose = require('mongoose');
const bcrypt = require('bcrypt')

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
        default: "freelancer"
    },

    existingUser: {
        type: Boolean,
        default: false
    }

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