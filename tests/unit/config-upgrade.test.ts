import { describe, expect, it } from 'vitest';
import { computeAvailability } from '@/domain/availability/availability';
import { defaultConfig, parseStrategyConfig, upgradeStoredConfig } from '@/domain/config/defaults';
import type { StrategyConfig } from '@/domain/config/strategyConfig';

/** A config as saved by v3, before the INJ status existed. */
function v3Config(): StrategyConfig {
  const c = defaultConfig();
  const { INJ: _dropped, ...statusRisk } = c.statusRisk;
  void _dropped;
  // a user edit (DTD) that must survive the upgrade
  return { ...c, version: 3, statusRisk: { ...statusRisk, DTD: 0.05 } } as unknown as StrategyConfig;
}

describe('INJ status and config v4 upgrade', () => {
  it('upgrades a stored v3 config: adds statusRisk.INJ, keeps user values', () => {
    const up = upgradeStoredConfig(v3Config());
    expect(up.version).toBe(4);
    expect(up.statusRisk.INJ).toBe(0.08);
    expect(up.statusRisk.DTD).toBe(0.05);
  });
  it('an imported v3 config (or backup) without INJ still validates', () => {
    const r = parseStrategyConfig(JSON.parse(JSON.stringify(v3Config())));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config.statusRisk.INJ).toBe(0.08);
  });
  it('INJ has its own risk term, equal to what INJ rows received before v4 (no engine change)', () => {
    const cfg = defaultConfig();
    expect(cfg.statusRisk.INJ).toBe(cfg.statusRisk.OUT_SHORT);
    expect(computeAvailability([], null, 'INJ', cfg).terms.status).toBe(cfg.statusRisk.INJ);
  });
});
