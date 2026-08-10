export interface ScoringOption {
  indices: number[];
  points: number;
  description: string;
}

export interface DiceRollResult {
  rolls: number[];
  points: number;
  description: string;
  isBones?: boolean;
}

const DICE_COUNT = 5;
const DICE_SIDES = 6;

export function rollDice(count: number = DICE_COUNT): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * DICE_SIDES) + 1);
  }
  return rolls;
}

function countOccurrences(rolls: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const roll of rolls) {
    counts.set(roll, (counts.get(roll) || 0) + 1);
  }
  return counts;
}

function isStraight(rolls: number[]): boolean {
  const sorted = [...new Set(rolls)].sort((a, b) => a - b);
  return (
    JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5]) ||
    JSON.stringify(sorted) === JSON.stringify([2, 3, 4, 5, 6])
  );
}

export function calculatePoints(rolls: number[]): DiceRollResult {
  const counts = countOccurrences(rolls);

  // Check for 5-of-a-kind "BONES!" instant win
  for (const [, count] of counts) {
    if (count === 5 && rolls.length === 5) {
      return {
        rolls,
        points: 0,
        description: '🎲 BONES! 🎲 Five of a kind - INSTANT WIN!',
        isBones: true
      };
    }
  }

  if (isStraight(rolls)) {
    return {
      rolls,
      points: 1500,
      description: 'Straight (1-5 or 2-6)! 1500 points'
    };
  }

  let totalPoints = 0;
  const scoredDice = new Set<number>();
  const descriptions: string[] = [];

  for (const [num, count] of counts) {
    if (count >= 4) {
      let basePoints = 0;
      if (num === 1) basePoints = 1000;
      else basePoints = num * 100;

      if (count === 4) {
        totalPoints += basePoints * 2;
        descriptions.push(`Four ${num}s: ${basePoints * 2} points`);
      } else if (count === 5) {
        totalPoints += basePoints * 4;
        descriptions.push(`Five ${num}s: ${basePoints * 4} points`);
      } else if (count === 6) {
        totalPoints += basePoints * 8;
        descriptions.push(`Six ${num}s: ${basePoints * 8} points`);
      }
      scoredDice.add(num);
    }
  }

  for (const [num, count] of counts) {
    if (count >= 3 && !scoredDice.has(num)) {
      let basePoints = 0;
      if (num === 1) {
        basePoints = 1000;
      } else {
        basePoints = num * 100;
      }
      totalPoints += basePoints;
      descriptions.push(`Three ${num}s: ${basePoints} points`);
      scoredDice.add(num);
    }
  }

  for (const [num, count] of counts) {
    if (!scoredDice.has(num)) {
      if (num === 1) {
        const points = count * 100;
        totalPoints += points;
        descriptions.push(`${count} One(s): ${points} points`);
      } else if (num === 5) {
        const points = count * 50;
        totalPoints += points;
        descriptions.push(`${count} Five(s): ${points} points`);
      }
    }
  }

  const description = descriptions.length > 0
    ? descriptions.join(' + ')
    : 'No scoring combination';

  return {
    rolls,
    points: totalPoints,
    description
  };
}

export function getScorableIndices(rolls: number[]): number[] {
  const counts = countOccurrences(rolls);
  const scorable: number[] = [];

  rolls.forEach((roll, idx) => {
    if (roll === 1 || roll === 5) {
      scorable.push(idx);
    } else {
      for (const [num, count] of counts) {
        if (roll === num && (count >= 3 || isStraight(rolls))) {
          scorable.push(idx);
          break;
        }
      }
    }
  });

  return [...new Set(scorable)];
}

export function calculateSelectedPoints(rolls: number[], selectedIndices: number[]): number {
  const selectedRolls = selectedIndices.map(i => rolls[i]);
  if (!isValidSelection(selectedRolls)) return 0;
  const result = calculatePoints(selectedRolls);
  return result.points;
}

export function isValidSelection(selectedRolls: number[]): boolean {
  if (selectedRolls.length === 0) return false;
  const counts = countOccurrences(selectedRolls);

  if (isStraight(selectedRolls) && selectedRolls.length === 5) return true;

  for (const [num, count] of counts) {
    const scores = num === 1 || num === 5 || count >= 3;
    if (!scores) return false;
  }
  return true;
}

export function rollAndCalculate(): DiceRollResult {
  const rolls = rollDice();
  return calculatePoints(rolls);
}
