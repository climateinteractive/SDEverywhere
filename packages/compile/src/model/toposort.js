// Modified from https://github.com/marcelklehr/toposort version 2.0.2

/**
 * Topological sorting function
 *
 * @param {Array} edges
 * @returns {Array}
 */

export default function (edges) {
  return toposort(uniqueNodes(edges), edges)
}

function toposort(nodes, edges) {
  var cursor = nodes.length,
    sorted = new Array(cursor),
    visited = {},
    i = cursor,
    // Better data structures make algorithm much faster.
    outgoingEdges = makeOutgoingEdges(edges),
    nodesHash = makeNodesHash(nodes)

  // check for unknown nodes
  edges.forEach(function (edge) {
    if (!nodesHash.has(edge[0]) || !nodesHash.has(edge[1])) {
      throw new Error('Unknown node. There is an unknown node in the supplied edges.')
    }
  })

  while (i--) {
    if (!visited[i]) visit(nodes[i], i, new Set())
  }

  return sorted

  function visit(node, i, predecessors) {
    if (predecessors.has(node)) {
      // debugger
      var nodeRep
      try {
        nodeRep = '\n' + node + '\n'
      } catch (_) {
        nodeRep = ''
      }
      var chain = [...predecessors]
      var error = new Error('Found cyclic dependency during toposort:\n' + chain.join(' →\n') + ' →' + nodeRep)
      // Attach the cycle itself (the portion of the dependency chain from the first
      // occurrence of the repeated node) so that callers can analyze it.
      error.cycle = chain.slice(chain.indexOf(node))
      // Also attach all cycle clusters in the graph (the strongly connected components
      // with more than one node, plus any single node that depends on itself) along
      // with the graph edges so that callers can analyze every cycle at once.
      error.cycles = stronglyConnectedComponents(nodes, outgoingEdges).filter(
        scc => scc.length > 1 || (outgoingEdges.get(scc[0]) || new Set()).has(scc[0])
      )
      error.outgoingEdges = outgoingEdges
      throw error
    }

    if (!nodesHash.has(node)) {
      throw new Error(
        'Found unknown node. Make sure to provided all involved nodes. Unknown node: ' + JSON.stringify(node)
      )
    }

    if (visited[i]) return
    visited[i] = true

    var outgoing = outgoingEdges.get(node) || new Set()
    outgoing = Array.from(outgoing)

    if ((i = outgoing.length)) {
      predecessors.add(node)
      do {
        var child = outgoing[--i]
        visit(child, nodesHash.get(child), predecessors)
      } while (i)
      predecessors.delete(node)
    }

    sorted[--cursor] = node
  }
}

/**
 * Find the strongly connected components of the graph using an iterative form of
 * Tarjan's algorithm (iterative to avoid stack overflow on the deep dependency
 * chains found in large models).
 *
 * @param {Array} nodes The nodes in the graph.
 * @param {Map} outgoingEdges A map of each node to the set of nodes that it points to.
 * @returns {Array} An array of strongly connected components, where each component is
 * an array of the nodes that it contains.
 */
function stronglyConnectedComponents(nodes, outgoingEdges) {
  var index = 0
  var nodeIndex = new Map()
  var lowlink = new Map()
  var onStack = new Set()
  var stack = []
  var sccs = []
  for (var start of nodes) {
    if (nodeIndex.has(start)) {
      continue
    }
    var frames = [{ node: start, edges: null, i: 0, child: undefined }]
    while (frames.length > 0) {
      var frame = frames[frames.length - 1]
      var node = frame.node
      if (frame.edges === null) {
        // First visit to this node
        nodeIndex.set(node, index)
        lowlink.set(node, index)
        index++
        stack.push(node)
        onStack.add(node)
        frame.edges = Array.from(outgoingEdges.get(node) || [])
      } else if (frame.child !== undefined) {
        // Returning from a child visit
        lowlink.set(node, Math.min(lowlink.get(node), lowlink.get(frame.child)))
        frame.child = undefined
      }
      var descended = false
      while (frame.i < frame.edges.length) {
        var w = frame.edges[frame.i++]
        if (!nodeIndex.has(w)) {
          frame.child = w
          frames.push({ node: w, edges: null, i: 0, child: undefined })
          descended = true
          break
        } else if (onStack.has(w)) {
          lowlink.set(node, Math.min(lowlink.get(node), nodeIndex.get(w)))
        }
      }
      if (descended) {
        continue
      }
      // All edges have been visited, so the node is complete
      if (lowlink.get(node) === nodeIndex.get(node)) {
        var scc = []
        var member
        do {
          member = stack.pop()
          onStack.delete(member)
          scc.push(member)
        } while (member !== node)
        sccs.push(scc)
      }
      frames.pop()
    }
  }
  return sccs
}

function uniqueNodes(arr) {
  var res = new Set()
  for (var i = 0, len = arr.length; i < len; i++) {
    var edge = arr[i]
    res.add(edge[0])
    res.add(edge[1])
  }
  return Array.from(res)
}

function makeOutgoingEdges(arr) {
  var edges = new Map()
  for (var i = 0, len = arr.length; i < len; i++) {
    var edge = arr[i]
    if (!edges.has(edge[0])) edges.set(edge[0], new Set())
    if (!edges.has(edge[1])) edges.set(edge[1], new Set())
    edges.get(edge[0]).add(edge[1])
  }
  return edges
}

function makeNodesHash(arr) {
  var res = new Map()
  for (var i = 0, len = arr.length; i < len; i++) {
    res.set(arr[i], i)
  }
  return res
}
