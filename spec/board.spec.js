const sgf = require("@sabaki/sgf");
const GameTree = require("@sabaki/crdt-gametree/src/GameTree");
const {calcScoreHeuristic} = require("../utils/helpers");
const {getBoard} = require("../utils/gametree");
const {createBoard} = require("../models/board");

describe('create board different size test', () => {
    it('default to create 19 x 19 board', () => {
        let board = createBoard({})
        expect(board.isSquare()).toBe(true)
        expect(board.width).toBe(19)
        expect(board.height).toBe(19)
    })

    it('be able to create 13 x 13 board', () => {
        let board = createBoard({boardSize: 13})
        expect(board.isSquare()).toBe(true)
        expect(board.width).toBe(13)
        expect(board.height).toBe(13)
    })

    it('be able to create 9 x 9 board', () => {
        let board = createBoard({boardSize: 9})
        expect(board.isSquare()).toBe(true)
        expect(board.width).toBe(9)
        expect(board.height).toBe(9)
    })

    it('fail to create 10 X 10 board, should create an 19 X 19 board instead', () => {
        let board = createBoard({boardSize: 10})
        expect(board.isSquare()).toBe(true)
        expect(board.width).toBe(19)
        expect(board.height).toBe(19)
    })
})

function countOne(signmap) {
    let count = 0
    for (let i = 0; i < signmap.length; i++) {
        for (let j = 0; j < signmap[i].length; j++) {
            if (signmap[i][j] == 1) {
                count += 1
            }
        }
    }
    return count
}

describe('create board with preset handicap test', () => {
    it('default to create 19 x 19 board, with customer handicap', () => {
        for (let handicapCount = 1; handicapCount <= 9; handicapCount++) {
            let board = createBoard({handicap: handicapCount})
            expect(board.isSquare()).toBe(true)
            expect(board.width).toBe(19)
            expect(board.height).toBe(19)
            expect(board.isEmpty()).toBe(false)
            expect(countOne(board.signMap)).toBe(handicapCount)
        }
    })

    it('be able to create 13 x 13 board, with customer handicap', () => {
        for (let handicapCount = 1; handicapCount <= 9; handicapCount++) {
            let board = createBoard({boardSize:13, handicap: handicapCount})
            expect(board.isSquare()).toBe(true)
            expect(board.width).toBe(13)
            expect(board.height).toBe(13)
            expect(board.isEmpty()).toBe(false)
            expect(countOne(board.signMap)).toBe(handicapCount)
        }
    })

    it('be able to create 9 x 9 board, with customer handicap', () => {
        for (let handicapCount = 1; handicapCount <= 9; handicapCount++) {
            let board = createBoard({boardSize:9, handicap: handicapCount})
            expect(board.isSquare()).toBe(true)
            expect(board.width).toBe(9)
            expect(board.height).toBe(9)
            expect(board.isEmpty()).toBe(false)
            expect(countOne(board.signMap)).toBe(handicapCount)
        }
    })

    it('forbid to create invalid number of handicap, number allow [0-9], or ' +
        'it should return a valid empty board with given boardSize', () => {
        let handicapCount = -1
        let board = createBoard({boardSize:9, handicap: handicapCount})
        expect(board.isSquare()).toBe(true)
        expect(board.width).toBe(9)
        expect(board.height).toBe(9)
        expect(board.isEmpty()).toBe(true)
        expect(countOne(board.signMap)).toBe(0)
    })
})


it('invalid board size and invalid handicap count', () => {
    let handicapCount = -1
    let board = createBoard({boardSize:18, handicap: handicapCount})
    expect(board.isSquare()).toBe(true)
    expect(board.width).toBe(19)
    expect(board.height).toBe(19)
    expect(board.isEmpty()).toBe(true)
    expect(countOne(board.signMap)).toBe(0)
})