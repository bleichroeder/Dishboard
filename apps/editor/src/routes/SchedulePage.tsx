import { useCallback, useEffect, useState } from 'react';
import { produce, type Draft } from 'immer';
import type { Schedule, ScheduleRule, Weekday } from '@dishboard/shared';
import { api, type MenuListItem } from '../api.js';
import { uid } from '../lib/ids.js';

const WEEKDAYS: readonly Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const SHORT = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
} as const;

export function SchedulePage() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [menus, setMenus] = useState<MenuListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([api.schedule.get(), api.menus.list()])
      .then(([s, m]) => {
        if (!alive) return;
        setSchedule(s);
        setMenus(m);
        setDirty(false);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((fn: (draft: Draft<Schedule>) => void) => {
    setSchedule((s) => (s ? produce(s, fn) : s));
    setDirty(true);
    setSavingState('idle');
  }, []);

  async function onSave() {
    if (!schedule) return;
    setSavingState('saving');
    setError(null);
    try {
      const saved = await api.schedule.update(schedule);
      setSchedule(saved);
      setDirty(false);
      setSavingState('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSavingState('idle');
    }
  }

  function addRule() {
    if (!menus || menus.length === 0) return;
    update((d) => {
      d.rules.push({
        id: uid('rule'),
        menuId: menus[0]!.id,
        startTime: '09:00',
        endTime: '13:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      });
    });
  }

  if (error && !schedule) {
    return (
      <div className="page">
        <div className="banner banner--error">{error}</div>
      </div>
    );
  }
  if (!schedule || !menus) {
    return (
      <div className="page">
        <div className="muted">Loading…</div>
      </div>
    );
  }

  const menuLabel = (id: string) => menus.find((m) => m.id === id)?.title ?? '(unknown menu)';

  return (
    <div className="page editor-page">
      <div className="editor-toolbar">
        <h1 className="editor-toolbar__heading">Schedule</h1>
        <div className="editor-toolbar__actions">
          {savingState === 'saved' && !dirty && <span className="saved-pill">Saved</span>}
          <button
            type="button"
            className="btn btn--primary"
            onClick={onSave}
            disabled={!dirty || savingState === 'saving'}
          >
            {savingState === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      <section className="editor-card">
        <label className="field">
          <span className="field__label">Default menu</span>
          <select
            className="field__input"
            value={schedule.defaultMenuId ?? ''}
            onChange={(e) =>
              update((d) => {
                d.defaultMenuId = e.target.value || undefined;
              })
            }
          >
            <option value="">(no default)</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          <span className="field__hint">
            Shown when no time-of-day rule matches. Leave empty if you'd rather the viewer show a
            "no menu" message in off-hours.
          </span>
        </label>
      </section>

      <section className="editor-card">
        <header className="card__head">
          <h2 className="card__title">Time-of-day rules</h2>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={addRule}
            disabled={menus.length === 0}
          >
            + Add rule
          </button>
        </header>
        {schedule.rules.length === 0 ? (
          <div className="muted">
            No rules yet — the viewer will fall back to the default menu around the clock.
          </div>
        ) : (
          <ul className="rule-list">
            {schedule.rules.map((rule) => (
              <RuleEditor
                key={rule.id}
                rule={rule}
                menus={menus}
                menuLabel={menuLabel}
                update={update}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RuleEditor({
  rule,
  menus,
  menuLabel,
  update,
}: {
  rule: ScheduleRule;
  menus: MenuListItem[];
  menuLabel: (id: string) => string;
  update: (fn: (draft: Draft<Schedule>) => void) => void;
}) {
  function withRule(fn: (r: Draft<ScheduleRule>) => void) {
    update((d) => {
      const r = d.rules.find((x) => x.id === rule.id);
      if (r) fn(r);
    });
  }

  function removeRule() {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this rule?')) return;
    update((d) => {
      d.rules = d.rules.filter((r) => r.id !== rule.id);
    });
  }

  function toggleDay(day: Weekday) {
    withRule((r) => {
      r.days = r.days.includes(day) ? r.days.filter((d) => d !== day) : [...r.days, day];
    });
  }

  return (
    <li className="rule-card">
      <header className="rule-card__head">
        <span className="rule-card__name">{menuLabel(rule.menuId)}</span>
        <button type="button" className="btn btn--ghost btn--small" onClick={removeRule}>
          Remove
        </button>
      </header>

      <div className="rule-card__row">
        <label className="field field--grow">
          <span className="field__label">Menu</span>
          <select
            className="field__input"
            value={rule.menuId}
            onChange={(e) =>
              withRule((r) => {
                r.menuId = e.target.value;
              })
            }
          >
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rule-card__row">
        <label className="field field--grow">
          <span className="field__label">Start</span>
          <input
            type="time"
            className="field__input"
            value={rule.startTime}
            onChange={(e) =>
              withRule((r) => {
                r.startTime = e.target.value;
              })
            }
          />
        </label>
        <label className="field field--grow">
          <span className="field__label">End</span>
          <input
            type="time"
            className="field__input"
            value={rule.endTime}
            onChange={(e) =>
              withRule((r) => {
                r.endTime = e.target.value;
              })
            }
          />
        </label>
      </div>

      <fieldset className="days-picker">
        <legend>Days</legend>
        {WEEKDAYS.map((day) => (
          <label key={day} className={`day-chip${rule.days.includes(day) ? ' day-chip--on' : ''}`}>
            <input
              type="checkbox"
              checked={rule.days.includes(day)}
              onChange={() => toggleDay(day)}
            />
            <span>{SHORT[day]}</span>
          </label>
        ))}
      </fieldset>
    </li>
  );
}
