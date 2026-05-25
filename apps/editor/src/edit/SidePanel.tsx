import { TEMPLATES, getTemplate, type Menu } from '@dishboard/shared';
import { DecorationsEditor } from '../components/DecorationsEditor.js';
import { ThemeEditor } from '../components/ThemeEditor.js';
import { useEditor, type PanelTab } from './EditorContext.js';
import { SlotPanel } from './SlotPanel.js';

export function SidePanel() {
  const { menu, selection, activeTab, setActiveTab } = useEditor();
  const hasSlot = selection.kind === 'slot' || selection.kind === 'item';

  const tabs: Array<{ id: PanelTab; label: string; visible: boolean }> = [
    { id: 'template', label: 'Template', visible: true },
    { id: 'theme', label: 'Theme', visible: true },
    { id: 'decorations', label: 'Decorations', visible: true },
    { id: 'slot', label: 'Slot', visible: hasSlot },
  ];

  // If slot tab is active but nothing is selected, fall back to Template.
  const effectiveTab: PanelTab = activeTab === 'slot' && !hasSlot ? 'template' : activeTab;

  return (
    <aside className="side-panel">
      <nav className="side-panel__tabs" role="tablist">
        {tabs
          .filter((t) => t.visible)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={effectiveTab === t.id}
              className={`side-panel__tab${effectiveTab === t.id ? ' side-panel__tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
      </nav>
      <div className="side-panel__body">
        {effectiveTab === 'template' && <TemplatePanel menu={menu} />}
        {effectiveTab === 'theme' && <ThemePanel menu={menu} />}
        {effectiveTab === 'decorations' && <DecorationsPanel menu={menu} />}
        {effectiveTab === 'slot' && hasSlot && <SlotPanel />}
      </div>
    </aside>
  );
}

function TemplatePanel({ menu }: { menu: Menu }) {
  const { update } = useEditor();
  const template = getTemplate(menu.templateId);

  function setTemplate(id: string) {
    update((d) => {
      d.templateId = id;
    });
  }

  const orphans = template
    ? menu.slots.filter((s) => !template.regions.some((r) => r.id === s.regionId))
    : [];

  return (
    <div className="panel-section">
      <h3 className="panel-section__title">Template</h3>
      <label className="field">
        <span className="field__label">Layout</span>
        <select
          className="field__input"
          value={menu.templateId}
          onChange={(e) => setTemplate(e.target.value)}
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="field__hint">{template?.description}</span>
      </label>

      {orphans.length > 0 && (
        <div className="banner banner--warn">
          {orphans.length} section{orphans.length === 1 ? '' : 's'} reference regions that don't
          exist in this template. Reassign their region in the Slot panel before saving.
        </div>
      )}

      {template && (
        <div className="panel-subsection">
          <h4 className="panel-subsection__title">Regions in this template</h4>
          <ul className="region-list">
            {template.regions.map((r) => {
              const count = menu.slots.filter((s) => s.regionId === r.id).length;
              return (
                <li key={r.id} className="region-list__item">
                  <span>{r.label}</span>
                  <span className="muted">
                    {count === 0 ? 'empty' : `${count} section${count === 1 ? '' : 's'}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function ThemePanel({ menu }: { menu: Menu }) {
  const { update } = useEditor();
  return (
    <div className="panel-section">
      <ThemeEditor menu={menu} update={update} />
    </div>
  );
}

function DecorationsPanel({ menu }: { menu: Menu }) {
  const { update } = useEditor();
  return (
    <div className="panel-section">
      <DecorationsEditor menu={menu} update={update} />
    </div>
  );
}
