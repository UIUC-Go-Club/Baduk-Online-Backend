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

describe('get game setting restrictions', () => {
    it('should return our game restrictions', async (done) => {

        res = await fetch(`http://localhost:${host}/game/setting/restriction`, {
            method: 'GET',
            headers: {
                Authorization: `bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })
        expect(res.ok).toBe(true)
        let data = await res.json()
        expect(data.boardSize).toStrictEqual([9, 13, 19])
        expect(data.handicap).toStrictEqual([
            0, 1, 2, 3, 4,
            5, 6, 7, 8, 9
        ])
        expect(data.color).toStrictEqual(['white', 'black'])
        done()
    })
})

describe('get game default setting', () => {
    it('should return our game restrictions', async (done) => {

        res = await fetch(`http://localhost:${host}/game/setting/default`, {
            method: 'GET',
            headers: {
                Authorization: `bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })
        expect(res.ok).toBe(true)
        let data = await res.json()
        console.log(data)
        expect(data).toStrictEqual({
            boardSize: 19,
            handicap: 0,
            komi: 7.5,
            countdown: 3,
            countDownTime: 30,
            reservedTime: 10 * 60,
            randomPlayerColor: true,
        })
        done()
    })
})

describe('get game example game setting', () => {
    it('should give us an example setting', async (done) => {

        res = await fetch(`http://localhost:${host}/game/setting/example`, {
            method: 'GET',
            headers: {
                Authorization: `bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })
        expect(res.ok).toBe(true)
        let data = await res.json()
        console.log(data)
        done()
    })
})