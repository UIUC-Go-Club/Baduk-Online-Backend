const {Room} = require('../models/schema')
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
                await room.save()
                io.sockets.in(room.room_id).emit('game start', JSON.stringify(room))
                boards_dict[room.room_id] = createBoard()
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
        room.save()
        console.log(sign, vertex)
        let newBoard = boards_dict[room_id].makeMove(sign, vertex)
        boards_dict[room_id] = newBoard
        io.in(room_id).emit('move', JSON.stringify(newBoard.signMap))
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

