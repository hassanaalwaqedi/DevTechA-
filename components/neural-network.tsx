"use client";

import { useId } from "react";

const nodes = [
  [10, 50], [22, 20], [22, 80], [39, 38], [39, 65], [55, 22], [55, 50], [55, 78], [73, 35], [73, 64], [89, 50],
];
const links = [[0, 3], [0, 4], [1, 3], [1, 5], [2, 4], [2, 7], [3, 5], [3, 6], [4, 6], [4, 7], [5, 8], [6, 8], [6, 9], [7, 9], [8, 10], [9, 10]];

export function NeuralNetwork() {
  const id = useId().replace(/:/g, "");
  return <div className="neural-network" aria-label="Illustration of an AI inference network" role="img">
    <div className="network-label network-label-top">INFERENCE GRAPH / v.04</div>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`line-${id}`} x1="0" x2="1"><stop stopColor="#36d7e8" stopOpacity=".15"/><stop offset=".52" stopColor="#397bff" stopOpacity=".8"/><stop offset="1" stopColor="#7958f5" stopOpacity=".2"/></linearGradient>
        <filter id={`glow-${id}`}><feGaussianBlur stdDeviation="1.1" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {links.map(([from, to], index) => <line className="network-link" key={`${from}-${to}`} x1={nodes[from][0]} y1={nodes[from][1]} x2={nodes[to][0]} y2={nodes[to][1]} stroke={`url(#line-${id})`} style={{animationDelay: `${index * -0.35}s`}} />)}
      {nodes.map(([x, y], index) => <g key={`${x}-${y}`} className="network-node" style={{animationDelay: `${index * -0.5}s`}} filter={`url(#glow-${id})`}><circle cx={x} cy={y} r={index === 10 ? 3 : 1.65}/><circle className="node-core" cx={x} cy={y} r={index === 10 ? .9 : .45}/></g>)}
    </svg>
    <div className="network-readout"><span><i/> Input signal</span><span>128 ms / stable</span></div>
  </div>;
}
