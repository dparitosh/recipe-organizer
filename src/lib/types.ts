export interface Node {
  id: string
  x: number
  y: number
  label: string
  color: string
}

export interface Edge {
  id: string
  source: string
  target: string
}

export interface GraphData {
  nodes: Node[]
  edges: Edge[]
}

export interface ViewTransform {
  x: number
  y: number
  scale: number
}
