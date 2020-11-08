const express = require('express');

const userRouter = require('./user'); // 引入user路由模块
const roomRouter = require('./room');
const chatRouter = require('./chat');
const gameRouter = require('./game');
const router = express.Router(); // 注册路由

router.use('/user', userRouter); // 注入用户路由模块
router.use('/room', roomRouter);
router.use('/chat', chatRouter);
router.use('/game', gameRouter);

module.exports = router;