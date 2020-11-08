const express = require('express');
const router = express.Router();

router.get('/', function (req, res) {
    // console.log(req.body)
    // req.io.emit('board', req.body)
    console.log("game is called")
    console.log(req.io.sockets.rooms)
})

router.post('/', function (req, res) {
    // console.log(req.body)
    // req.io.emit('board', req.body)
    console.log("game is called")
    console.log(req.io.socket.rooms)
})

module.exports = router;