const express = require('express');
const router = express.Router();
const {User} = require('../models/schema')


router.get('/:username', async function (req, res) {
    let username = req.params.username
    let user = await User.findOne({username: username})
    res.send(user)
})

router.post('/:username', async function (req, res) {
    try {
        let username = req.params.username
        if (username == null) {
            res.sendStatus(400)
        }

        let newUser = new User(req.body)
        await newUser.save()
        console.log('saved')

        res.sendStatus(201)
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    } finally {
        console.log('new users is saved')
    }
})

router.delete('/:username', async function (req, res) {
    try {
        let username = req.params.username
        if (username == null) {
            res.sendStatus(400)
        }
        await User.deleteOne({username: username})
        res.sendStatus(204)
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    } finally {
        console.log(`a user deleted`)
    }
})

module.exports = router;
