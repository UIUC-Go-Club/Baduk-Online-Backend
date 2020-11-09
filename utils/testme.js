const {Room} = require('../models/schema')
const createBoard = require('../models/board')
const influence = require('@sabaki/influence');

const sgf = require('@sabaki/sgf')
const GameTree = require('@sabaki/immutable-gametree')
const {getBoard} = require('./gametree')

const deadstones =  require('@sabaki/deadstones')
deadstones.useFetch('./node_modules/@sabaki/deadstones/wasm/deadstones_bg.wasm')


const {calcScoreHeuristic, getScore} = require('./helpers')
async function main (){
    let getId = (id => () => id++)(0)
    let rootNodes = sgf.parseFile('sgfs/complete.sgf')
    console.log(rootNodes)
    let gameTrees = rootNodes.map(rootNode => {
        return new GameTree({getId, root: rootNode})
    })
    //
    //
    console.log(gameTrees[0].getHeight())
    // console.log(gameTrees[0])
    // let scoreBoard = getBoard(gameTrees[0], 276).clone()
    // let r = await calcScoreHeuristic(scoreBoard)
    // console.log(r)
//     deadstones
//         .guess(scoreBoard.signMap, {
//             finished: true,
//             iterations:100
//         }).then(result => {
//
//         for (let vertex of result) {
//             let sign = scoreBoard.get(vertex)
//             if (sign === 0) continue
//
//             scoreBoard.setCaptures(-sign, x => x + 1)
//             scoreBoard.set(vertex, 0)
//         }
//
//         let areaMap = influence.map(scoreBoard.signMap, {discrete: true})
//
//         let black = 0
//         let white = 0
//         for(let row of areaMap){
//             for(let t of row){
//                 if(t === 1){
//                     black += 1
//                 }
//                 if (t === -1){
//                     white += 1
//                 }
//             }
//         }
//
//         // console.log('black',black)
//         // console.log('white',white)
//         // console.log('area', black - white)
//         let r1 = getScore(scoreBoard, areaMap, {komi: 7.5})
//         console.log(r1)
// // //
//         areaMap = influence.areaMap(scoreBoard.signMap)
//         let r2 = getScore(scoreBoard, areaMap)
//         // console.log(r2)
//         console.log("hello")
    // })
}
main()

