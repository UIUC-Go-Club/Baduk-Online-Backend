const mongoose = require('mongoose')
const {defaultReservedTime, defaultCountDownTime, defaultCountDown, defaultKomi, defaultBoardSize, defaultHandicap} = require('../default')

const UserSchema = mongoose.Schema({
    username: {
        type: String, required: true, index: {unique: true}
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
    lastLoginTime: {
        type: Date
    },
    role: {
        type: String,   // admin, or user
        default: 'user'
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
        type: String,
    },
    komi: {
        type: Number,
        default: defaultKomi
    },
    boardSize: {
        type: Number,
        default: defaultBoardSize
    },
    handicap: {
        type: Number,
        default: defaultHandicap
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
        },
        timeout: {
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
    initBoardSignedMap: {
        type: String
    },
    gameTree: {
        type: String
    }
}, {collection: 'game_records'})

const RoomSchema = mongoose.Schema({
    room_id: {
        type: String, required: true
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
    komi: {
        type: Number,
        default: defaultKomi
    },
    boardSize: {
        type: Number,
        default: defaultBoardSize
    },
    handicap: {
        type: Number,
        default: defaultHandicap
    },
    randomPlayerColor: {
        type: Boolean,
        default: true
    },
    reservedTime: {
        type: Number,
        default: defaultReservedTime // mini-seconds
    },
    countDown: {
        type: Number,
        default: defaultCountDown
    },
    countDownTime: {
        type: Number,
        default: defaultCountDownTime, // mini-seconds
    },
    pastMoves: [
        {
            sign: {
                type: Number
            },
            vertex: [{type: Number}]
        }
    ],
    lastMove: {
        sign: {
            type: Number
        },
        vertex: [{type: Number}]
    },
    lastMakeMoveTimeStamp: {
        type: Number
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
            type: Boolean
        },
        reservedTimeLeft: {
            type: Number
        },
        countdownLeft: {
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
        resigned: {
            type: Boolean
        },
        timeout: {
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
    initBoardSignedMap: {
        type: String
    }
})

const MessageSchema = mongoose.Schema({
    room_id: {
        type: String, required: true
    },
    username: {
        type: String, required: true
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