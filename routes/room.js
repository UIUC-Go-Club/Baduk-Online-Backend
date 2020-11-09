/**
 * 描述: 任务路由模块
 */
const express = require('express');
const router = express.Router();
const {Room} = require('../models/schema')

// debug helper
router.use(function timeLog (req, res, next) {
    console.log('Time: ', Date.now())
    next()
})

// room api to create a specific room with information
router.post('/:room_id',  async function (req, res) {
    try {
        let room_id = req.params.room_id
        if (room_id == null) {
            res.sendStatus(400)
        }
        let newRoom = new Room(req.body)
        newRoom.save()
        console.log('saved')
        res.sendStatus(201)
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    } finally {
        console.log('new room is created')
    }
})

// room api get specific room information
router.get('/:room_id',  async function (req, res) {
    let room_id = req.params.room_id
    let room = await Room.findOne({room_id: room_id})
    res.send(room)
})

// room api get specific room information
router.get('',  async function (req, res) {
    let rooms = await Room.find({})
    res.send(rooms)
})

router.delete('/:room_id', async function (req, res) {
    try {
        let room_id = req.params.room_id
        if (room_id == null) {
            res.sendStatus(400)
        }
        await Room.deleteOne({room_id: room_id})
        res.sendStatus(204)
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    } finally {
        console.log(`a room deleted`)
    }
})
module.exports = router;