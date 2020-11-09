const mongoose = require('mongoose')
// mongoose.Promise = Promise

// var dbUrl = 'mongodb://localhost:27017/baduk_online'
// const dbUrl = 'mongodb+srv://user:user@cluster0.4o6w5.mongodb.net/messages?retryWrites=true&w=majority'

const UserSchema = mongoose.Schema({
    username: {
        type: String
    },
    email: {
        type: String
    },
    password: {
        type: String
    },
    rank: {
        type: String
    },
    past_games: [{type: String}],
    active_games: [{type: String}]
})

const GameSchema = mongoose.Schema({
    game_id:{
        type: String
    },
    white:{
        type: String
    },
    black:{
        type: String
    },
    winner:{
        type: String
    },
    sgf:{
        type: String
    }
})

const RoomSchema = mongoose.Schema({
    room_id:{
        type: String
    },
    currentTurn:{  // index 0 or 1, use room.players[index] to find current player
        type: Number
    },
    winner: {
        type: Number
    },
    gameFinished:{
        type: Boolean
    },
    scoreResult: {
        area: [{type:Number}],
        territory: [{type:Number}],
        areaScore: {type: Number},
        territoryScore: {type: Number},
    },
    players:[{
        username:{
            type: String
        },
        color:{ // black or white or undefined
            type: String
        },
        initial_time:{
            type: Number
        },
        countdown:{
            type: Number
        },
        time_out_chance:{
            type: Number
        }
    }],
    bystanders:[{
        type: String
    }],
})

const User = mongoose.model('User', UserSchema)
const Game = mongoose.model('Game', GameSchema)
const Room = mongoose.model('Room', RoomSchema)
module.exports = {User, Game, Room}