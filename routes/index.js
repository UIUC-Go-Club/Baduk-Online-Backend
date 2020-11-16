const express = require('express');

const authRouter = require('./auth');
const userRouter = require('./user'); // 引入user路由模块
const roomRouter = require('./room');
const gameRouter = require('./game');
const messageRouter = require('./message')
const router = express.Router(); // 注册路由

router.use('/auth', authRouter);
router.use('/user', userRouter); // 注入用户路由模块
router.use('/room', roomRouter);
router.use('/game', gameRouter);
router.use('/message', messageRouter);
module.exports = router;