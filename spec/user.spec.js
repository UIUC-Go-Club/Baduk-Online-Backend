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

describe('test patching (update) user information', () => {
    it('update using valid body', async (done) => {
        let gender = 'male'
        let bio = 'sample bio'
        let email = 'new.email@example.com'

        let res = await fetch(`http://localhost:${host}/user/${testUsername}`, {
            method: 'PATCH',
            headers: {
                Authorization: `bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                gender: gender,
                bio: bio,
                email: email,
                wierdField: "it's wierd"
            })
        })
        expect(res.ok).toBe(true)


        res = await fetch(`http://localhost:${host}/user/${testUsername}`, {
            method: 'GET',
            headers: {
                Authorization: `bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })

        expect(res.ok).toBe(true)
        let data = await res.json()
        expect(data.gender).toBe(gender)
        expect(data.bio).toBe(bio)
        expect(data.email).toBe(email)
        console.log(data)
        done()
    })
})