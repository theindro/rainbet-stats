export function analyzeKenoNumbers(rounds, boardSize = 40) {
  if (!rounds.length) {
    return {
      numbers: [],
      totalRounds: 0,
      drawsPerRound: 10,
      boardSize,
      expectedHitsPerNumber: 0,
      hot: [],
      cold: [],
      neverHit: [],
    };
  }

  const board = rounds[0]?.boardNumberCount || boardSize;
  const drawsPerRound = rounds[0]?.results?.length || 10;
  const hits = Array(board + 1).fill(0);

  for (const round of rounds) {
    for (const n of round.results || []) {
      if (n >= 1 && n <= board) hits[n] += 1;
    }
  }

  const totalRounds = rounds.length;
  const expectedHitsPerNumber = totalRounds * (drawsPerRound / board);

  const numbers = Array.from({ length: board }, (_, i) => {
    const number = i + 1;
    const count = hits[number];
    return {
      number,
      hits: count,
      hitRate: totalRounds > 0 ? (count / totalRounds) * 100 : 0,
      expected: expectedHitsPerNumber,
      delta: count - expectedHitsPerNumber,
      neverHit: count === 0,
    };
  });

  const sorted = [...numbers].sort((a, b) => b.hits - a.hits || a.number - b.number);
  const withHits = sorted.filter((n) => n.hits > 0);

  return {
    numbers: sorted,
    totalRounds,
    drawsPerRound,
    boardSize: board,
    expectedHitsPerNumber,
    hot: withHits.slice(0, 5),
    cold: [...withHits].reverse().slice(0, 5),
    neverHit: sorted.filter((n) => n.neverHit),
  };
}

export function analyzeSelectedNumbers(rounds) {
  const pickHits = {};

  for (const round of rounds) {
    const drawn = new Set(round.results || []);
    for (const n of round.selectedNumbers || []) {
      if (!pickHits[n]) pickHits[n] = { picked: 0, matched: 0 };
      pickHits[n].picked += 1;
      if (drawn.has(n)) pickHits[n].matched += 1;
    }
  }

  return Object.entries(pickHits)
    .map(([num, s]) => ({
      number: Number(num),
      picked: s.picked,
      matched: s.matched,
      matchRate: s.picked > 0 ? (s.matched / s.picked) * 100 : 0,
    }))
    .sort((a, b) => b.picked - a.picked);
}
