import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRolesTab } from '../components/ui/UserRolesTab';
import { AdminTabs } from '../components/ui/AdminTabs';
import { AnalyticsTab } from '../components/ui/AnalyticsTab';
import { CrudOperationsTab } from '../components/ui/CrudOperationsTab';
import { EventOrganizersTab } from '../components/ui/EventOrganizersTab';
import NavBar from '../components/layout/NavBar';
import '../styles/AdminPanel.css';

const AdminPanelScreen: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [headerOpacity, setHeaderOpacity] = useState(0.8);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  return (
    <div className="admin-panel">
      <NavBar opacity={headerOpacity} />
      <div className="admin-panel-container">
        <div className="admin-header">
          <h1>Admin Panel</h1>
          <p className="subtitle">Manage and monitor your application</p>
        </div>
        <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        {loading && activeTab === 'analytics' && <div className="loading-spinner">Loading analytics...</div>}
        {error && <div className="error-message">{error}</div>}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'roles' && <UserRolesTab />}
        {activeTab === 'organizers' && <EventOrganizersTab />} {/* Add this line */}
        {activeTab === 'crud' && <CrudOperationsTab />}
      </div>
    </div>
  );
};

export default AdminPanelScreen;
