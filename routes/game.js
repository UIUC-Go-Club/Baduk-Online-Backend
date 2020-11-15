const express = require('express');
const router = express.Router();
const {Game} = require('../models/schema')

// router.get('/:room_id', function (req, res) {
//     try {
//         let room_id = req.params.room_id
//         if (room_id == null) {
//             res.sendStatus(400)
//         }
//         await Message.deleteOne(
//             {room_id: room_id}, {
//                 skip: 0, // Starting Row
//                 sort: {
//                     sentTime: 1 //Sort ASC
//                 }
//             })
//         res.sendStatus(204)
//     } catch (error) {
//         res.sendStatus(500)
//         return console.error(error)
//     } finally {
//         console.log(`a room deleted`)
//     }
// })

router.post('/', function (req, res) {
    // console.log(req.body)
    // req.io.emit('board', req.body)
    console.log("game is called")
    console.log(req.io.socket.rooms)
})

module.exports = router;