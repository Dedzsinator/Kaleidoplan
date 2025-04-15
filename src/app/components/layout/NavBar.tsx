import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/NavBar.css';
import { useAuth } from '../../contexts/AuthContext';

interface NavBarProps {
    opacity?: number;
    transparent?: boolean;
}

const NavBar = ({ opacity = 1, transparent = false }: NavBarProps) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={`navbar ${scrolled || !transparent ? 'scrolled' : ''}`}
            style={{ opacity }}
        >
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    <img
                        src={require('../../assets/images/favicon.jpg')}
                        alt="Kaleidoplan Logo"
                        className="navbar-logo-img"
                    />
                    <span className="navbar-title">Kaleidoplan</span>
                </Link>

                <button
                    className={`navbar-toggle ${menuOpen ? 'open' : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle navigation"
                >
                    <div className="navbar-toggle-bar"></div>
                    <div className="navbar-toggle-bar"></div>
                    <div className="navbar-toggle-bar"></div>
                </button>

                <nav className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                    <Link to="/events" className={`navbar-link ${location.pathname === '/events' ? 'active' : ''}`}>
                        Events
                    </Link>

                    {user && user.role === 'organizer' && (
                        <Link to="/tasks" className={`navbar-link ${location.pathname.includes('/tasks') ? 'active' : ''}`}>
                            Tasks
                        </Link>
                    )}

                    {user && user.role === 'admin' && (
                        <Link to="/admin" className={`navbar-link ${location.pathname === '/admin' ? 'active' : ''}`}>
                            Admin
                        </Link>
                    )}

                    {user ? (
                        <>
                            <Link to="/profile" className="navbar-link user-link">
                                <img
                                    src={user.photoURL || require('../../assets/images/default-avatar.png')}
                                    alt="Profile"
                                    className="navbar-user-img"
                                />
                                <span className="navbar-username">{user.displayName?.split(' ')[0] || 'User'}</span>
                            </Link>
                            <button className="navbar-link logout-button" onClick={logout}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <Link to="/login" className="navbar-link login-button">
                            Sign In
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default NavBar;