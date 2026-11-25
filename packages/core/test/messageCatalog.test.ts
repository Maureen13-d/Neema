import { describe, expect, it } from 'vitest';
import {
  applyMessageReview,
  getMessageCatalog,
  isCatalogFullyReviewed,
  pendingMessageKeys,
} from '../src/messages/catalog.js';

describe('message catalog review', () => {
  it('ships as draft until reviewed', () => {
    const catalog = getMessageCatalog();
    expect(catalog.length).toBeGreaterThan(0);
    expect(isCatalogFullyReviewed(catalog)).toBe(false);
    expect(pendingMessageKeys(catalog).length).toBe(catalog.length);
  });

  it('tracks per-key native speaker review', () => {
    let catalog = getMessageCatalog();
    for (const entry of catalog) {
      catalog = applyMessageReview(catalog, entry.key, {
        status: 'reviewed',
        reviewerName: 'Amina (native sw)',
        reviewedOn: '2026-11-26',
      });
    }
    expect(isCatalogFullyReviewed(catalog)).toBe(true);
    expect(pendingMessageKeys(catalog)).toEqual([]);
  });
});
