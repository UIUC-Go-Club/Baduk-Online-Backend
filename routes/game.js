const express = require('express');
const router = express.Router();

router.post('/', function (req, res) {
    console.log(req.body)
    req.io.emit('board', req.body)
})

module.exports = router;