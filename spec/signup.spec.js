const request = require('request')
const config = require('../env')
const mongoose = require('mongoose')
const fetch = require('node-fetch');

const {User} = require('../models/schema')
let host = 7777
let testUsername = 'testUser'
let testPassword = 'testPassword'

beforeEach(async () => {
    try {
        await mongoose.connect(config.mongoUrl, {useNewUrlParser: true})
        console.log('Connected to Server successfully!');
    } catch (error) {
        console.log('Unable to connect to the server. Please start the server. Error:', error);
    }
    await User.deleteOne({username: testUsername})
})

describe('test sign up', () => {
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
        })

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
                "password": testPassword,
                "rank": "3D"
            }
        }, (err, res) => {
            expect(res.statusCode).toEqual(201)
            expect(res.body.jwt).toBeDefined()
            done()
        })

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
})

