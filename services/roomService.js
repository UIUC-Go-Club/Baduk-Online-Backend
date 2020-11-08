const {Room} = require('../models/schema')
const createBoard = require('../models/board')

let boards_dict = {}

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

            if (room.players.length >= 2) {
                console.log("join failed because there are already 2 players")
                socket.emit('debug', `join failed because there are already 2 players`)
                return
            } else {
                room.players.push({
                    username: data.username,
                    color: undefined,
                    initial_time: initial_time,
                    countdown: countdown,
                    time_out_chance: time_out_chance
                })
                await room.save()
            }

            await socket.join(data.room_id)
            // io.emit('message', {name: 'new user', message: `${data.username} join the room`})
            io.to(data.room_id).emit('message', {name: 'new user', message: `${data.username} join the room`})

            if (room.players.length === 2) {
                let first_color = ~~(Math.random() * 2) === 0 ? 'white' : 'black'
                let second_color = first_color === 'white' ? 'black' : 'white'
                room.players[0].color = first_color
                room.players[1].color = second_color
                room.currentTurn = first_color === 'black' ? 0 : 1
                await room.save()
                io.in(room.room_id).emit('game start', room)
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
        let newBoard = boards_dict[room_id].makeMove(sign, vertex)
        boards_dict[room_id] = newBoard
        io.in(room_id).emit('move', newBoard)
    })

    // socket.on("disconnect", () => {
    //     const user = removeUser(socket.id);
    //     console.log(user);
    //     if (user) {
    //         console.log(user.username + ' has left');
    //     }
    //     console.log("disconnected");
    // });
};