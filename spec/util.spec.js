const sgf = require("@sabaki/sgf");
const GameTree = require("@sabaki/crdt-gametree/src/GameTree");
const {calcScoreHeuristic} = require("../utils/helpers");
const {getBoard} = require("../utils/gametree");
const request = require('request')
const config = require('../env')
const mongoose = require('mongoose')
const fetch = require('node-fetch');
const {User} = require('../models/schema')


let host = 7777
let testUsername = 'testUser'
let testPassword = 'testPassword'
let token = null

beforeAll(async () => {
    try {
        await mongoose.connect(config.mongoUrl, {useNewUrlParser: true})
        console.log('Connected to Server successfully!');
    } catch (error) {
        console.log('Unable to connect to the server. Please start the server. Error:', error);
    }
    await User.deleteOne({username: testUsername})

    try {
        let res = await fetch(`http://localhost:${host}/auth/signup`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "username": testUsername,
                "email": `${testUsername}@something.com`,
                "password": testPassword,
                "rank": "3D"
            })
        })
        let data = await res.json()
    } catch (error) {
        console.log(error);
    }

    try {
        let res = await fetch(`http://localhost:${host}/auth/login`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "username": testUsername,
                "password": testPassword,
            })
        })
        expect(res.ok).toBe(true)
        let data = await res.json()
        expect(data.jwt).toBeDefined()
        token = data.jwt
    } catch (error) {
        console.log(error);
    }
})

describe('test calc score', () => {
    let getId = (id => () => id++)(0)
    let rootNodes = sgf.parseFile('sgfs/complete.sgf')
    let gameTrees = rootNodes.map(rootNode => {
        return new GameTree({getId, root: rootNode})
    })

    it('this game has 276 moves plus 1 end move', () => {
        expect(gameTrees[0].getHeight()).toBe(277)
    })

    let scoreBoard = getBoard(gameTrees[0], 276).clone()
    it('should tell us white is the winner', async () => {
        let r = await calcScoreHeuristic(scoreBoard)
        expect(r.territoryScore > 0 ? 'black' : 'white').toBe('white')
    })

    it('should give us the following score', async () => {
        let r = await calcScoreHeuristic(scoreBoard)
        expect(JSON.stringify(r)).toBe(JSON.stringify({
                area: [149, 211],
                territory: [56, 89],
                captures: [14, 43],
                areaScore: -69.5,
                territoryScore: -69.5
            })
        )
    })
})

describe('test if analysis api work', () => {
    it('test interface', async (done) => {
        let getId = (id => () => id++)(0)
        let rootNodes = sgf.parseFile('sgfs/complete.sgf')
        let gameTrees = rootNodes.map(rootNode => {
            return new GameTree({getId, root: rootNode})
        })

        let scoreBoard = getBoard(gameTrees[0], 100).clone()

        let res = await fetch(`http://localhost:${host}/game/analysis`, {
            method: 'POST',
            headers: {
                Authorization: `bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                komi: 7.5,
                signMap: scoreBoard.signMap
            })
        })
        let data = await res.json()
        console.log(data)
        expect(data).toHaveProperty('scoreResult')
        expect(data).toHaveProperty('deadStoneVertices')
        expect(data).toHaveProperty('areaMap')
        done()
    })
})