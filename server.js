const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors');
const app = express()
const {Room, GameRecord, User, Message} = require('./models/schema')
const {createBoard} = require('./models/board')
const {defaultReservedTime, defaultCountdownTime, defaultCountdown, defaultKomi, defaultBoardSize, defaultHandicap} = require('./default')

app.use(cors({origin: '*'}));
const http = require('http').Server(app)
app.use('/static', express.static('public'))
app.set('view engine', 'jade');

app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

const session = require('express-session');
const cookieParser = require('cookie-parser');


const io = require('socket.io')(http)
// io.origins('*:*')
const mongoose = require('mongoose')
mongoose.Promise = Promise

const config = require('./env')
const jwt = require("jsonwebtoken");


io.on('connection', (socket) => {
    console.log('a user connected')
    require('./services/chatService')(socket, io);
    require('./services/roomService')(socket, io);
    return io
})

mongoose.connect(config.mongoUrl,
    {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true
    }, (err) => {
        console.log('mongo db connection', err)
    })

app.use(function (req, res, next) {
    req.io = io;
    next();
});

const routes = require('./routes'); //导入自定义路由文件，创建模块化路由
app.use('/', routes);

/**
 * init games and rooms that have important field missing
 * @returns {Promise<void>}
 */
async function setInitBoards() {
    let rooms = await Room.find({})
    for (let i = 0; i < rooms.length; i++) {
        if (rooms[i].boardSize == null) {
            rooms[i].boardSize = defaultBoardSize
        }
        if (rooms[i].komi == null) {
            rooms[i].boardSize = defaultKomi
        }
        if (rooms[i].handicap == null) {
            rooms[i].handicap = defaultHandicap
        }
        // if (rooms[i].initBoardSignedMap == null) {
            rooms[i].initBoardSignedMap = JSON.stringify(createBoard({
                boardSize: rooms[i].boardSize,
                handicap: rooms[i].handicap
            }).signMap)
        // }
        let r = await rooms[i].save()
        // console.log(r)
    }

    let games = await GameRecord.find({})
    for (let i = 0; i < games.length; i++) {
        if (games[i].boardSize == null) {
            games[i].boardSize = defaultBoardSize
        }
        if (games[i].komi == null) {
            games[i].boardSize = defaultKomi
        }
        if (games[i].handicap == null) {
            games[i].handicap = defaultHandicap
        }
        // if (games[i].initBoardSignedMap == null) {
            games[i].initBoardSignedMap = JSON.stringify(createBoard({
                boardSize: games[i].boardSize,
                handicap: games[i].handicap
            }).signMap)
        // }
        let r = await games[i].save()
        // console.log(r)
    }
}

const server = http.listen(7777, async () => {
    await setInitBoards()
    console.log('server is listening on port', server.address().port)
})
