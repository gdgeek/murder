import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('monorepo setup', () => {
  it('should run vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('should run fast-check property tests', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(a + b).toBe(b + a);
      }),
    );
  });
});
