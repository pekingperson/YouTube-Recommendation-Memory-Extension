import { describe, expect, it } from 'vitest';
import manifest from '../../public/manifest.json';

describe('extension toolbar availability', () => {
  it('keeps the popup enabled on every browser tab', () => {
    expect(manifest.action.default_popup).toBe('popup.html');
    expect(manifest.action.default_state).toBe('enabled');
  });

  it('does not require broad tab-reading permission to open history links', () => {
    expect(manifest.permissions).not.toContain('tabs');
  });
});
