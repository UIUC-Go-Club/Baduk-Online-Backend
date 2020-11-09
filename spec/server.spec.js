var request = require('request')
host = 7777
username = 'abel'
describe('calc', () => {
    it('should multiply 2 and 2', () => {
        expect(2 * 2).toBe(4)
    })
})

describe('post user info', () => {
    it('should return 200 Ok', (done) => {
        request.post({
            url: `http://localhost:${host}/user/${username}`,
            json: true,
            body: {
                "username": "abel",
                "email": "abel@something.com",
                "password": "password",
                "rank": "3D"
            }
        }, (err, res) => {
            expect(res.statusCode).toEqual(201)
            // console.log(res.statusCode)
            done()
        })
    })
})

describe('get user info', () => {
    it('should return 200 Ok', (done) => {
        request.get(`http://localhost:${host}/user/${username}`, (err, res) => {
            expect(res.statusCode).toEqual(200)
            // console.log(res.statusCode)
            done()
        })
    })
    it('should return a list, thats not empty', (done) => {
        request.get(`http://localhost:${host}/user/${username}`, (err, res) => {
            // console.log(res)
            expect(JSON.parse(res.body).username).toEqual(username)
            done()
        })
    })
})

