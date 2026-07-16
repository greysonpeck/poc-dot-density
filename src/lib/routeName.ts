const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generates a route-code-style display name like "1525_A": a random 4-digit number plus a
 * letter suffix derived from the route's position in the current generation batch (A, B, C, ...),
 * so multiple routes generated together always get distinct, realistic-looking labels.
 */
export function generateRouteName(index: number): string {
  const number = Math.floor(1000 + Math.random() * 9000);
  const letter = LETTERS[index % LETTERS.length];
  return `${number}_${letter}`;
}
