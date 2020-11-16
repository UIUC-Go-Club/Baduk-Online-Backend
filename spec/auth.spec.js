const request = require('request')
const config = require('../env')
const mongoose = require('mongoose')
const fetch = require('node-fetch');

const {User} = require('../models/schema')
let host = 7777
let testUsername = 'testUser'
let testRoomname = 'roomTest'
let testPassword = 'testPassword'

beforeAll(async () => {
    try {
        await mongoose.connect(config.mongoUrl, {useNewUrlParser: true})
        console.log('Connected to Server successfully!');
    } catch (error) {
        console.log('Unable to connect to the server. Please start the server. Error:', error);
    }
    await User.deleteOne({username: testUsername})
})

describe('group together to run all the test cases sequentially', () => {
    it('sign up test1: form must contains username and password', (done) => {
        // lack of username
        request.post({
            url: `http://localhost:${host}/auth/signup`,
            json: true,
            body: {
                "email": `${testUsername}@something.com`,
                "password": testPassword,
                "rank": "3D"
            }
        }, (err, res) => {
            expect(res.statusCode).toEqual(400)
            // console.log(res.body)
            done()
        });

        // lack of password
        request.post({
            url: `http://localhost:${host}/auth/signup`,
            json: true,
            body: {
                "username": testUsername,
                "email": `${testUsername}@something.com`,
                "rank": "3D"
            }
        }, (err, res) => {
            expect(res.statusCode).toEqual(400)
            // console.log(res.body)
            done()
        })
    })

    it('sign up test2: this should successfully sign up', async (done) => {
        request.post({
            url: `http://localhost:${host}/auth/signup`,
            json: true,
            body: {
                "username": testUsername,
                "email": `${testUsername}@something.com`,
                "password": testPassword,
                "rank": "3D"
            }
        }, (err, res) => {
            expect(res.statusCode).toEqual(201)
            expect(res.body.jwt).toBeDefined()
            done()
        })
    })

    it('sign up test3: sign up with duplicated username is forbidden', async (done) => {
        request.post({
            url: `http://localhost:${host}/auth/signup`,
            json: true,
            body: {
                "username": testUsername,
                "email": `${testUsername}@something.com`,
                "password": "password",
                "rank": "3D"
            }
        }, (err, res) => {
            expect(res.statusCode).toEqual(400)
            // console.log(res.body)
            done()
        })
    })

    it('sign in test1: non-existed user', (done) => {
        request.post({
            url: `http://localhost:${host}/auth/login`,
            json: true,
            body: {
                "username": 'non-existed user gg',
                "email": `${testUsername}@something.com`,
                "password": "password",
                "rank": "3D"
            }
        }, (err, res) => {
            expect(res.statusCode).toEqual(400)
            console.log(res.body)
            done()
        })
    })

    it('sign in test2: wrong password', (done) => {
        request.post({
            url: `http://localhost:${host}/auth/login`,
            json: true,
            body: {
                "username": testUsername,
                "email": `${testUsername}@something.com`,
                "password": "wrong password",
                "rank": "3D"
            }
        }, (err, res) => {
            expect(res.statusCode).toEqual(401)
            done()
        })
    })

    it('sign in test3: this should sign in successfully', (done) => {
        request.post({
            url: `http://localhost:${host}/auth/login`,
            json: true,
            body: {
                "username": testUsername,
                "email": `${testUsername}@something.com`,
                "password": testPassword,
                "rank": "3D"
            }
        }, (err, res) => {
            expect(res.statusCode).toEqual(200)
            expect(res.body.jwt).toBeDefined()
            done()
        })
    })

    it('reset test1: non-existed user', (done) => {
        request.post({
            url: `http://localhost:${host}/auth/reset_password`,
            json: true,
            body: {
                "username": 'non-existed user gg',
                "email": `${testUsername}@something.com`,
                "password": "password",
                "rank": "3D"
            }
        }, (err, res) => {
            expect(res.statusCode).toEqual(400)
        })
        done()
    })

    it('reset test2: sign in with new password', async (done) => {
        // change to new password
        let newPassword = 'new password'
        let res = await fetch(`http://localhost:${host}/auth/reset_password`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "username": testUsername,
                "password": newPassword,
            })
        })
        expect(res.ok).toBe(true)
        let data = await res.json()
        expect(data.jwt).toBeDefined()

        res = await fetch(`http://localhost:${host}/auth/login`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "username": testUsername,
                "password": newPassword,
            })
        })
        expect(res.ok).toBe(true)
        data = await res.json()
        expect(data.jwt).toBeDefined()

        // change it back
        res = await fetch(`http://localhost:${host}/auth/reset_password`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "username": testUsername,
                "password": testPassword,
            })
        })
        expect(res.ok).toBe(true)
        data = await res.json()
        expect(data.jwt).toBeDefined()

        res = await fetch(`http://localhost:${host}/auth/login`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "username": testUsername,
                "password": testPassword,
            })
        })
        expect(res.ok).toBe(true)
        data = await res.json()
        expect(data.jwt).toBeDefined()
        done()
    })

    it('authorization test 1, invalid token', async (done) => {
        let res = await fetch(`http://localhost:${host}/api`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'bad token'
            }
        })
        expect(res.ok).toEqual(false)
        let data = await res.json()
        expect(data.error).toBeDefined()
        done()
    })

    it('authorization test 2, valid token', async (done) => {
        let res = await fetch(`http://localhost:${host}/auth/login`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'bad token'
            },
            body: JSON.stringify({
                "username": testUsername,
                "password": testPassword,
            })
        })
        expect(res.ok).toBe(true)
        let data = await res.json()
        expect(data.jwt).toBeDefined()
        let token = data.jwt

        res = await fetch(`http://localhost:${host}/api`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `bearer ${token}`
            }
        })
        expect(res.ok).toEqual(true)
        done()
    })

})

