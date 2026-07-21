export interface ConnectDot {
  x: number;
  y: number;
}

export interface ConnectDotsPattern {
  points: readonly ConnectDot[];
}

const patterns: readonly ConnectDotsPattern[] = [
  { points: [{ x: 0.18, y: 0.72 }, { x: 0.3, y: 0.28 }, { x: 0.56, y: 0.17 }, { x: 0.81, y: 0.34 }, { x: 0.73, y: 0.73 }, { x: 0.43, y: 0.83 }] },
  { points: [{ x: 0.18, y: 0.53 }, { x: 0.34, y: 0.23 }, { x: 0.67, y: 0.2 }, { x: 0.83, y: 0.49 }, { x: 0.67, y: 0.79 }, { x: 0.32, y: 0.75 }] },
  { points: [{ x: 0.19, y: 0.31 }, { x: 0.48, y: 0.18 }, { x: 0.77, y: 0.31 }, { x: 0.67, y: 0.58 }, { x: 0.49, y: 0.82 }, { x: 0.25, y: 0.65 }] },
];

export const generateConnectDotsPattern = (
  random: () => number = Math.random,
): ConnectDotsPattern => {
  const pattern = patterns[Math.floor(random() * patterns.length)]!;
  const mirrorHorizontally = random() >= 0.5;
  const mirrorVertically = random() >= 0.5;

  return {
    points: pattern.points.map((point) => ({
      x: mirrorHorizontally ? 1 - point.x : point.x,
      y: mirrorVertically ? 1 - point.y : point.y,
    })),
  };
};
