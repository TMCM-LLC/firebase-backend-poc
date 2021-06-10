var express = require('express');
const { User } = require('../models');
var router = express.Router();
var bcrypt = require('bcrypt');
var auth = require('../services/auth');

// POST Register User
router.post('/', async (req, res, next) => {

    if (!req.body.username || !req.body.password) {
        res.status(400).send('Username and pw required');
        return;
    }

    // hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    User.create({
        username: req.body.username,
        password: hashedPassword
    }).then(newUser => {
        res.json({
            id: newUser.id,
            username: newUser.username
        });
    }).catch(() => {
        res.status(400).send();
    });
});

// POST SignIn 
router.post('/login', async (req, res, next) =>  {
    User.findOne({
        where: {
            username: req.body.username
        }
    }).then(async user => {
        // check if user exists
        if (!user) {
            res.status(404).send('Invalid username');
            return;
        }
        // check the password
        const valid = await bcrypt.compare(req.body.password, user.password);

        if (valid) {
            // create the token
            const jwt = auth.createJWT(user);
            res.status(200).send({ jwt });
        } else {
            res.status(401).send('Invalid password');
        }

    });
});


module.exports = router;
