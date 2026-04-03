export const TIERS = ["S", "A", "B", "C", "D"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_POINTS: Record<Tier, number> = {
  S: 1,
  A: 2,
  B: 3,
  C: 4,
  D: 5,
};

const POINT_TO_TIER: Record<number, Tier> = {
  1: "S",
  2: "A",
  3: "B",
  4: "C",
  5: "D",
};

export function tierFromAveragePoints(avg: number): Tier {
  const clamped = Math.min(5, Math.max(1, Math.round(avg)));
  return POINT_TO_TIER[clamped];
}

export type PoolUser = {
  id: string;
  name: string;
  picture: string;
};

export function groupByTier(
  users: PoolUser[],
  tierForUser: (userId: string) => Tier | null,
): Record<Tier, PoolUser[]> {
  const empty: Record<Tier, PoolUser[]> = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
  };
  for (const u of users) {
    const t = tierForUser(u.id);
    if (t) empty[t].push(u);
  }
  return empty;
}

export function averagePointsForUser(
  userId: string,
  rankingsByDate: Record<string, Partial<Record<string, Tier>>>,
): number | null {
  let sum = 0;
  let n = 0;
  for (const date of Object.keys(rankingsByDate)) {
    const tier = rankingsByDate[date][userId];
    if (tier) {
      sum += TIER_POINTS[tier];
      n += 1;
    }
  }
  if (n === 0) return null;
  return sum / n;
}
