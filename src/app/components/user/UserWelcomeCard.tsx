import React from 'react';
import { User } from '../../models/types';

interface UserWelcomeCardProps {
  user: User;
}

const UserWelcomeCard: React.FC<UserWelcomeCardProps> = ({ user }) => {
  return (
    <div className="user-welcome-card">
      <div className="user-welcome-header">
        <div className="user-avatar">
          <img src={user.photoURL || '/assets/images/default-avatar.png'} alt={user.displayName || 'User'} />
        </div>
        <div className="user-welcome-text">
          <h2>Welcome back, {user.displayName || 'User'}!</h2>
          <p className="user-role">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
        </div>
      </div>
    </div>
  );
};

export default UserWelcomeCard;
