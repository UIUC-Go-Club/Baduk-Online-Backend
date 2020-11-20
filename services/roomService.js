const {Room, GameRecord, User, Message} = require('../models/schema')
const createBoard = require('../models/board')
const {calcScoreHeuristic} = require('../utils/helpers')
let boards_dict = {}

function reverseTurn(number) {
    if (number === 0) {
        return 1
    } else {
        return 0
    }
}

/**
 * Check check condition of an array
 */
function checkConditionOnAll(array, field, expected) {
    for (let i = 0; i < array.length; i++) {
        if (array[i][field] !== expected) {
            return false
        }
    }
    return true
}

/**
 * set all corresponding field to false
 */
async function resetAckInRoom(room, fieldName) {
    for (let i = 0; i < room.players.length; i++) {
        room.players[i][fieldName] = false
    }
    await room.save()
}

/**
 * set corresponding user field to true
 */
async function setRoomUserAck(room, username, fieldName) {
    for (let i = 0; i < room.players.length; i++) {
        if (room.players[i].username === username) {
            room.players[i][fieldName] = true
        }
    }
    await room.save()
}

/**
 * save board information in database
 */
async function saveBoardInDB(room, newBoard) {
    room.currentBoardSignedMap = JSON.stringify(newBoard.signMap)
    await room.save()
}


function findWinner(room) {
    let winningColor = room.scoreResult.territoryScore > 0 ? 'black' : 'white'
    for (let i = 0; i < room.players.length; i++) {
        if (room.players[i].color === winningColor) {
            return i
        }
    }
}

function timeoutCheck(room, username) {
    let playerIndex = findPlayerIndex(room, username)
    return room.players[i].reservedTimeLeft <= 0 && room.players[i].countdownLeft <= 0
}

function findPlayerIndex(room, username) {
    for (let i = 0; i < room.players.length; i++) {
        if (room.players[i].username === username) {
            return i
        }
    }
    return -1
}

function last(array) {
    return array[array.length - 1];
}

/**
 * Create the board after a list of moves
 * @param pastMoves a list of moves
 * @returns {GoBoard}
 */
function buildBoardFromMoves(pastMoves){
    let newBoard = createBoard()
    for (let move of pastMoves) {
        newBoard = newBoard.makeMove(move.sign, move.vertex)
    }
    return newBoard
}

/**
 * Create a new game record object in database
 * copy useful states from room to game record and save
 * @param room
 * @returns {Promise<void>}
 */
async function saveFinishedGame(room) {
    try {
        let newGameRecord = new GameRecord()
        newGameRecord.room_id = room.room_id
        newGameRecord.winner = room.winner
        newGameRecord.players = []
        for (const player of room.players) {
            newGameRecord.players.push({
                username: player.username,
                color: player.color,
                resigned: player.resigned,
                timeout: player.timeout
            })
        }
        newGameRecord.scoreResult = room.scoreResult
        newGameRecord.gameTree = JSON.stringify(room.pastMoves)
        await newGameRecord.save()
        for (const player of room.players) {
            let user = await User.findOne({username: player.username})
            user.past_games.push(newGameRecord._id)
            user.active_games.pull(room._id)
            user.save()
        }
    } catch (error) {
        console.log(error)
    }
}

async function cleanGameCache(room) {
    room.lastMove = undefined
    room.pastMoves = []
    await room.save()
    delete boards_dict[room.room_id]
}

/**
 * When game has end, send game end message to the room
 * @param room
 * @param io
 * @returns {Promise<void>}
 */
async function sendGameEndMessage(room, io) {
    let gameEndMessage = new Message()
    gameEndMessage.room_id = room.room_id;
    gameEndMessage.sentTime = new Date();
    gameEndMessage.username = 'server'
    gameEndMessage.message = `game has ended, winner is ${room.players[room.winner].username}`
    await gameEndMessage.save()
    io.sockets.in(room.room_id).emit('new message', JSON.stringify(gameEndMessage))
}

/**
 * set player color
 * set gameStarted to true
 * init board
 * add game tree and board to memory board dict
 * @param room
 * @param io
 * @returns {Promise<void>}
 */
async function startAGame(room, io) {
    try {
        let first_color = ~~(Math.random() * 2) === 0 ? 'white' : 'black'
        let second_color = first_color === 'white' ? 'black' : 'white'
        room.players[0].color = first_color
        room.players[1].color = second_color
        room.currentTurn = first_color === 'black' ? 0 : 1

        // set time
        room.players[0].reservedTimeLeft = room.reservedTime
        room.players[0].countdownLeft = room.countdown
        room.players[1].reservedTimeLeft = room.reservedTime
        room.players[1].countdownLeft = room.countdown

        boards_dict[room.room_id] = createBoard()

        room.currentBoardSignedMap = JSON.stringify(boards_dict[room.room_id].signMap)
        room.lastMove = undefined
        room.gameStarted = true
        await room.save()

        // save to active game
        await Promise.all(
            room.players.map(async player => {
                await User.updateOne(
                    {username: player.username},
                    {$push: {active_games: room._id}}
                )
            })
        )

        io.sockets.in(room.room_id).emit('game start', JSON.stringify(room))

        let gameStartMessage = new Message()
        gameStartMessage.room_id = room.room_id;
        gameStartMessage.sentTime = new Date();
        gameStartMessage.username = 'server'
        gameStartMessage.message = `new game start, 
        ${room.players[0].username} plays the ${room.players[0].color}, 
        ${room.players[1].username} plays the ${room.players[1].color}`
        await gameStartMessage.save()
        io.sockets.in(room.room_id).emit('new message', JSON.stringify(gameStartMessage))
    } catch (error) {
        console.log(error)
    }
}

async function joinSocketRoom(socket, roomName, username) {
    socket.join(roomName)
    socket.gameRoomName = roomName
    socket.user = await User.findOne({username: username,})
}

async function joinBystander(room, user, io, socket) {
    room.bystanders.push(user._id)
    await room.save()
    await joinSocketRoom(socket, room.room_id, user.username)
    // io.sockets.in(data.room_id).emit('message', {name: 'new user', message: `${data.username} join the room`})
    io.sockets.in(room.room_id).emit("room bystander change",
        JSON.stringify(
            await Room.findOne({room_id: room.room_id})
                .populate('players.userProfile', '_id username rank')
                .populate('bystanders', '_id username rank')
        )
    )
}

async function leaveBystander(room, io, socket) {
    room.bystanders.pull({_id: socket.user._id})
    await room.save()
    io.sockets.in(room.room_id).emit("room bystander change",
        JSON.stringify(
            await Room.findOne({room_id: room.room_id})
                .populate('players.userProfile', '_id username rank')
                .populate('bystanders', '_id username rank')
        )
    )
}

module.exports = function (socket, io) {
    socket.on("join_room_bystander", async (data) => {
        console.log("join room bystander")
        let room = await Room.findOne({room_id: data.room_id})
        if (room == null) {
            socket.emit('debug', `join failed because room does not exist`)
            return
        }

        let user = await User.findOne({username: data.username})
        if (user == null) {
            user = new User({username: data.username})
            await user.save()
        }
        await joinBystander(room, user, io, socket)
    })

    socket.on("join_room_player", async (data) => {
        try {
            let user = await User.findOne({username: data.username})
            if (user == null) {
                user = new User({username: data.username})
                await user.save()
            }
            console.log("join room player", data)

            let reservedTime = data.reservedTime != null ? data.reservedTime : 600
            let countdown = data.countdown != null ? data.countdown : 30
            let countDownTime = data.countDownTime != null ? data.countDownTime : 3
            let room = await Room.findOne({room_id: data.room_id})

            if (room == null) {
                room = new Room({
                    room_id: data.room_id,
                    reservedTime: reservedTime,
                    countdown: countdown,
                    countDownTime: countDownTime,
                    gameFinished: false,
                    gameStarted: false,
                    players: [],
                    bystanders: []
                })
            }

            // when the same user join again
            for (const [i, player] of room.players.entries()) {
                if (player.username === data.username) {
                    room.players[i].active = true
                    await room.save()
                    await joinSocketRoom(socket, data.room_id, data.username)
                    socket.emit('info', {
                        fieldName: 'username',
                        username: data.username,
                        description: 'current username'
                    })
                    socket.emit("room player change",
                        JSON.stringify(await Room.findOne({room_id: data.room_id})
                            .populate('players.userProfile', '_id username rank')
                            .populate('bystanders', '_id username rank')
                        )
                    )
                    return
                }
            }

            // forbidden to enter as a player when room is full
            if (room.players.length >= 2) {
                console.log("join failed because there are already 2 players, will join as bystander")
                socket.emit('debug', `join failed because there are already 2 players, join as bystander instead`)

                await joinBystander(room, user, io, socket)
                return
            }


            await joinSocketRoom(socket, data.room_id, data.username)
            room.players.push({
                userProfile: socket.user._id,
                username: data.username,
                color: undefined,
                ackGameEnd: false,
                active: true,
            })
            await room.save()

            socket.emit('info', {
                fieldName: 'username',
                username: data.username,
                description: 'current username'
            })

            io.sockets.in(data.room_id).emit("room player change",
                JSON.stringify(await Room.findOne({room_id: data.room_id})
                    .populate('players.userProfile', '_id username rank')
                    .populate('bystanders', '_id username rank'))
            )
            // io.sockets.in(data.room_id).emit('message', {name: 'new user', message: `${data.username} join the room`})

            // start the game when we have enough players
            // if (room.players.length === 2) {
            //     await startAGame(room, io)
            // }
        } catch (error) {
            console.log(error)
        } finally {
        }
    });

    socket.on("game start init", async (data) => {
        console.log("game start init is entered")
        try {
            if (data.username == null || data.room_id == null) {
                return
            }

            let room = await Room.findOne({room_id: data.room_id})
            await setRoomUserAck(room, data.username, 'ackGameStart')
            socket.broadcast.to(data.room_id).emit('game start init', JSON.stringify(room))
        } catch (error) {
            console.log(error)
        } finally {
        }
    })

    socket.on("game start response", async (data) => {
        console.log("game start response is entered")
        if (data.username == null || data.room_id == null || data.answer == null) {
            return
        }
        let room = await Room.findOne({room_id: data.room_id})

        if (data.answer === true) {
            console.log("response with true")
            await setRoomUserAck(room, data.username, 'ackGameStart')
            if (checkConditionOnAll(room.players, 'ackGameStart', true)) {
                console.log("game start")
                await startAGame(room, io)
            }
        } else {
            console.log("somebody refuse to start")
            await resetAckInRoom(room, 'ackGameStart')
        }
        io.sockets.in(data.room_id).emit('game start result', JSON.stringify(room))
    })

    socket.on("move", async (data) => { // vertex will be an [-1, -1] if it's a pass
        let room_id = data.room_id
        let sign = data.sign
        let vertex = data.vertex
        let room = await Room.findOne({room_id: data.room_id})

        if(sign == room.lastMove.sign){
            socket.emit('debug', `last two moves are from the same person, forbidden`)
            return
        }

        let lastPlayer = room.players[room.currentTurn]
        lastPlayer.reservedTimeLeft = data.reservedTimeLeft
        lastPlayer.countdownLeft = data.countdownLeft
        room.currentTurn = reverseTurn(room.currentTurn)


        if (boards_dict[room_id] == null) { // if our current board is gone, restore the current board using past moves
            boards_dict[room_id] = buildBoardFromMoves(room.pastMoves)
        }

        let newMove = {sign: sign, vertex: vertex}
        boards_dict[room_id] = boards_dict[room_id].makeMove(sign, vertex)

        room.lastMove = newMove
        room.pastMoves.push(newMove)

        await saveBoardInDB(room, boards_dict[room_id])

        io.in(room_id).emit('move', JSON.stringify(room))
    })

    socket.on("resign", async (data) => {
        console.log("resign is entered")
        let room = await Room.findOne({room_id: data.room_id})
        room.winner = data.username === room.players[0].username ? 1 : 0
        let loser = room.winner === 0 ? 1 : 0
        room.players[loser].resigned = true
        room.gameFinished = true
        room.gameStarted = false
        await saveFinishedGame(room)
        await cleanGameCache(room)
        io.sockets.in(data.room_id).emit('game ended', JSON.stringify(room))
        await sendGameEndMessage(room, io)
    })

    socket.on("timeout", async (data) => {
        console.log("time out is entered")
        let room = await Room.findOne({room_id: data.room_id})
        if (!timeoutCheck(room, data.username)) { // 防止虚假timeout
            socket.emit('debug', `This player still have reservedTimeLest or countDownLeft, should not timeout, check again`)
            return
        }
        room.winner = data.username === room.players[0].username ? 1 : 0
        let loser = room.winner === 0 ? 1 : 0
        room.players[loser].timeout = true
        room.gameFinished = true
        room.gameStarted = false
        await saveFinishedGame(room)
        await cleanGameCache(room)
        io.sockets.in(data.room_id).emit('game ended', JSON.stringify(room))
        await sendGameEndMessage(room, io)
    })

    socket.on("calc score", async (data) => {
        try {
            console.log("calc score is called")
            let room = await Room.findOne({room_id: data.room_id})
            let scoreResult = await calcScoreHeuristic(boards_dict[data.room_id])
            if (scoreResult == null) {
                throw 'invalid score result'
            }
            room.scoreResult = scoreResult
            room.save()
            console.log(JSON.stringify(scoreResult))
            // io.sockets.in(data.room_id).emit('calc score', JSON.stringify(scoreResult))
            socket.emit('calc score', JSON.stringify(scoreResult))
        } catch (error) {
            console.log(error)
        }
    })


    socket.on("game end init", async (data) => {
        console.log("game end init is entered")
        if (data.username == null || data.room_id == null) {
            return
        }

        let room = await Room.findOne({room_id: data.room_id})
        await setRoomUserAck(room, data.username, "ackGameEnd")
        socket.broadcast.to(data.room_id).emit('game end init', JSON.stringify(room))
    })

    socket.on("game end response", async (data) => {
        console.log("game end response is entered")
        if (data.username == null || data.room_id == null || data.answer == null) {
            return
        }
        if (data.answer === true) {
            console.log("response with true")
            let room = await Room.findOne({room_id: data.room_id})
            if (!room.gameStarted) {
                console.log("error, game has not start, why would we enter here?")
                return
            }

            await setRoomUserAck(room, data.username, "ackGameEnd")
            if (checkConditionOnAll(room.players, 'ackGameEnd', true)) {
                console.log("game end")
                room.gameFinished = true
                room.gameStarted = false
                let winner_index = findWinner(room)
                room.winner = winner_index
                console.log(winner_index)
                await room.save()
                await saveFinishedGame(room)
                await cleanGameCache(room)
                io.sockets.in(data.room_id).emit('game end result', JSON.stringify(room))
                await sendGameEndMessage(room, io)
            }
        } else {
            console.log("somebody refuse to end")
            let room = await Room.findOne({room_id: data.room_id})
            room.gameFinished = false

            await resetAckInRoom(room, "ackGameEnd")
            io.sockets.in(data.room_id).emit('game end result', JSON.stringify(room))
        }
    })

    socket.on("regret init", async (data) => {
        console.log("regret init is entered")
        if (data.username == null || data.room_id == null) {
            return
        }

        let room = await Room.findOne({room_id: data.room_id})
        room.regretInitiator = data.username === room.players[0].username ? 0 : 1
        await setRoomUserAck(room, data.username, "ackRegret")
        socket.broadcast.to(data.room_id).emit('regret init', JSON.stringify(room))
    });

    socket.on("regret response", async (data) => {
        try {
            let room_id = data.room_id
            console.log("regret response is entered")
            if (data.username == null || data.room_id == null || data.answer == null) {
                return
            }
            if (data.answer === true) {
                console.log("regret response with true")
                let room = await Room.findOne({room_id: data.room_id})
                await setRoomUserAck(room, data.username, "ackRegret")

                if (checkConditionOnAll(room.players, 'ackRegret', true)) {
                    // do regret
                    // current user regret, reset 2 moves, else reset 1 move is enough
                    let movesToPop = room.regretInitiator === room.currentTurn ? 2 : 1
                    while (movesToPop > 0 && room.pastMoves.length > 1) {
                        console.log(room.pastMoves.pop())
                        movesToPop -= 1
                    }
                    room.currentTurn = room.regretInitiator
                    room.lastMove = last(room.pastMoves)
                    boards_dict[room_id] = buildBoardFromMoves(room.pastMoves)
                    await saveBoardInDB(room, boards_dict[room_id])

                    io.in(room_id).emit('regret result', JSON.stringify(room))
                    await resetAckInRoom(room, "ackRegret")
                }
            } else {
                console.log("others refuse to regret a move")
                let room = await Room.findOne({room_id: data.room_id})
                await resetAckInRoom(room, "ackRegret")
                io.sockets.in(data.room_id).emit('regret result', JSON.stringify(room))
            }
        } catch (error) {
            console.log(error)
        }
    })

    socket.on("disconnect", async (data) => {
        try {
            console.log("disconnect is entered")
            console.log("game room", socket.gameRoomName)
            console.log('user', socket.user, socket.user == null? "nobody" : socket.user.username)
            if (socket.user != null) {
                let room = await Room.findOne({room_id: socket.gameRoomName})
                let playerIndex = findPlayerIndex(room, socket.user.username)
                if (playerIndex !== -1) {
                    if (room.gameStarted) {
                        room.players[playerIndex].active = false
                    } else {
                        room.players.pull({_id: room.players[playerIndex]._id})
                    }
                    await room.save()
                    io.sockets.in(data.room_id).emit('player leave', JSON.stringify(room))
                } else {
                    await leaveBystander(room, io, socket)
                }
                socket.disconnect(0);
                if (emptyRoom(room)) {
                    Room.deleteOne({_id: room._id})
                }
                console.log(`${socket.user.username} leaves ${socket.gameRoomName} disconnected`);
            }
        } catch (error) {
            console.log(error)
        }
    });
};

function emptyRoom(room) {
    return room.players.length === 0 && room.bystanders.length === 0
}