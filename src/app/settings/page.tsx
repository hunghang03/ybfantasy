'use client';

import { useRef, useState } from 'react';
import { DEFAULT_STRATEGY_CONFIG, parseStrategyConfig } from '@/domain/config/defaults';
import { downloadText } from '@/lib/ids';
import { useApp } from '@/state/store';
import { Button, Field, Panel, Select } from '@/components/ui/primitives';

function diffKeys(a: unknown, b: unknown, path = ''): string[] {
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return JSON.stringify(a) === JSON.stringify(b) ? [] : [path];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].flatMap((k) => diffKeys((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k));
}

export default function SettingsPage() {
  const config = useApp((s) => s.config);
  const setConfig = useApp((s) => s.setConfig);
  const resetConfig = useApp((s) => s.resetConfig);
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const clearAll = useApp((s) => s.clearAll);
  const [text, setText] = useState(() => JSON.stringify(config, null, 2));
  const [errors, setErrors] = useState<string[]>([]);
  const [ok, setOk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const changed = diffKeys(config, DEFAULT_STRATEGY_CONFIG);

  const apply = (raw: string) => {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      setErrors(['Not valid JSON.']);
      return;
    }
    const r = parseStrategyConfig(json);
    if (!r.ok) {
      setErrors(r.errors);
      setOk(false);
      return;
    }
    setConfig(r.config);
    setText(JSON.stringify(r.config, null, 2));
    setErrors([]);
    setOk(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-3 p-3">
      <Panel title="Display">
        <div className="flex gap-4">
          <Field label="Theme">
            <Select value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value as typeof settings.theme })}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </Field>
          <Field label="Compact table">
            <input type="checkbox" checked={settings.compactMode} onChange={(e) => updateSettings({ compactMode: e.target.checked })} />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Strategy configuration (advanced)"
        actions={
          <>
            <Button size="sm" variant="primary" onClick={() => apply(text)} data-testid="apply-config">
              Validate & apply
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetConfig();
                setText(JSON.stringify(DEFAULT_STRATEGY_CONFIG, null, 2));
                setErrors([]);
              }}
            >
              Reset to defaults
            </Button>
            <Button size="sm" onClick={() => downloadText('strategy-config.json', JSON.stringify(config, null, 2))}>
              Export
            </Button>
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              Import…
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) apply(await f.text());
                e.target.value = '';
              }}
            />
          </>
        }
      >
        <p className="mb-2 text-xs text-slate-600 dark:text-slate-400">
          Every engine weight lives here (see STRATEGY_ENGINE.md for each formula). Changes are validated with the schema before they apply. Changed from defaults:{' '}
          <b>{changed.length ? changed.join(', ') : 'none'}</b>
        </p>
        {errors.length > 0 && (
          <ul className="mb-2 list-disc pl-5 text-xs text-red-700" role="alert">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        {ok && <p className="mb-2 text-xs text-emerald-700">Applied.</p>}
        <textarea
          aria-label="Strategy configuration JSON"
          className="h-[60vh] w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-950"
          spellCheck={false}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOk(false);
          }}
        />
      </Panel>

      <Panel title="Danger zone">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (window.confirm('Delete ALL local data (leagues, drafts, datasets, config)? Export a backup first.')) void clearAll();
          }}
        >
          Clear all local data
        </Button>
      </Panel>
    </div>
  );
}
