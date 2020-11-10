const {Room} = require('../models/schema')
const createBoard = require('../models/board')
const {calcScoreHeuristic} = require('../utils/helpers')
let boards_dict = {}
let boards_past_dict = {}

function reverseTurn(number) {
    if (number === 0) {
        return 1
    } else {
        return 0
    }
}

function checkConditionOnAll(array, field, expected) {
    for (let i = 0; i < array.length; i++) {
        if (array[i][field] !== expected) {
            return false
        }
    }
    return true
}

function findWinner(room) {
    let winningColor = room.scoreResult.territory > 0 ? 'black' : 'white'
    for (let i = 0; i < room.players.length; i++) {
        if (room.players[i].color === winningColor) {
            return i
        }
    }
}

function last(array) {
    return array[array.length - 1];
}

module.exports = function (socket, io) {
    socket.on("join_room_player", async (data) => {
        try {
            let initial_time = data.initial_time != null ? data.initial_time : 600
            let countdown = data.countdown != null ? data.countdown : 30
            let time_out_chance = data.time_out_chance != null ? data.time_out_chance : 3
            let room = await Room.findOne({room_id: data.room_id})

            if (room == null) {
                room = new Room({
                    room_id: data.room_id,
                    gameFinished: false,
                })
            }

            // when the same user join again
            for (let player of room.players) {
                if (player.username === data.username) {
                    socket.emit('info', {
                        fieldName: 'username',
                        username: data.username,
                        description: 'current username'
                    })
                    socket.join(data.room_id)
                    return
                }
            }

            // forbidden to enter as a player when room is full
            if (room.players.length >= 2) {
                console.log("join failed because there are already 2 players")
                socket.emit('debug', `join failed because there are already 2 players`)
                return
            }

            room.players.push({
                username: data.username,
                color: undefined,
                initial_time: initial_time,
                countdown: countdown,
                time_out_chance: time_out_chance,
                ackGameEnd: false
            })
            await room.save()

            socket.join(data.room_id)
            socket.emit('info', {
                fieldName: 'username',
                username: data.username,
                description: 'current username'
            })
            io.sockets.in(data.room_id).emit('message', {name: 'new user', message: `${data.username} join the room`})

            // start the game when we have enough players
            if (room.players.length === 2) {
                let first_color = ~~(Math.random() * 2) === 0 ? 'white' : 'black'
                let second_color = first_color === 'white' ? 'black' : 'white'
                room.players[0].color = first_color
                room.players[1].color = second_color
                room.currentTurn = first_color === 'black' ? 0 : 1
                let newBoard = createBoard()
                room.currentBoardSignedMap = JSON.stringify(newBoard.signMap)
                await room.save()

                boards_dict[room.room_id] = newBoard
                boards_past_dict[room.room_id] = [boards_dict[room.room_id]]

                io.sockets.in(room.room_id).emit('game start', JSON.stringify(room))
            }
        } catch (error) {
            console.log(error)
        } finally {
        }
    });

    socket.on("move", async (data) => {
        let room_id = data.room_id
        let sign = data.sign
        let vertex = data.vertex

        let room = await Room.findOne({room_id: data.room_id})
        room.currentTurn = reverseTurn(room.currentTurn)
        let newBoard = boards_dict[room_id].makeMove(sign, vertex)
        room.currentBoardSignedMap = JSON.stringify(newBoard.signMap)
        room.save()
        console.log(sign, vertex)

        boards_past_dict[room_id] = boards_dict[room_id]
        boards_dict[room_id] = newBoard
        io.in(room_id).emit('move', JSON.stringify(room))
    })

    socket.on("resign", async (data) => {
        console.log("resign is entered")
        let room = await Room.findOne({room_id: data.room_id})
        room.winner = data.username === room.players[0].username ? 1 : 0
        room.gameFinished = true
        room.save()
        io.sockets.in(data.room_id).emit('game ended', JSON.stringify(room))
    })

    socket.on("calc score", async (data) => {
        console.log("calc score is called")
        let room_id = data.room_id
        let room = await Room.findOne({room_id: data.room_id})
        let scoreResult = await calcScoreHeuristic(boards_dict[room_id].clone())
        room.scoreResult = scoreResult
        room.save()
        console.log(JSON.stringify(scoreResult))
        // io.sockets.in(data.room_id).emit('calc score', JSON.stringify(scoreResult))
        socket.emit('calc score', JSON.stringify(scoreResult))
    })


    socket.on("game end init", async (data) => {
        console.log("game end init is entered")
        if (data.username == null || data.room_id == null) {
            return
        }

        let room = await Room.findOne({room_id: data.room_id})
        for (let i = 0; i < room.players.length; i++) {
            if (room.players[i].username === data.username) {
                room.players[i].ackGameEnd = true
            }
        }
        room.save()
        socket.broadcast.to(data.room_id).emit('game end init', JSON.stringify(room))

        // io.sockets.in(data.room_id).emit('game ended init', JSON.stringify(room))
    })

    socket.on("game end response", async (data) => {
        console.log("game end response is entered")
        if (data.username == null || data.room_id == null || data.answer == null) {
            return
        }
        if (data.answer === true) {
            console.log("response with true")
            let room = await Room.findOne({room_id: data.room_id})
            for (let i = 0; i < room.players.length; i++) {
                if (room.players[i].username === data.username) {
                    room.players[i].ackGameEnd = true
                }
            }
            await room.save()
            if (checkConditionOnAll(room.players, 'ackGameEnd', true)) {
                console.log("game end")
                room.gameFinished = true
                let winner_index = findWinner(room)
                room.winner = winner_index
                await room.save()

                io.sockets.in(data.room_id).emit('game end result', JSON.stringify(room))
            }
        } else {
            console.log("somebody refuse to end")
            let room = await Room.findOne({room_id: data.room_id})
            for (let i = 0; i < room.players.length; i++) {
                if (room.players[i].username === data.username) {
                    room.players[i].ackGameEnd = false
                }
            }
            await room.save()
            io.sockets.in(data.room_id).emit('game end result', JSON.stringify(room))
        }


        // io.sockets.in(data.room_id).emit('game ended init', JSON.stringify(room))
    })

    socket.on("regret init", async (data) => {
        console.log("regret init is entered")
        if (data.username == null || data.room_id == null) {
            return
        }

        let room = await Room.findOne({room_id: data.room_id})
        for (let i = 0; i < room.players.length; i++) {
            if (room.players[i].username === data.username) {
                room.players[i].ackRegret = true
                room.regretInitiator = i
                break
            }
        }
        room.save()
        socket.broadcast.to(data.room_id).emit('regret init', JSON.stringify(room))
    });

    socket.on("regret response", async (data) => {
        let room_id = data.room_id
        console.log("regret response is entered")
        if (data.username == null || data.room_id == null || data.answer == null) {
            return
        }
        if (data.answer === true) {
            console.log("regret response with true")
            let room = await Room.findOne({room_id: data.room_id})
            for (let i = 0; i < room.players.length; i++) {
                if (room.players[i].username === data.username) {
                    room.players[i].ackRegret = true
                }
            }
            await room.save()
            if (checkConditionOnAll(room.players, 'ackRegret', true)) {
                // do regret
                // current user regret, reset 2 moves, else reset 1 move is enough
                let movesToPop = room.regretInitiator === room.currentTurn ? 2 : 1
                while(movesToPop > 0 && boards_past_dict[room_id].length > 1){
                    boards_past_dict[room_id].pop()
                }

                let newBoard = last(boards_past_dict[data.room_id])
                room.currentTurn = room.regretInitiator
                room.currentBoardSignedMap = JSON.stringify(newBoard.signMap)
                room.gameStarted = true
                await room.save()

                boards_dict[room_id] = newBoard
                boards_past_dict[room_id] = boards_dict[room_id]
                io.in(room_id).emit('regret result', JSON.stringify(room))
                // io.sockets.in(data.room_id).emit('regret result', JSON.stringify(room))
            }
        } else {
            console.log("others refuse to regret a move")
            let room = await Room.findOne({room_id: data.room_id})
            for (let i = 0; i < room.players.length; i++) {
                if (room.players[i].username === data.username) {
                    room.players[i].ackRegret = false
                }
            }
            await room.save()
            io.sockets.in(data.room_id).emit('regret result', JSON.stringify(room))
        }

        // io.sockets.in(data.room_id).emit('game ended init', JSON.stringify(room))
    })

    socket.on("disconnect", (data) => {
        console.log("disconnect is entered")
        socket.emit('info', {
            fieldName: 'username',
            username: data.username,
            description: 'current username disconnect'
        })
        socket.disconnect(0);
        console.log("disconnected");
    });
};

