import { describe, expect, it } from 'vitest';
import { CopyService } from './copy.service.js';

describe('nextAccession', () => {
  it('increments the trailing counter', () => {
    expect(CopyService.nextAccession('KNUST-00042', 0)).toBe('KNUST-00042');
    expect(CopyService.nextAccession('KNUST-00042', 1)).toBe('KNUST-00043');
    expect(CopyService.nextAccession('KNUST-00042', 8)).toBe('KNUST-00050');
  });

  // Padding has to survive, or a run stops sorting lexicographically.
  it('preserves zero padding', () => {
    expect(CopyService.nextAccession('B-007', 3)).toBe('B-010');
    expect(CopyService.nextAccession('0001', 9)).toBe('0010');
  });

  it('carries past the padded width rather than truncating', () => {
    expect(CopyService.nextAccession('X-098', 5)).toBe('X-103');
    expect(CopyService.nextAccession('X-999', 1)).toBe('X-1000');
  });

  it('falls back to a suffix when there is no trailing counter', () => {
    expect(CopyService.nextAccession('RARE', 0)).toBe('RARE-1');
    expect(CopyService.nextAccession('RARE', 2)).toBe('RARE-3');
  });

  it('only takes digits at the very end', () => {
    expect(CopyService.nextAccession('2024-SHELF-01', 1)).toBe('2024-SHELF-02');
  });
});
