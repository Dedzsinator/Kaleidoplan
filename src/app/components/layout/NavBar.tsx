import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/NavBar.css';

interface NavBarProps {
    opacity?: number;
}

const NavBar: React.FC<NavBarProps> = ({ opacity = 1 }) => {
    const { currentUser, isAuthenticated, isAdmin, isOrganizer, logout } = useAuth();

    return (
        <nav className="navbar" style={{ opacity }}>
            <div className="navbar-container">
                <div className="navbar-logo">
                    <Link to="/">Kaleidoplan</Link>
                </div>

                <div className="navbar-links">
                    <Link to="/events" className="navbar-link">Events</Link>

                    {/* Public links */}
                    {!isAuthenticated && (
                        <>
                            <Link to="/login" className="navbar-link">Sign In</Link>
                            <Link to="/register" className="navbar-link">Sign Up</Link>
                        </>
                    )}

                    {/* Authenticated user links */}
                    {isAuthenticated && (
                        <>
                            <Link to="/dashboard" className="navbar-link">Dashboard</Link>

                            {/* Organizer links */}
                            {isOrganizer && (
                                <Link to="/organizer" className="navbar-link">Organizer Dashboard</Link>
                            )}

                            {/* Admin links */}
                            {isAdmin && (
                                <div className="dropdown">
                                    <button className="dropdown-toggle navbar-link">Admin</button>
                                    <div className="dropdown-menu">
                                        <Link to="/admin" className="dropdown-item">Dashboard</Link>
                                        <Link to="/admin/users" className="dropdown-item">Users</Link>
                                        <Link to="/admin/events" className="dropdown-item">All Events</Link>
                                    </div>
                                </div>
                            )}

                            {/* User menu */}
                            <div className="dropdown user-menu">
                                <button className="dropdown-toggle navbar-link">
                                    {currentUser?.displayName || currentUser?.email?.split('@')[0]}
                                </button>
                                <div className="dropdown-menu">
                                    <Link to="/profile" className="dropdown-item">Profile</Link>
                                    <Link to="/settings" className="dropdown-item">Settings</Link>
                                    <hr />
                                    <button onClick={logout} className="dropdown-item logout-button">
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default NavBar;