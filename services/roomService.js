const {Room} = require('../models/schema')
const createBoard = require('../models/board')

let boards_dict = {}

function reverseTurn(number){
    if(number === 0){
        return 1
    }else{
        return 0
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
                })
            }

            // when the same user join again
            for (let player of room.players){
                if(player.username === data.username){
                    socket.emit('info', {description:'username', username:data.username})
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
                time_out_chance: time_out_chance
            })
            await room.save()

            socket.join(data.room_id)
            socket.emit('info', {description:'username', username:data.username})
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
        let room = await Room.findOne({room_id: data.room_id})
        room.currentTurn = reverseTurn(room.currentTurn)
        room.save()
        let sign = data.sign
        let vertex = data.vertex
        let newBoard = boards_dict[room_id].makeMove(sign, vertex)
        boards_dict[room_id] = newBoard
        io.in(room_id).emit('move', JSON.stringify(newBoard.signMap))
    })

    socket.on("resign", async (data) => {
        let room = await Room.findOne({room_id: data.room_id})
        room.winner = data.username === room.players[0].username ? 1 : 0
        room.gameFinished = true
        room.save()
        io.sockets.in(data.room_id).emit('game ended', room)
    })

    socket.on("disconnect", () => {
        socket.disconnect(0);
        console.log("disconnected");
    });
};