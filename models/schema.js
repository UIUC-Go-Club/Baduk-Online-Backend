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
    past_games: [{
        ref: 'GameRecord',
        type: mongoose.Schema.Types.ObjectId
    }],
    active_games: [{
        ref: 'Room',
        type: mongoose.Schema.Types.ObjectId
    }]
})

const GameRecordSchema = mongoose.Schema({
    room_id: {
        type: String
    },
    players: [{
        username: {
            type: String
        },
        color: { // black or white or undefined
            type: String
        },
        resigned: {
            type: Boolean
        }
    }],
    winner: {
        type: Number
    },
    scoreResult: {
        area: [{type: Number}],
        territory: [{type: Number}],
        areaScore: {type: Number},
        territoryScore: {type: Number},
    },
    gameTree: {
        type: String
    }
}, {collection: 'game_records'})

const RoomSchema = mongoose.Schema({
    room_id: {
        type: String
    },
    currentTurn: {  // index 0 or 1, use room.players[index] to find current player
        type: Number
    },
    winner: {
        type: Number
    },
    gameStarted: {
        type: Boolean
    },
    gameFinished: {
        type: Boolean
    },
    lastMove: {
        sign: {
            type: Number
        },
        vertex: [{type: Number}]
    },
    lastMakeMoveTime: {
        type: Date
    },
    scoreResult: {
        area: [{type: Number}],
        territory: [{type: Number}],
        areaScore: {type: Number},
        territoryScore: {type: Number},
    },
    regretInitiator: {
        type: Number
    },
    players: [{
        userProfile: {
            ref: 'User',
            type: mongoose.Schema.Types.ObjectId
        },
        username: {
            type: String
        },
        color: { // black or white or undefined
            type: String
        },
        active: {
            type:Boolean
        },
        initial_time: {
            type: Number
        },
        countdown: {
            type: Number
        },
        time_out_chance: {
            type: Number
        },
        ackGameEnd: {
            type: Boolean
        },
        ackRegret: {
            type: Boolean
        },
        ackGameStart: {
            type: Boolean
        },
        resigned:{
            type: Boolean
        }
    }],
    bystanders: [{
        ref: 'User',
        type: mongoose.Schema.Types.ObjectId
    }],
    currentBoardSignedMap: {
        type: String
    },
    currentBoardJson: {
        type: String
    },
})

const MessageSchema = mongoose.Schema({
    room_id: {
        type: String
    },
    username: {
        type: String
    },
    message: {
        type: String
    },
    sentTime: {
        type: Date
    }
})

const User = mongoose.model('User', UserSchema)
const GameRecord = mongoose.model('GameRecord', GameRecordSchema)
const Room = mongoose.model('Room', RoomSchema)
const Message = mongoose.model('Message', MessageSchema)
module.exports = {User, GameRecord, Room, Message}