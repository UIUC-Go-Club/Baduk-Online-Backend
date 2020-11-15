const express = require('express');
const router = express.Router();
const {GameRecord} = require('../models/schema')

router.get('/room/:room_id', async function (req, res) {
    let room_id = req.params.room_id
    let gameRecords = await GameRecord.find(
        {room_id: room_id})
    res.send(gameRecords)
})

module.exports = router;