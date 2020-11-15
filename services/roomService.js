const {Room, GameRecord, User} = require('../models/schema')
const createBoard = require('../models/board')
const {calcScoreHeuristic} = require('../utils/helpers')
let boards_dict = {}
let boards_past_dict = {}
let game_tree_dict = {}

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
async function saveBoardInDB(room, lastMove, newBoard) {
    room.lastMove = lastMove
    room.currentBoardSignedMap = JSON.stringify(newBoard.signMap)
    room.currentBoardJson = JSON.stringify(newBoard)
    await room.save()
}

/**
 * save board information in memory
 */
function saveBoardInCache(room_id, lastMove, newBoard) {
    boards_past_dict[room_id].push(newBoard)
    boards_dict[room_id] = newBoard
    game_tree_dict[room_id].push(lastMove)
}


function findWinner(room) {
    let winningColor = room.scoreResult.territory > 0 ? 'black' : 'white'
    for (let i = 0; i < room.players.length; i++) {
        if (room.players[i].color === winningColor) {
            return i
        }
    }
}

function findPlayerIndex(room, username) {
    for (let i = 0; i < room.players; i++) {
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
        newGameRecord.gameTree = JSON.stringify(game_tree_dict[room.room_id])
        await newGameRecord.save()
        for (const player of room.players) {
            let user = await User.findOne({username: player.username})
            user.past_games.push(newGameRecord._id)
            user.active_games.pull(room._id)
            user.save()
        }

        delete game_tree_dict[room.room_id]
        delete boards_past_dict[room.room_id]
        delete boards_dict[room.room_id]
    } catch (error) {
        console.log(error)
    }
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
    let first_color = ~~(Math.random() * 2) === 0 ? 'white' : 'black'
    let second_color = first_color === 'white' ? 'black' : 'white'
    room.players[0].color = first_color
    room.players[1].color = second_color
    room.currentTurn = first_color === 'black' ? 0 : 1
    let newBoard = createBoard()
    room.currentBoardSignedMap = JSON.stringify(newBoard.signMap)
    room.currentBoardJson = JSON.stringify(newBoard)
    room.lastMove = undefined
    room.gameStarted = true
    await room.save()

    // save to active game
    await Promise.all(
        room.players.map(async player => {
            await User.update(
                {username: player.username},
                {$push: {active_games: room._id}}
            )
        })
    )

    boards_dict[room.room_id] = newBoard
    boards_past_dict[room.room_id] = [newBoard]
    game_tree_dict[room.room_id] = []
    io.sockets.in(room.room_id).emit('game start', JSON.stringify(room))
}

async function joinSocketRoom(socket, roomName, username) {
    socket.join(roomName)
    socket.gameRoomName = roomName
    socket.user = await User.findOne({username: username,}, '_id name')
}

module.exports = function (socket, io) {
    socket.on("join_room_bystander", async (data) => {
        let room = await Room.findOne({room_id: data.room_id})
        if (room == null) {
            return
        }
        room.bystanders.push(data.username)
        await room.save()
        await joinSocketRoom(socket, data.room_id, data.username)
        // io.sockets.in(data.room_id).emit('message', {name: 'new user', message: `${data.username} join the room`})
        io.sockets.in(data.room_id).emit("room bystander change",
            JSON.stringify(
                await Room.findOne({room_id: data.room_id})
                    .populate('players.userProfile', '_id username rank')
                    .populate('bystanders', '_id username rank')
            )
        )
    })

    socket.on("join_room_player", async (data) => {
        try {
            let user = await User.findOne({username: data.username})
            if (user == null) {
                user = new User({username: data.username})
                await user.save()
            }

            let initial_time = data.initial_time != null ? data.initial_time : 600
            let countdown = data.countdown != null ? data.countdown : 30
            let time_out_chance = data.time_out_chance != null ? data.time_out_chance : 3
            let room = await Room.findOne({room_id: data.room_id})

            if (room == null) {
                room = new Room({
                    room_id: data.room_id,
                    countdown: countdown,
                    time_out_chance: time_out_chance,
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
                console.log("join failed because there are already 2 players")
                socket.emit('debug', `join failed because there are already 2 players`)
                return
            }


            await joinSocketRoom(socket, data.room_id, data.username)
            room.players.push({
                userProfile: socket.user._id,
                username: data.username,
                color: undefined,
                initial_time: initial_time,
                reservedTimeLeft: initial_time,
                countdownLeft: countdown,
                time_out_chance: time_out_chance,
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
        if (data.answer === true) {
            console.log("response with true")
            let room = await Room.findOne({room_id: data.room_id})
            await setRoomUserAck(room, data.username, 'ackGameStart')
            if (checkConditionOnAll(room.players, 'ackGameStart', true)) {
                console.log("game start")
                await startAGame(room, io)
            }
        } else {
            console.log("somebody refuse to start")
            let room = await Room.findOne({room_id: data.room_id})
            await resetAckInRoom(room, 'ackGameStart')
        }
        io.sockets.in(data.room_id).emit('game start result', JSON.stringify(room))
    })

    socket.on("move", async (data) => {
        let room_id = data.room_id
        let sign = data.sign
        let vertex = data.vertex
        let room = await Room.findOne({room_id: data.room_id})
        let lastPlayer = room.players[room.currentTurn]
        lastPlayer.reservedTimeLeft = data.reservedTimeLeft
        lastPlayer.countdownLeft = data.countdownLeft
        room.currentTurn = reverseTurn(room.currentTurn)
        let newBoard = boards_dict[room_id].makeMove(sign, vertex)
        let newMove = {sign: sign, vertex: vertex}

        await saveBoardInDB(room, newMove, newBoard)
        saveBoardInCache(room.room_id, newMove, newBoard)

        io.in(room_id).emit('move', JSON.stringify(room))
    })

    socket.on("resign", async (data) => {
        console.log("resign is entered")
        let room = await Room.findOne({room_id: data.room_id})
        room.winner = data.username === room.players[0].username ? 1 : 0
        let loser = room.winner === 0 ? 1 : 0
        room.players[loser].resigned = true
        room.gameFinished = true
        await saveFinishedGame(room)
        io.sockets.in(data.room_id).emit('game ended', JSON.stringify(room))
    })

    socket.on("timeout", async (data) => {
        console.log("time out is entered")
        let room = await Room.findOne({room_id: data.room_id})
        room.winner = data.username === room.players[0].username ? 1 : 0
        let loser = room.winner === 0 ? 1 : 0
        room.players[loser].timeout = true
        room.gameFinished = true
        await saveFinishedGame(room)
        io.sockets.in(data.room_id).emit('game ended', JSON.stringify(room))
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
        if (data.username == null || data.room_id == null || data.ackGameEnd == null) {
            return
        }
        if (data.answer === true) {
            console.log("response with true")
            let room = await Room.findOne({room_id: data.room_id})
            await setRoomUserAck(room, data.username, "ackGameEnd")
            if (checkConditionOnAll(room.players, 'ackGameEnd', true)) {
                console.log("game end")
                room.gameFinished = true
                let winner_index = findWinner(room)
                room.winner = winner_index
                await room.save()
                await saveFinishedGame(room)
                io.sockets.in(data.room_id).emit('game end result', JSON.stringify(room))
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
                    while (movesToPop > 0 && boards_past_dict[room_id].length > 1) {
                        boards_past_dict[room_id].pop()
                        game_tree_dict[room_id].pop()
                        movesToPop -= 1
                    }
                    room.currentTurn = room.regretInitiator
                    await saveBoardInDB(room, last(game_tree_dict[room_id]), last(boards_past_dict[room_id]))

                    boards_dict[room_id] = last(boards_past_dict[room_id])

                    io.in(room_id).emit('regret result', JSON.stringify(room))
                    // io.sockets.in(data.room_id).emit('regret result', JSON.stringify(room))
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
        console.log("disconnect is entered")
        console.log("rooms", socket.rooms)
        console.log("game room", socket.gameRoomName)
        if (socket.user != null) {
            let room = await Room.findOne({room_id: socket.gameRoomName})
            let playerIndex = findPlayerIndex(room, socket.user.username)
            if (playerIndex !== -1) {
                room.players[playerIndex].active = false
                io.sockets.in(data.room_id).emit('player leave', JSON.stringify(room))
            } else {
                room.bystanders.pull({_id: socket.user._id})
                await room.save()
                io.sockets.in(data.room_id).emit("room bystander change",
                    JSON.stringify(
                        await Room.findOne({room_id: data.room_id})
                            .populate('players.userProfile', '_id username rank')
                            .populate('bystanders', '_id username rank')
                    )
                )
            }

            socket.disconnect(0);
            console.log(`${socket.user.user} leaves ${socket.gameRoomName} disconnected`);
        }
    });
};

