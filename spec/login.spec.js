const request = require('request')
const config = require('../env')
const mongoose = require('mongoose')
const fetch = require('node-fetch');

const {User} = require('../models/schema')
let host = 7777
let testUsername = 'testUser'
let testPassword = 'testPassword'

describe('test user login', () => {
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
})