import { Plus, X } from 'lucide-react';
import type { Tab } from '../appReducer';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelectTab, onAddTab, onCloseTab }: TabBarProps) {
  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab${tab.id === activeTabId ? ' active' : ''}${tab.state.isCasting ? ' casting' : ''}`}
            onClick={() => onSelectTab(tab.id)}
            title={tab.label}
          >
            <span className="tab-label">{tab.label}</span>
            {tabs.length > 1 && (
              <span
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
              >
                <X size={12} />
              </span>
            )}
          </button>
        ))}
      </div>
      <button className="tab-add" onClick={onAddTab} title="New Tab">
        <Plus size={14} />
      </button>
    </div>
  );
}
