/**
 * 描述: 任务路由模块
 */
const express = require('express');
const router = express.Router();
const {Message} = require('../models/schema')

async function saveModel(data, Model) {
    let model = new Model(data)
    await model.save()
    console.log('saved')
}


// room api to create a specific room with information
router.post('/:room_id', async function (req, res) {
    try {
        let room_id = req.params.room_id
        if (room_id == null) {
            res.sendStatus(400)
        }
        await saveModel(req.body, Message)
        res.sendStatus(201)
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    } finally {
        console.log('new room is created')
    }
})


router.get('/room/:room_id', async function (req, res) {
    let room_id = req.params.room_id
    let messages = await Message.find(
        {room_id: room_id},
        {
            skip: 0, // Starting Row
            sort: {
                sentTime: 1 //Sort ASC
            }
        })
    res.send(messages)
})

router.delete('/room/:room_id', async function (req, res) {
    try {
        let room_id = req.params.room_id
        if (room_id == null) {
            res.sendStatus(400)
        }
        await Message.deleteOne(
            {room_id: room_id}, {
            skip: 0, // Starting Row
            sort: {
                sentTime: 1 //Sort ASC
            }
        })
        res.sendStatus(204)
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    } finally {
        console.log(`a room deleted`)
    }
})

router.get('/user/:username', async function (req, res) {
    let username = req.params.username
    let messages = await Message.find({username: username})
    res.send(messages)
})

router.delete('/user/:username', async function (req, res) {
    try {
        let username = req.params.username
        if (username == null) {
            res.sendStatus(400)
        }
        await Message.deleteOne({username: username})
        res.sendStatus(204)
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    } finally {
        console.log(`a room deleted`)
    }
})

router.delete('/delete/all', async function (req, res) {
    try {
        await Message.deleteMany({})
        res.sendStatus(204)
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    } finally {
        console.log(`all rooms deleted`)
    }
})

module.exports = router;