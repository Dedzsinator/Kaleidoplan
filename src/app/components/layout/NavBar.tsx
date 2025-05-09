import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import spotifyService from '../../../services/spotify-web-api';
import { NotificationCenter } from '../ui/NotificationCenter';
import '../../styles/NavBar.css';

interface NavBarProps {
  opacity?: number;
  onSearch?: (term: string) => void;
  onAroundMe?: () => void;
  isLocationLoading?: boolean;
}

const NavBar: React.FC<NavBarProps> = ({ opacity = 1, onSearch, onAroundMe, isLocationLoading = false }) => {
  const { currentUser, isAuthenticated, isAdmin, isOrganizer, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navigate = useNavigate();
  const navRef = useRef<HTMLDivElement>(null);

  // Check Spotify connection status on component mount
  useEffect(() => {
    const checkSpotifyConnection = async () => {
      const isConnected = await spotifyService.isUserAuthenticated();
      setIsSpotifyConnected(isConnected);
    };

    if (isAuthenticated) {
      checkSpotifyConnection();
    }

    // Close mobile menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAuthenticated]);

  // Handle Spotify login
  const handleSpotifyLogin = async () => {
    try {
      const authUrl = await spotifyService.getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get Spotify authorization URL:', error);
      alert('Could not connect to Spotify. Please try again later.');
    }
  };

  // Handle Spotify disconnect
  const handleSpotifyDisconnect = async () => {
    try {
      await spotifyService.disconnect();
      setIsSpotifyConnected(false);
      alert('Successfully disconnected from Spotify');
    } catch (error) {
      console.error('Failed to disconnect from Spotify:', error);
    }
  };

  // Handle event search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      if (onSearch) {
        // Use the callback if provided
        onSearch(searchTerm.trim());
      } else {
        // Fallback to navigation
        navigate(`/events?search=${encodeURIComponent(searchTerm.trim())}`);
      }
      setMobileMenuOpen(false); // Close mobile menu after search
    }
  };

  // Handle "Around Me" feature
  const handleAroundMe = () => {
    if (onAroundMe) {
      // Use the callback if provided
      onAroundMe();
    } else if (navigator.geolocation) {
      // Fallback to direct navigation
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          sessionStorage.setItem('userLocation', JSON.stringify({ latitude, longitude }));
          navigate(`/events?near=true&lat=${latitude}&lng=${longitude}&radius=300`);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location. Please check your location permissions and try again.');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
    setMobileMenuOpen(false); // Close mobile menu after action
  };

  // Toggle dropdown on mobile
  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  return (
    <nav className="navbar" style={{ opacity }} ref={navRef}>
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/">Kaleidoplan</Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <i className={`fa ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>

        {/* Search Bar */}
        <form className={`navbar-search ${isSearchFocused ? 'focused' : ''}`} onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          <button type="submit" className="search-button">
            <i className="fa fa-search"></i>
          </button>
        </form>

        <div className={`navbar-links ${mobileMenuOpen ? 'active' : ''}`}>
          <Link to="/events" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>
            Events
          </Link>

          {isAuthenticated && (
            <button
              className={`navbar-link around-me-button ${isLocationLoading ? 'loading' : ''}`}
              onClick={handleAroundMe}
              disabled={isLocationLoading}
              aria-label="Find events near your location"
            >
              {isLocationLoading ? (
                <>
                  <div className="location-spinner"></div> Finding events...
                </>
              ) : (
                <>
                  <i className="fa fa-map-marker-alt"></i> Around Me
                </>
              )}
            </button>
          )}

          {/* Public links */}
          {!isAuthenticated && (
            <>
              <Link to="/login" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>
                Sign In
              </Link>
              <Link to="/register" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>
                Sign Up
              </Link>
            </>
          )}

          {/* Authenticated user links */}
          {isAuthenticated && (
            <>
              <Link to="/dashboard" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>
                Dashboard
              </Link>

              {/* Organizer links - shown only if user is organizer but NOT admin */}
              {isOrganizer && !isAdmin && (
                <Link to="/organizer" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>
                  Organizer Dashboard
                </Link>
              )}

              {/* Admin links */}
              {isAdmin && (
                <div className={`dropdown ${activeDropdown === 'admin' ? 'active' : ''}`}>
                  <button
                    className="dropdown-toggle navbar-link"
                    onClick={() => toggleDropdown('admin')}
                  >
                    Admin
                  </button>
                  <div className="dropdown-menu">
                    <Link to="/admin" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                      Dashboard
                    </Link>
                    <Link to="/admin/user" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                      Users
                    </Link>
                    <Link to="/admin/events" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                      All Events
                    </Link>
                    {isOrganizer && (
                      <Link to="/organizer" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                        Organizer Tools
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <NotificationCenter />

              {/* User menu */}
              <div className={`dropdown user-menu ${activeDropdown === 'user' ? 'active' : ''}`}>
                <button
                  className="dropdown-toggle navbar-link"
                  onClick={() => toggleDropdown('user')}
                >
                  {currentUser?.displayName || currentUser?.email?.split('@')[0]}
                  {isSpotifyConnected && (
                    <span className="spotify-badge" title="Connected to Spotify">
                      🎵
                    </span>
                  )}
                </button>
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                    Profile
                  </Link>
                  <Link to="/settings" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                    Settings
                  </Link>

                  {/* Spotify integration */}
                  <hr />
                  {isSpotifyConnected ? (
                    <button
                      onClick={() => {
                        handleSpotifyDisconnect();
                        setMobileMenuOpen(false);
                      }}
                      className="dropdown-item spotify-disconnect"
                    >
                      <i className="fab fa-spotify"></i> Disconnect Spotify
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleSpotifyLogin();
                        setMobileMenuOpen(false);
                      }}
                      className="dropdown-item spotify-connect"
                    >
                      <i className="fab fa-spotify"></i> Connect to Spotify
                    </button>
                  )}
                  <hr />
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="dropdown-item logout-button"
                  >
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
