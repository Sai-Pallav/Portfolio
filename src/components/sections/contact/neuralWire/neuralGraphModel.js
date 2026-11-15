/**
 * @file neuralGraphModel.js
 * Canonical Graph Data Model for the 3D Neural Wire Network.
 *
 * Maintains a coherent, topological graph representation containing:
 * - Unique, stable node IDs
 * - Exact 3D node positions
 * - Unique edge IDs and endpoint node references
 * - Primary filament paths and dense spline segments
 * - Dendritic branch paths and tangent-aligned junction anchors
 * - Secondary cross-connection struts (triangles and polygons)
 * - Depth layers (foreground, midground, background)
 * - Node hierarchy (Tier 1: Hero, Tier 2: Intersection, Tier 3: Minor, Tier 4: Micro Synaptic Particle)
 * - Synchronized buffer attributes for Phase 2 GPU deformation
 */

/**
 * 2D Counter-Clockwise test for line-segment orientation.
 */
function ccw(p1, p2, p3) {
  return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x)
}

/**
 * Checks if two 2D line segments (p1-p2 and p3-p4) intersect in the XY projection.
 * Returns false if they share an endpoint (shared junction).
 */
export function segmentsIntersect2D(p1, p2, p3, p4) {
  // If they share an endpoint, they meet at a shared junction — not an illegal crossing
  const eps = 1e-4
  if (
    (Math.abs(p1.x - p3.x) < eps && Math.abs(p1.y - p3.y) < eps) ||
    (Math.abs(p1.x - p4.x) < eps && Math.abs(p1.y - p4.y) < eps) ||
    (Math.abs(p2.x - p3.x) < eps && Math.abs(p2.y - p3.y) < eps) ||
    (Math.abs(p2.x - p4.x) < eps && Math.abs(p2.y - p4.y) < eps)
  ) {
    return false
  }

  const o1 = ccw(p1, p3, p4) !== ccw(p2, p3, p4)
  const o2 = ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  return o1 && o2
}

/**
 * Represents a single canonical vertex in the 3D neural network.
 */
export class GraphNode {
  constructor({
    id,
    position,
    u,
    wireId,
    weight,
    tier = 'minor',
    depthLayer = 'mid',
    meta = {},
  }) {
    this.id = id
    this.position = position.clone()
    this.u = u
    this.wireId = wireId
    this.weight = weight
    this.tier = tier // 'hero' | 'intersection' | 'minor' | 'particle'
    this.depthLayer = depthLayer // 'fg' | 'mid' | 'bg'
    this.connectedEdgeIds = []
    this.degree = 0
    this.meta = meta
  }
}

/**
 * Represents an edge connecting two canonical graph vertices.
 */
export class GraphEdge {
  constructor({
    id,
    sourceNodeId,
    targetNodeId,
    type = 'secondary',
    wireId = -1,
    depthLayer = 'mid',
    length = 0,
  }) {
    this.id = id
    this.sourceNodeId = sourceNodeId
    this.targetNodeId = targetNodeId
    this.type = type // 'primary' | 'branch' | 'secondary'
    this.wireId = wireId
    this.depthLayer = depthLayer // 'fg' | 'mid' | 'bg'
    this.length = length
  }
}

/**
 * Canonical 3D Neural Wire Graph representation for one side ('left' or 'right').
 */
export class NeuralWireGraph {
  constructor(side) {
    this.side = side // 'left' | 'right'
    this.nodes = new Map()
    this.edges = new Map()
    this.edgeLookup = new Set() // 'idA__idB'

    this.primaryFilamentPaths = []
    this.branchPaths = []
  }

  /**
   * Adds or registers a node in the canonical graph.
   * @param {GraphNode} node
   */
  addNode(node) {
    this.nodes.set(node.id, node)
    return node
  }

  /**
   * Retrieves a node by its unique ID.
   * @param {string} id
   * @returns {GraphNode | undefined}
   */
  getNode(id) {
    return this.nodes.get(id)
  }

  /**
   * Checks if an undirected edge already exists between two node IDs.
   * @param {string} idA
   * @param {string} idB
   * @returns {boolean}
   */
  hasEdgeBetween(idA, idB) {
    return this.edgeLookup.has(`${idA}__${idB}`) || this.edgeLookup.has(`${idB}__${idA}`)
  }

  /**
   * Adds an edge connecting two existing graph nodes.
   * Strictly enforces that both endpoints exist and share the node position.
   *
   * @param {string} sourceNodeId
   * @param {string} targetNodeId
   * @param {'primary' | 'branch' | 'secondary'} type
   * @param {number} wireId
   * @returns {GraphEdge | null}
   */
  addEdge(sourceNodeId, targetNodeId, type = 'secondary', wireId = -1) {
    if (sourceNodeId === targetNodeId) return null
    if (this.hasEdgeBetween(sourceNodeId, targetNodeId)) return null

    const nodeA = this.nodes.get(sourceNodeId)
    const nodeB = this.nodes.get(targetNodeId)
    if (!nodeA || !nodeB) return null

    const length = nodeA.position.distanceTo(nodeB.position)
    const avgZ = (nodeA.position.z + nodeB.position.z) * 0.5
    const depthLayer = avgZ >= 0.25 ? 'fg' : avgZ <= -0.25 ? 'bg' : 'mid'

    const edgeId = `${this.side}_e_${sourceNodeId}_${targetNodeId}`
    const edge = new GraphEdge({
      id: edgeId,
      sourceNodeId,
      targetNodeId,
      type,
      wireId,
      depthLayer,
      length,
    })

    this.edges.set(edgeId, edge)
    this.edgeLookup.add(`${sourceNodeId}__${targetNodeId}`)

    nodeA.connectedEdgeIds.push(edgeId)
    nodeA.degree++
    nodeB.connectedEdgeIds.push(edgeId)
    nodeB.degree++

    return edge
  }

  /**
   * Checks whether candidate edge (nodeA -> nodeB) visually crosses any existing secondary edge
   * within the same depth layer in the 2D projected view.
   *
   * @param {GraphNode} nodeA
   * @param {GraphNode} nodeB
   * @param {number} zThreshold - Maximum Z difference to consider as "same depth layer"
   * @returns {boolean}
   */
  edgeCrossesExisting(nodeA, nodeB, zThreshold = 0.32) {
    const avgZ = (nodeA.position.z + nodeB.position.z) * 0.5

    for (const edge of this.edges.values()) {
      // Primary and branch splines define the skeletal flow; check against secondary struts
      if (edge.type !== 'secondary') continue

      const otherA = this.nodes.get(edge.sourceNodeId)
      const otherB = this.nodes.get(edge.targetNodeId)
      if (!otherA || !otherB) continue

      // Ignore if they share a vertex
      if (
        nodeA.id === otherA.id ||
        nodeA.id === otherB.id ||
        nodeB.id === otherA.id ||
        nodeB.id === otherB.id
      ) {
        continue
      }

      const otherAvgZ = (otherA.position.z + otherB.position.z) * 0.5
      if (Math.abs(avgZ - otherAvgZ) < zThreshold) {
        if (segmentsIntersect2D(nodeA.position, nodeB.position, otherA.position, otherB.position)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Exports a canonical, JSON-serializable snapshot of the graph model.
   */
  exportCanonicalModel() {
    const nodes = []
    this.nodes.forEach((n) => {
      nodes.push({
        id: n.id,
        x: Number(n.position.x.toFixed(4)),
        y: Number(n.position.y.toFixed(4)),
        z: Number(n.position.z.toFixed(4)),
        u: Number(n.u.toFixed(4)),
        wireId: n.wireId,
        weight: Number(n.weight.toFixed(4)),
        tier: n.tier,
        depthLayer: n.depthLayer,
        degree: n.degree,
      })
    })

    const edges = []
    this.edges.forEach((e) => {
      edges.push({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        type: e.type,
        wireId: e.wireId,
        depthLayer: e.depthLayer,
        length: Number(e.length.toFixed(4)),
      })
    })

    return {
      side: this.side,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      primaryFilamentCount: this.primaryFilamentPaths.length,
      branchCount: this.branchPaths.length,
      nodes,
      edges,
    }
  }
}
