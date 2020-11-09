const {fromDimensions} = require('@sabaki/go-board')
const {GameTree} = require('@sabaki/immutable-gametree')
const {
    stringifyVertex,
    parseVertex,
    parseCompressedVertices
} = require('@sabaki/sgf')

let boardCache = {}

/**
 * sabaki get board from sgf tree method
 * @param tree
 * @param id
 * @returns {null}
 */
function getBoard(tree, id) {
    let treePositions = []
    let board = null

    for (let node of tree.listNodesVertically(id, -1, {})) {
        if (boardCache[node.id] != null && node.id !== id) {
            board = boardCache[node.id]
            break
        }

        treePositions.unshift(node.id)
    }

    if (!board) {
        let size = [19, 19]

        if (tree.root.data.SZ != null) {
            let value = tree.root.data.SZ[0]

            if (value.includes(':')) size = value.split(':')
            else size = [value, value]

            size = size.map(x => (isNaN(x) ? 19 : +x))
        }

        board = fromDimensions(...size)
    }

    let inner = (tree, id, baseboard) => {
        let node = tree.get(id)
        let parent = tree.get(node.parentId)
        if (node == null) return null

        let vertex = null
        let board = null

        // Make move

        let propData = {B: 1, W: -1}

        for (let prop in propData) {
            if (node.data[prop] == null) continue

            vertex = parseVertex(node.data[prop][0])
            board = baseboard.makeMove(propData[prop], vertex)
            board.currentVertex = vertex

            break
        }

        if (!board) board = baseboard.clone()

        // Add markup

        propData = {AW: -1, AE: 0, AB: 1}

        for (let prop in propData) {
            if (node.data[prop] == null) continue

            for (let value of node.data[prop]) {
                for (let vertex of parseCompressedVertices(value)) {
                    if (!board.has(vertex)) continue
                    board.set(vertex, propData[prop])
                }
            }
        }

        Object.assign(board, {
            markers: board.signMap.map(row => row.map(_ => null)),
            lines: [],
            childrenInfo: [],
            siblingsInfo: []
        })

        if (vertex != null && board.has(vertex)) {
            let [x, y] = vertex
            board.markers[y][x] = {type: 'point'}
        }

        propData = {CR: 'circle', MA: 'cross', SQ: 'square', TR: 'triangle'}

        for (let prop in propData) {
            if (node.data[prop] == null) continue

            for (let value of node.data[prop]) {
                for (let [x, y] of parseCompressedVertices(value)) {
                    if (board.markers[y] == null) continue
                    board.markers[y][x] = {type: propData[prop]}
                }
            }
        }

        if (node.data.LB != null) {
            for (let composed of node.data.LB) {
                let sep = composed.indexOf(':')
                let point = composed.slice(0, sep)
                let label = composed.slice(sep + 1)
                let [x, y] = parseVertex(point)

                if (board.markers[y] == null) continue
                board.markers[y][x] = {type: 'label', label}
            }
        }

        if (node.data.L != null) {
            for (let i = 0; i < node.data.L.length; i++) {
                let point = node.data.L[i]
                let label = alpha[i]
                if (label == null) return
                let [x, y] = parseVertex(point)

                if (board.markers[y] == null) continue
                board.markers[y][x] = {type: 'label', label}
            }
        }

        for (let type of ['AR', 'LN']) {
            if (node.data[type] == null) continue

            for (let composed of node.data[type]) {
                let sep = composed.indexOf(':')
                let [v1, v2] = [composed.slice(0, sep), composed.slice(sep + 1)].map(
                    parseVertex
                )

                board.lines.push({v1, v2, type: type === 'AR' ? 'arrow' : 'line'})
            }
        }

        // Add variation overlays

        let addInfo = (node, list) => {
            let v, sign

            if (node.data.B != null) {
                v = parseVertex(node.data.B[0])
                sign = 1
            } else if (node.data.W != null) {
                v = parseVertex(node.data.W[0])
                sign = -1
            } else {
                return
            }

            if (!board.has(v)) return

            let type = null

            if (node.data.BM != null) {
                type = 'bad'
            } else if (node.data.DO != null) {
                type = 'doubtful'
            } else if (node.data.IT != null) {
                type = 'interesting'
            } else if (node.data.TE != null) {
                type = 'good'
            }

            list[v] = {sign, type}
        }

        for (let child of node.children) {
            addInfo(child, board.childrenInfo)
        }

        if (parent != null) {
            for (let sibling of parent.children) {
                addInfo(sibling, board.siblingsInfo)
            }
        }

        boardCache[id] = board
        return board
    }

    for (let id of treePositions) {
        board = inner(tree, id, board)
    }

    return board
}

function clearBoardCache() {
    boardCache = {}
}

module.exports = {getBoard, clearBoardCache}