var express = require('express')
var bodyParser = require('body-parser')
var cors = require('cors');
var app = express()
app.use(cors({origin: '*'}));
var http = require('http').Server(app)
app.use('/static', express.static('public'))
app.set('view engine', 'jade');

app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

var session = require('express-session');
var cookieParser = require('cookie-parser');


var io = require('socket.io')(http)
// io.origins('*:*')
var mongoose = require('mongoose')
mongoose.Promise = Promise

const config = require('./env')
const jwt = require("jsonwebtoken");


io.on('connection', (socket) => {
    console.log('a user connected')
    require('./services/chatService')(socket, io);
    require('./services/roomService')(socket, io);
    return io
})

mongoose.connect(config.mongoUrl, { useNewUrlParser: true }, (err) => {
    console.log('mongo db connection', err)
})

app.use(function(req, res, next) {
    req.io = io;
    next();
});

const routes = require('./routes'); //导入自定义路由文件，创建模块化路由
app.use('/', routes);

var server = http.listen(7777, () => {
    console.log('server is listening on port', server.address().port)
})
