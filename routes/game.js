const express = require('express');
const router = express.Router();
const {GameRecord} = require('../models/schema')

router.get('/room/:room_id', async function (req, res) {
    let room_id = req.params.room_id
    let gameRecords = await GameRecord.find(
        {room_id: room_id})
    res.send(gameRecords)
})

// router.get('/user/:username', async function (req, res) {
//     let username = req.params.username
//     let gameRecords = await GameRecord.find(
//         {players:
//                 {$elemMatch: {username:username}}
//         })
//     res.send(gameRecords)
// })

module.exports = router;