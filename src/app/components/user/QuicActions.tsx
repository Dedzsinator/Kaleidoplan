import React from 'react';
import { User } from '../../models/types';

interface QuickActionsProps {
    user: User;
    onLogout: () => void;
    onNavigate: (path: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ user, onLogout, onNavigate }) => {
    return (
        <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="quick-actions-grid">
                <button className="quick-action-button" onClick={() => onNavigate('/events')}>
                    <span className="icon">📅</span>
                    <span>View Events</span>
                </button>

                {user.role === 'organizer' && (
                    <button className="quick-action-button" onClick={() => onNavigate('/tasks')}>
                        <span className="icon">✓</span>
                        <span>Manage Tasks</span>
                    </button>
                )}

                {user.role === 'admin' && (
                    <button className="quick-action-button" onClick={() => onNavigate('/admin')}>
                        <span className="icon">⚙️</span>
                        <span>Admin Panel</span>
                    </button>
                )}

                <button className="quick-action-button" onClick={onLogout}>
                    <span className="icon">🚪</span>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default QuickActions;