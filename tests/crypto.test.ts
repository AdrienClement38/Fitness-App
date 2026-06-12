/**
 * Chiffrement au repos des blobs `sync_items` (AES-256-GCM).
 * Le module lit `DATA_ENCRYPTION_KEY` à l'import → on recharge le module via
 * `vi.resetModules()` + import dynamique pour tester clé présente / absente.
 */
import {describe, it, expect, vi, afterEach} from 'vitest';

async function loadWithKey(key: string) {
  vi.resetModules();
  vi.stubEnv('DATA_ENCRYPTION_KEY', key);
  return import('../server/crypto');
}

afterEach(() => vi.unstubAllEnvs());

const SAMPLE = {sets: [{reps: 10, weight: 80}], note: 'séance jambes éàç', done: true};

describe('crypto — clé configurée', () => {
  it('chiffre puis déchiffre à l’identique (round-trip)', async () => {
    const c = await loadWithKey('une-passphrase-de-test-robuste');
    expect(c.dataEncryptionEnabled).toBe(true);
    const enc = c.encryptData(SAMPLE) as Record<string, unknown>;
    expect(enc._enc).toBe('a256gcm'); // enveloppe, pas la valeur en clair
    expect(JSON.stringify(enc)).not.toContain('séance'); // contenu non lisible
    expect(c.decryptData(enc)).toEqual(SAMPLE);
  });

  it('génère un IV aléatoire (deux chiffrés diffèrent)', async () => {
    const c = await loadWithKey('une-passphrase-de-test-robuste');
    expect(c.encryptData(SAMPLE)).not.toEqual(c.encryptData(SAMPLE));
  });

  it('détecte l’altération (GCM) → null plutôt qu’une exception', async () => {
    const c = await loadWithKey('une-passphrase-de-test-robuste');
    const enc = c.encryptData(SAMPLE) as {ct: string};
    const tampered = {...enc, ct: Buffer.from('xxxx').toString('base64')};
    expect(c.decryptData(tampered)).toBeNull();
  });

  it('une mauvaise clé ne déchiffre pas (→ null)', async () => {
    const a = await loadWithKey('passphrase-A');
    const enc = a.encryptData(SAMPLE);
    const b = await loadWithKey('passphrase-B-différente');
    expect(b.decryptData(enc)).toBeNull();
  });

  it('lit aussi une valeur stockée en clair (rétro-compat)', async () => {
    const c = await loadWithKey('une-passphrase-de-test-robuste');
    expect(c.decryptData(SAMPLE)).toEqual(SAMPLE); // pas d’enveloppe → passthrough
  });

  it('null/undefined → null', async () => {
    const c = await loadWithKey('une-passphrase-de-test-robuste');
    expect(c.encryptData(null)).toBeNull();
    expect(c.encryptData(undefined)).toBeNull();
    expect(c.decryptData(null)).toBeNull();
  });
});

describe('crypto — sans clé (dev / PGlite local)', () => {
  it('stocke en clair (passthrough) et relit tel quel', async () => {
    const c = await loadWithKey('');
    expect(c.dataEncryptionEnabled).toBe(false);
    expect(c.encryptData(SAMPLE)).toEqual(SAMPLE);
    expect(c.decryptData(SAMPLE)).toEqual(SAMPLE);
  });

  it('ne peut pas lire un blob chiffré (→ null, le client repoussera)', async () => {
    const keyed = await loadWithKey('une-passphrase-de-test-robuste');
    const enc = keyed.encryptData(SAMPLE);
    const noKey = await loadWithKey('');
    expect(noKey.decryptData(enc)).toBeNull();
  });
});

describe('crypto — AAD (liaison à la ligne user/kind/item)', () => {
  it('round-trip avec la même AAD', async () => {
    const c = await loadWithKey('passphrase-aad');
    const enc = c.encryptData(SAMPLE, 'u1 workout-log id1');
    expect(c.decryptData(enc, 'u1 workout-log id1')).toEqual(SAMPLE);
  });

  it('AAD différente → null (blob déplacé vers une autre ligne)', async () => {
    const c = await loadWithKey('passphrase-aad');
    const enc = c.encryptData(SAMPLE, 'u1 workout-log id1');
    expect(c.decryptData(enc, 'u2 workout-log id1')).toBeNull(); // autre utilisateur
    expect(c.decryptData(enc, 'u1 favorite id1')).toBeNull(); // autre kind
    expect(c.decryptData(enc)).toBeNull(); // AAD manquante
  });
});
