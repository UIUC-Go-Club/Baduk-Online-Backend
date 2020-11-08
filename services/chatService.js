const {joinUser, removeUser} = require('../models/users');

module.exports = function(socket, io) {
    socket.on("join room", (data) => {
        console.log('in room');
        let newUser = joinUser(socket.id, data.username, data.roomName)
        //io.to(Newuser.roomname).emit('send data' , {username : Newuser.username,roomname : Newuser.roomname, id : socket.id})
        // io.to(socket.id).emit('send data' , {id : socket.id ,username:Newuser.username, roomname : Newuser.roomname });
        // socket.emit('send data', {id: socket.id, username: newUser.username, roomName: newUser.roomName});
        console.log(newUser);
        socket.join(newUser.roomName);
    });

    socket.on("disconnect", () => {
        const user = removeUser(socket.id);
        console.log(user);
        if (user) {
            console.log(user.username + ' has left');
        }
        console.log("disconnected");
    });
};