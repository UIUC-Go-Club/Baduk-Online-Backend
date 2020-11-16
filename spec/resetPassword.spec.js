const request = require('request')
const config = require('../env')
const mongoose = require('mongoose')
const fetch = require('node-fetch');

const {User} = require('../models/schema')
let host = 7777
let testUsername = 'testUser'
let testPassword = 'testPassword'

describe('test password reset', () => {

})