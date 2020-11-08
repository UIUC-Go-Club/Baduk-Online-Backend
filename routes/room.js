/**
 * 描述: 任务路由模块
 */
const express = require('express');
const router = express.Router();
const app = require('../server');
const fs = require('fs')

// debug helper
router.use(function timeLog (req, res, next) {
    console.log('Time: ', Date.now())
    next()
})

// define the home page route
// router.get('/', function (req, res) {
//     // req.io.emit('message',  {
//     //     "name": "game room",
//     //     "message": "拿到了io"
//     // })
//     console.log(req.io.engine.id)
//     res.send('room home page')
// })

// define the room page
router.get('/:roomId', function (req, res) {
    // console.log(__dirname + '/views/room.html')
    // fs.readFile(__dirname + '/views/room.html', 'utf8', (err, text) => {
    //     console.log("what??")
    //     res.send(text);
    // });
    res.render('room');
    // var roomId = req.params.roomId
    // res.send(`welcome to game room: ${roomId}`)
})

module.exports = router;