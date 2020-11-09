const influence = require('@sabaki/influence');
const deadstones = require('@sabaki/deadstones')
deadstones.useFetch('./node_modules/@sabaki/deadstones/wasm/deadstones_bg.wasm')

/**
 * calc the score and find the winner
 * @param scoreBoard
 * @param iterations number of iterations use to guess
 * @param komi
 * @param handicap
 * @returns {Promise<void>}
 */
async function calcScoreHeuristic(scoreBoard, {iterations = 100, komi = 7.5, handicap = 0} = {}) {
    try{
        let result = await deadstones
            .guess(scoreBoard.signMap, {
                finished: true,
                iterations
            })
        for (let vertex of result) {
            let sign = scoreBoard.get(vertex)
            if (sign === 0) continue
            scoreBoard.setCaptures(-sign, x => x + 1)
            scoreBoard.set(vertex, 0)
        }
        let areaMap = influence.map(scoreBoard.signMap, {discrete: true})

        let r1 = getScore(scoreBoard, areaMap, {komi: komi, handicap: handicap})
        console.log(r1)
        return r1
    }
    catch (error){
        console.log(error)
    }
}

/**
 * This function helps to count the score and find the winner
 * @param board
 * @param areaMap
 * @param komi
 * @param handicap
 * @returns {{area: number[], captures: *[], territory: number[]}}
 */
function getScore(board, areaMap, {komi = 0, handicap = 0} = {}) {
    let score = {
        area: [0, 0],
        territory: [0, 0],
        captures: [1, -1].map(sign => board.getCaptures(sign))
    }

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let z = areaMap[y][x]
            let index = z > 0 ? 0 : 1

            score.area[index] += Math.abs(Math.sign(z))
            if (board.get([x, y]) === 0)
                score.territory[index] += Math.abs(Math.sign(z))
        }
    }

    score.area = score.area.map(Math.round)
    score.territory = score.territory.map(Math.round)

    score.areaScore = score.area[0] - score.area[1] - komi - handicap
    score.territoryScore =
        score.territory[0] -
        score.territory[1] +
        score.captures[0] -
        score.captures[1] -
        komi

    return score
}

module.exports = {calcScoreHeuristic, getScore}