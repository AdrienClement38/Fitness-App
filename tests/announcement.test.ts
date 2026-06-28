/** Règle d'affichage du bandeau d'annonce (logique pure). */
import {describe, expect, it} from 'vitest';
import {announcementVersion, shouldShowAnnouncement} from '../src/lib/announcement';

const ann = (message: string, version?: string, tone: 'info' | 'warn' = 'info') => ({message, tone, version});

describe('announcementVersion', () => {
  it('utilise la version du serveur si présente', () => {
    expect(announcementVersion(ann('coucou', 'v123'))).toBe('v123');
  });
  it('repli sur un hash du contenu si pas de version', () => {
    expect(announcementVersion(ann('coucou'))).toBe(announcementVersion(ann('coucou'))); // stable
    expect(announcementVersion(ann('coucou'))).not.toBe(announcementVersion(ann('autre'))); // varie avec le contenu
  });
});

describe('shouldShowAnnouncement', () => {
  it('pas d\'annonce -> jamais affiché', () => {
    expect(shouldShowAnnouncement(null, '')).toBe(false);
    expect(shouldShowAnnouncement(null, 'v1')).toBe(false);
  });
  it('version pas encore fermée -> affiché', () => {
    expect(shouldShowAnnouncement(ann('x', 'v1'), '')).toBe(true); // rien de fermé
    expect(shouldShowAnnouncement(ann('x', 'v2'), 'v1')).toBe(true); // nouvelle version (republiée)
  });
  it('version déjà fermée -> masqué (info)', () => {
    expect(shouldShowAnnouncement(ann('x', 'v1'), 'v1')).toBe(false);
  });

  it('warn -> toujours affiché (non fermable), même version "déjà vue"', () => {
    expect(shouldShowAnnouncement(ann('alerte', 'v1', 'warn'), 'v1')).toBe(true);
    expect(shouldShowAnnouncement(ann('alerte', 'v1', 'warn'), '')).toBe(true);
  });
  it('repli contenu : annonce fermée puis identique (sans version serveur) -> reste masquée', () => {
    const a = ann('même message');
    expect(shouldShowAnnouncement(a, announcementVersion(a))).toBe(false);
  });
});
