var mongoose = require('mongoose')
mongoose.Promise = Promise

// var dbUrl = 'mongodb://localhost:27017/baduk_online'
var dbUrl = 'mongodb+srv://user:user@cluster0.4o6w5.mongodb.net/messages?retryWrites=true&w=majority'

let users = [];

function joinUser(socketId, userName, roomName) {
    const user = {
        socketID: socketId,
        username: userName,
        roomName: roomName
    }
    users.push(user)
    return user;
}


function findUser(socketId) {
    return users.find((user) => user.socketID === socketId)
}

function removeUser(id) {
    const getID = users => users.socketID === id;
    const index = users.findIndex(getID);
    if (index !== -1) {
        return users.splice(index, 1)[0];
    }
}

module.exports = {joinUser, removeUser}