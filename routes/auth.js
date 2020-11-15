const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {User} = require('../models')
const accessTokenSecret = 'youraccesstokensecret';

router.post('/login', async function (req, res) {
    const { username, password } = req.body;

    // Filter user from the users array by username and password
    const user = User.find(u => { return u.username === username && u.password === password });

    if (user) {
        // Generate an access token
        const accessToken = jwt.sign({ username: user.username,  role: user.role }, accessTokenSecret);

        res.json({
            accessToken
        });
    } else {
        res.send('Username or password incorrect');
    }
})

module.exports = router;