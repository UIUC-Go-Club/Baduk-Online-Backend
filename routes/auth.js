const express = require('express');
const router = express.Router();
const {User} = require('../models/schema')
const crypto = require('crypto');
const jwt = require("jsonwebtoken");
const config = require("../env");

router.post('/login', async function (req, res) {
    console.log('some user want to login')
    if (req.body == null) {
        console.log('bad request, body should not be null')
        res.status(400).send('bad request, body should not be null')
        return
    }


    let username = req.body.username
    let password = req.body.password
    if (username == null || password == null) {
        console.log('required field missing')
        res.status(400).send('required field missing')
        return
    }

    let user = await User.findOne({username: username})
    if (user == null) {
        console.log(`user ${username} does not exists`)
        res.status(400).send('user ${username} does not exists')
        return
    }

    try {
        /*
         * Check if the username and hashed password is correct
         */
        let passwordHash = crypto.createHash('md5').update(password).digest('hex')
        if (req.body.username === user.username && passwordHash === user.password) {
            await user.updateOne({lastLoginTime: new Date()})
            console.log('login successfully')
            res.json({
                username: username,
                jwt: jwt.sign({
                        id: 1,
                    }, config.JWT_SECRET, {expiresIn: 60 * 60}
                )
            });
        } else {
            /*
             * If the username or password was wrong, return 401 ( Unauthorized )
             * status code and JSON error message
             */
            console.log('Wrong username or password!')
            res.status(401).json({
                error: {
                    message: 'Wrong username or password!'
                }
            });
        }
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    }
});

router.post('/signup', async function (req, res) {
    console.log('some user want to signup')
    if (req.body == null) {
        res.status(400).send('bad request, body should not be null')
        return
    }

    let username = req.body.username
    let password = req.body.password
    if (username == null || password == null) {
        console.log('required field missing')
        res.status(400).send('required field missing')
        return
    }

    if (await User.findOne({username: username}) != null) {
        console.log('user already exists')
        res.status(400).send('username already existed, please login in')
        return
    }

    try {
        // Will not save password, instead, its harsh
        let passwordHash = crypto.createHash('md5').update(password).digest('hex')
        let newUser = new User(req.body)
        newUser.password = passwordHash
        newUser.lastLoginTime = new Date()
        await newUser.save()
        console.log(`${newUser.username} saved`)
    } catch (error) {
        console.log('error in saving this new user')
        res.sendStatus(500)
        return console.error(error)
    }

    console.log('signup successfully')
    res.status(201).send(
        JSON.stringify({
            username: username,
            info: 'user created successfully',
            jwt: jwt.sign({
                id: 1,
            }, config.JWT_SECRET, {expiresIn: 60 * 60})
        })
    )
});

router.post('/reset_password', async function (req, res) {
    if (req.body == null) {
        res.status(400).send('bad request, body should not be null')
        return
    }


    let username = req.body.username
    let password = req.body.password
    if (username == null || password == null) {
        res.status(400).send('required field missing')
        return
    }

    let user = await User.findOne({username: username})
    if (user == null) {
        res.status(400).send('user does not exists')
        return
    }

    try {
        // Will not save password, instead, its harsh
        let passwordHash = crypto.createHash('md5').update(password).digest('hex')
        user.password = passwordHash
        user.lastLoginTime = new Date()

        await user.save()

        console.log(`${User.username} password reset`)
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    }

    res.status(200).send(
        JSON.stringify({
            username: username,
            info: 'user password reset successfully',
            jwt: jwt.sign({
                id: 1,
            }, config.JWT_SECRET, {expiresIn: 60 * 60})
        })
    )
});

module.exports = router;