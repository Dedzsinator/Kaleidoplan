import React from 'react';

interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const AdminTabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="admin-tabs">
      <button className={`tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
        <span className="tab-icon">📊</span>
        <span className="tab-text">Analytics</span>
      </button>

      <button className={`tab ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>
        <span className="tab-icon">👥</span>
        <span className="tab-text">User Roles</span>
      </button>

      <button
        className={`tab ${activeTab === 'organizers' ? 'active' : ''}`}
        onClick={() => setActiveTab('organizers')}
      >
        <span className="tab-icon">🔑</span>
        <span className="tab-text">Event Organizers</span>
      </button>

      <button className={`tab ${activeTab === 'crud' ? 'active' : ''}`} onClick={() => setActiveTab('crud')}>
        <span className="tab-icon">⚙️</span>
        <span className="tab-text">Data Management</span>
      </button>
    </div>
  );
};
