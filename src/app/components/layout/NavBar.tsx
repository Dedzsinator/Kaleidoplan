import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import spotifyService from '@services/spotify-web-api';
import { NotificationCenter } from '../ui/NotificationCenter';
import debounce from 'lodash.debounce';
import { useTrieSearch } from '../../hooks/useTrie';
import '../../styles/NavBar.css';

interface NavBarProps {
  opacity?: number;
  onSearch?: (term: string) => void;
  onAroundMe?: () => void;
  isLocationLoading?: boolean;
}

interface Suggestion {
  word: string;
  value: {
    id: string;
    _id?: string;
    name: string;
    location?: string;
    [key: string]: unknown;
  };
}

const NavBar: React.FC<NavBarProps> = ({ opacity = 1, onSearch, onAroundMe, isLocationLoading = false }) => {
  const { currentUser, isAuthenticated, isAdmin, isOrganizer, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const navigate = useNavigate();
  const navRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Use our custom trie search hook
  const { getSuggestions, isInitialized } = useTrieSearch();

  // Create a memoized debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      if (isInitialized && searchTerm.length >= 2) {
        const results = getSuggestions(searchTerm);

        // Convert SearchResult[] to Suggestion[] by ensuring id is always a string
        const convertedResults: Suggestion[] = results.map((result) => ({
          word: result.word,
          value: {
            ...result.value,
            id: String(result.value.id), // Convert id to string
            location: result.value.location || undefined,
          },
        }));

        setSuggestions(convertedResults);
        setShowSuggestions(isSearchFocused && convertedResults.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      setSelectedSuggestionIndex(-1);
    }, 300),
    [isInitialized, isSearchFocused, getSuggestions],
  );

  // Apply search term changes through the debounced function
  useEffect(() => {
    debouncedSearch(searchTerm);

    // Return a cleanup function to cancel pending debounced calls
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);

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
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAuthenticated]);

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

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

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.value && suggestion.value.id) {
      // Use correct event ID field
      const eventId = suggestion.value.id || suggestion.value._id;

      // Close the suggestions
      setSearchTerm('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);

      // Navigate with a slight delay to ensure state updates complete
      setTimeout(() => {
        navigate(`/events/${eventId}`);
      }, 10);
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
      setShowSuggestions(false);
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

  // Highlight matching parts of the suggestion
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;

    return (
      <>
        {text.substring(0, index)}
        <strong className="highlight">{text.substring(index, index + query.length)}</strong>
        {text.substring(index + query.length)}
      </>
    );
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

        {/* Search Bar with Trie Suggestions */}
        <div className="search-container">
          <form className={`navbar-search ${isSearchFocused ? 'focused' : ''}`} onSubmit={handleSearch}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                // Delay hiding suggestions to allow clicks to register
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              onKeyDown={handleKeyDown}
            />
            <button type="submit" className="search-button">
              <i className="fa fa-search"></i>
            </button>
          </form>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions" ref={suggestionsRef}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.word}-${index}`}
                  className={`suggestion-item ${selectedSuggestionIndex === index ? 'selected' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setSelectedSuggestionIndex(index)}
                >
                  <i className="fa fa-search suggestion-icon"></i>
                  <div className="suggestion-content">
                    <div className="suggestion-title">{highlightMatch(suggestion.value.name, searchTerm)}</div>
                    {suggestion.value.location && (
                      <div className="suggestion-location">
                        <i className="fa fa-map-marker-alt location-icon"></i>
                        {suggestion.value.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`navbar-links ${mobileMenuOpen ? 'active' : ''}`}>
          <Link to="/events" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>
            Events
          </Link>

          {/* Rest of the existing code */}
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

          {/* Rest of the navbar links... */}
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
                  <button className="dropdown-toggle navbar-link" onClick={() => toggleDropdown('admin')}>
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
                <button className="dropdown-toggle navbar-link" onClick={() => toggleDropdown('user')}>
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
