const express = require('express');
const router = express.Router();

router.get('/', async function (req, res) {
    res.json({message: "this is a protected route "})
})

module.exports = router;