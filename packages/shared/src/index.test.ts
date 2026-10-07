import { describe, expect, it } from 'vitest';
import { packageName } from './index.js';

describe('@mathscript/shared', () => {
  it('exports its package name', () => {
    expect(packageName).toBe('@mathscript/shared');
  });
});
