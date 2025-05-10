import React from 'react';
import { Card } from '../layout/All';
import { User } from '@models/types';
import '../../styles/QuickActions.css';

export interface QuickActionsProps {
  user: User;
  onLogout: () => Promise<void>;
  onNavigate: (path: string) => void; // Add this line
}

export const QuickActions: React.FC<QuickActionsProps> = ({ user, onLogout, onNavigate }) => {
  const quickActions = [
    {
      id: 'events',
      title: 'Events',
      icon: '🗓️',
      description: 'Manage your events',
      path: '/events',
    },
    {
      id: 'tasks',
      title: 'Tasks',
      icon: '✓',
      description: 'View and manage tasks',
      path: '/tasks',
    },
    {
      id: 'profile',
      title: 'Profile',
      icon: '👤',
      description: 'Edit your profile',
      path: '/profile',
    },
  ];

  // Add more actions for admin users
  if (user.role === 'admin') {
    quickActions.push({
      id: 'admin',
      title: 'Admin Panel',
      icon: '⚙️',
      description: 'Access admin controls',
      path: '/admin',
    });
  }

  return (
    <div className="quick-actions">
      <h2 className="section-title">Quick Actions</h2>
      <div className="action-grid">
        {quickActions.map((action) => (
          <Card key={action.id} className="action-card" onClick={() => onNavigate(action.path)}>
            <div className="action-icon">{action.icon}</div>
            <h3 className="action-title">{action.title}</h3>
            <p className="action-description">{action.description}</p>
          </Card>
        ))}
        <Card className="action-card logout-card" onClick={onLogout}>
          <div className="action-icon">🚪</div>
          <h3 className="action-title">Logout</h3>
          <p className="action-description">Sign out of your account</p>
        </Card>
      </div>
    </div>
  );
};
