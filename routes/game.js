const express = require('express');
const router = express.Router();
const {GameRecord} = require('../models/schema')
const {calcScoreHeuristic, getAreaMap, getHeuristicDeadStones} = require('../utils/helpers')
const Board = require('@sabaki/go-board')

router.get('/room/:room_id', async function (req, res) {
    let room_id = req.params.room_id
    let gameRecords = await GameRecord.find(
        {room_id: room_id})
    res.send(gameRecords)
})

router.get('/setting/restriction', async function (req, res) {
    res.send(JSON.stringify({
        boardSize: [9, 13, 19],
        handicap: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        color: ['white', 'black']
    }))
})

router.get('/setting/default', async function (req, res) {
    res.send(JSON.stringify({
        boardSize: 19,
        handicap: 0,
        komi: 7.5,
        countdown: 3,
        countDownTime: 30,
        reservedTime: 10 * 60,
        randomPlayerColor: true,
    }))
})

router.get('/setting/example', async function (req, res) {
    res.send(JSON.stringify({
        boardSize: 19,
        handicap: 0,
        komi: 7.5,
        countdown: 3,
        countdownTime: 30,
        reservedTime: 10 * 60,
        randomPlayerColor: false,
        username1: {color: 'white'},
        username2: {color: 'black'}
    }))
})

router.post('/analysis/', async function (req, res) {
    let komi = req.body.komi
    let handicap = req.body.handicap
    let signMap = req.body.signMap
    let scoreBoard = new Board(signMap)
    if (signMap == null) {
        console.log("signMap is null")
        res.status(400).send('bad request, required field missing')
    }

    try {
        console.log("analyze board is called")
        let gameAnalysis = await calcScoreHeuristic(scoreBoard, {komi: komi, discrete: true, gameFinished: false})
        res.send(JSON.stringify(gameAnalysis))
    } catch (error) {
        console.log(error)
        res.status(500).send('internal server error')
    }
})

module.exports = router;