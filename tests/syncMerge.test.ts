/**
 * Tests de la logique de merge de sync (last-write-wins + tombstones). Pure,
 * sans navigateur : c'est la vérification sûre (on ne touche aucun localStorage).
 */
import {describe, expect, it} from 'vitest';
import {mergeCollection, mergeFavorites, type FavState} from '../src/lib/syncMerge';
import type {SyncItem} from '../src/lib/sync';

const item = (itemId: string, updatedAt: string, opts: {data?: unknown; deleted?: boolean} = {}): SyncItem => ({
  kind: 'k',
  itemId,
  updatedAt,
  data: opts.data ?? null,
  deleted: opts.deleted ?? false,
});

interface Doc {
  id: string;
  updatedAt: string;
  v: number;
}
const at = (d: Doc) => d.updatedAt;
const doc = (id: string, updatedAt: string, v: number): Doc => ({id, updatedAt, v});

describe('mergeCollection', () => {
  const fresh = () => ({items: new Map<string, Doc>(), tombs: new Map<string, string>()});

  it('ajoute un entrant absent en local (cas restauration au login)', () => {
    const {items, tombs} = fresh();
    const r = mergeCollection(items, tombs, [item('a', '2026-01-02T00:00:00.000Z', {data: doc('a', '2026-01-02T00:00:00.000Z', 1)})], at);
    expect(r.itemsChanged).toBe(true);
    expect(items.get('a')?.v).toBe(1);
  });

  it('ignore un entrant plus ancien que le local', () => {
    const {items, tombs} = fresh();
    items.set('a', doc('a', '2026-01-05T00:00:00.000Z', 9));
    const r = mergeCollection(items, tombs, [item('a', '2026-01-01T00:00:00.000Z', {data: doc('a', '2026-01-01T00:00:00.000Z', 1)})], at);
    expect(r.itemsChanged).toBe(false);
    expect(items.get('a')?.v).toBe(9);
  });

  it('remplace par un entrant plus récent', () => {
    const {items, tombs} = fresh();
    items.set('a', doc('a', '2026-01-01T00:00:00.000Z', 1));
    mergeCollection(items, tombs, [item('a', '2026-01-05T00:00:00.000Z', {data: doc('a', '2026-01-05T00:00:00.000Z', 5)})], at);
    expect(items.get('a')?.v).toBe(5);
  });

  it('supprime sur tombstone plus récent et pose le tombstone', () => {
    const {items, tombs} = fresh();
    items.set('a', doc('a', '2026-01-01T00:00:00.000Z', 1));
    const r = mergeCollection(items, tombs, [item('a', '2026-01-05T00:00:00.000Z', {deleted: true})], at);
    expect(items.has('a')).toBe(false);
    expect(tombs.get('a')).toBe('2026-01-05T00:00:00.000Z');
    expect(r.tombstonesChanged).toBe(true);
  });

  it('empêche la résurrection (non supprimé plus ancien qu un tombstone)', () => {
    const {items, tombs} = fresh();
    tombs.set('a', '2026-01-05T00:00:00.000Z');
    const r = mergeCollection(items, tombs, [item('a', '2026-01-01T00:00:00.000Z', {data: doc('a', '2026-01-01T00:00:00.000Z', 1)})], at);
    expect(items.has('a')).toBe(false);
    expect(r.itemsChanged).toBe(false);
  });

  it('ré-ajoute si non supprimé plus récent que le tombstone', () => {
    const {items, tombs} = fresh();
    tombs.set('a', '2026-01-01T00:00:00.000Z');
    mergeCollection(items, tombs, [item('a', '2026-01-05T00:00:00.000Z', {data: doc('a', '2026-01-05T00:00:00.000Z', 7)})], at);
    expect(items.get('a')?.v).toBe(7);
    expect(tombs.has('a')).toBe(false);
  });

  // Plancher de tombstone (cf. workoutLogs : borne la croissance du blob de sync).
  it('plancher : ignore une suppression très ancienne déjà absente en local', () => {
    const {items, tombs} = fresh();
    const floor = '2026-01-01T00:00:00.000Z';
    const r = mergeCollection(items, tombs, [item('vieux', '2025-06-01T00:00:00.000Z', {deleted: true})], at, floor);
    expect(tombs.has('vieux')).toBe(false); // pas de tombstone éternel
    expect(r.tombstonesChanged).toBe(false);
  });

  it('plancher : pose quand même un tombstone récent (au-dessus du plancher)', () => {
    const {items, tombs} = fresh();
    const floor = '2026-01-01T00:00:00.000Z';
    mergeCollection(items, tombs, [item('recent', '2026-03-01T00:00:00.000Z', {deleted: true})], at, floor);
    expect(tombs.get('recent')).toBe('2026-03-01T00:00:00.000Z');
  });

  it('plancher : n efface pas un item local existant (suppression réelle même ancienne)', () => {
    const {items, tombs} = fresh();
    const floor = '2026-01-01T00:00:00.000Z';
    items.set('a', doc('a', '2024-01-01T00:00:00.000Z', 1)); // local plus ancien que le plancher
    const r = mergeCollection(items, tombs, [item('a', '2025-06-01T00:00:00.000Z', {deleted: true})], at, floor);
    expect(items.has('a')).toBe(false); // supprimé : le delete (2025-06) > local (2024-01)
    expect(tombs.get('a')).toBe('2025-06-01T00:00:00.000Z');
    expect(r.itemsChanged).toBe(true);
  });
});

describe('mergeFavorites', () => {
  it('ajoute un favori', () => {
    const meta: Record<string, FavState> = {};
    expect(mergeFavorites(meta, [item('ex1', '2026-01-01T00:00:00.000Z')])).toBe(true);
    expect(meta.ex1).toEqual({deleted: false, updatedAt: '2026-01-01T00:00:00.000Z'});
  });

  it('retire un favori (deleted plus récent)', () => {
    const meta: Record<string, FavState> = {ex1: {deleted: false, updatedAt: '2026-01-01T00:00:00.000Z'}};
    mergeFavorites(meta, [item('ex1', '2026-01-05T00:00:00.000Z', {deleted: true})]);
    expect(meta.ex1.deleted).toBe(true);
  });

  it('ignore un changement plus ancien', () => {
    const meta: Record<string, FavState> = {ex1: {deleted: false, updatedAt: '2026-01-10T00:00:00.000Z'}};
    expect(mergeFavorites(meta, [item('ex1', '2026-01-01T00:00:00.000Z', {deleted: true})])).toBe(false);
    expect(meta.ex1.deleted).toBe(false);
  });
});
