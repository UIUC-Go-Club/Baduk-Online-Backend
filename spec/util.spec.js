const sgf = require("@sabaki/sgf");
const GameTree = require("@sabaki/crdt-gametree/src/GameTree");
const {calcScoreHeuristic} = require("../utils/helpers");
const {getBoard} = require("../utils/gametree");

describe('test calc score', () => {
    let getId = (id => () => id++)(0)
    let rootNodes = sgf.parseFile('sgfs/complete.sgf')
    let gameTrees = rootNodes.map(rootNode => {
        return new GameTree({getId, root: rootNode})
    })

    it('this game has 276 moves plus 1 end move', () => {
        expect(gameTrees[0].getHeight()).toBe(277)
    })

    let scoreBoard = getBoard(gameTrees[0], 276).clone()
    it('should tell us white is the winner', async () => {
        let r = await calcScoreHeuristic(scoreBoard)
        expect(r.territoryScore > 0 ? 'black' : 'white').toBe('white')
    })

    it('should give us the following score', async () => {
        let r = await calcScoreHeuristic(scoreBoard)
        expect(JSON.stringify(r)).toBe(JSON.stringify({
                area: [149, 211],
                territory: [56, 89],
                captures: [14, 43],
                areaScore: -69.5,
                territoryScore: -69.5
            })
        )
    })
})