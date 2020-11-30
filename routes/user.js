const express = require('express');
const router = express.Router();
const {User} = require('../models/schema')

router.get('/', async function (req, res) {
    let users = await User.find({})
    res.send(users)
})

router.get('/:username', async function (req, res) {
    let username = req.params.username
    let user = await User.findOne({username: username}).populate('active_games').populate('past_games')
    res.send(user)
})

router.post('/:username', async function (req, res) {
    try {
        let username = req.params.username
        if (username == null) {
            res.status(400).send('required field missing')
            return
        }
        if (await User.findOne({username: username}) != null) {
            res.status(400).send('user already existed')
            return
        }

        let newUser = new User(req.body)
        await newUser.save()
        console.log('saved')
        res.sendStatus(201)
        console.log('new users is saved')
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    }
})

router.patch('/:username', async function (req, res) {
    console.log("try update user information")
    let username = req.params.username
    if (username == null) {
        console.log('username unknown')
        res.status(400).send('required field missing')
        return
    }

    if (await User.findOne({username: username}) == null) {
        console.log('update a user, but user does not exists')
        res.status(400).send('user does not exists')
        return
    }

    try {
        let result = await User.updateOne(
            {'username': username},
            {$set: req.body}
        )
        console.log(result)
        res.sendStatus(204)
        console.log('successfully updated')
    } catch (error) {
        res.sendStatus(500)
        console.error(error)
    }
})

router.delete('/:username', async function (req, res) {
    try {
        let username = req.params.username
        if (username == null) {
            res.sendStatus(400)
            return
        }
        await User.deleteOne({username: username})
        res.sendStatus(204)
        console.log(`a user deleted`)
    } catch (error) {
        res.sendStatus(500)
        console.error(error)
    }
})

router.delete('/delete/all', async function (req, res) {
    try {
        await User.deleteMany({})
        res.sendStatus(204)
        console.log(`all users deleted`)
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    }
})

module.exports = router;
