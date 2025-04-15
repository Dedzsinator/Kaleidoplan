import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import '../styles/AdminPanel.css';

// Get Firestore instance
const db = getFirestore();
const firebaseAuth = getAuth();

// User analytics interface
interface UserAnalytics {
  id: string;
  email: string;
  displayName?: string;
  loginCount: number;
  lastLogin: Date | null;
  eventsCreated: number;
  tasksCompleted: number;
  createdAt: Date | null;
  platform?: string;
  daysSinceRegistration: number;
  role: string;
}

// Time range type for filters
type TimeRangeType = '7d' | '30d' | '90d' | 'all';

const AdminAnalyticsScreen = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRangeType>('30d');
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [totalLogins, setTotalLogins] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [newUsers, setNewUsers] = useState(0);
  const [mostActiveUser, setMostActiveUser] = useState<UserAnalytics | null>(null);
  const [platformStats, setPlatformStats] = useState<{ [key: string]: number }>({});

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Get users from Firestore
      const usersQuery = query(collection(db, 'users'));
      const userSnapshot = await getDocs(usersQuery);

      // Today's date for calculations
      const today = new Date();
      const timeRangeDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 1000;
      const cutoffDate = subDays(today, timeRangeDays);

      // Process user data
      const analytics: UserAnalytics[] = [];
      const platforms: { [key: string]: number } = {};
      let totalLoginCount = 0;
      let activeUserCount = 0;
      let newUserCount = 0;

      userSnapshot.forEach((doc) => {
        const userData = doc.data();
        const lastLogin = userData.lastLogin ? parseISO(userData.lastLogin) : null;
        const createdAt = userData.createdAt ? parseISO(userData.createdAt) : null;
        const loginCount = userData.loginCount || 0;

        // Count platform usage
        const platform = userData.platform || 'Unknown';
        platforms[platform] = (platforms[platform] || 0) + 1;

        // Calculate total logins
        totalLoginCount += loginCount;

        // Calculate active users (logged in during time range)
        if (lastLogin && lastLogin > cutoffDate) {
          activeUserCount++;
        }

        // Calculate new users
        if (createdAt && createdAt > cutoffDate) {
          newUserCount++;
        }

        analytics.push({
          id: doc.id,
          email: userData.email || '',
          displayName: userData.displayName || 'Anonymous User',
          loginCount,
          lastLogin,
          eventsCreated: userData.eventsCreated || 0,
          tasksCompleted: userData.tasksCompleted || 0,
          createdAt,
          platform: userData.platform || 'Unknown',
          daysSinceRegistration: createdAt ? differenceInDays(today, createdAt) : 0,
          role: userData.role || 'user'
        });
      });

      // Sort by login count to find most active users
      analytics.sort((a, b) => b.loginCount - a.loginCount);

      // Update state with analytics data
      setUserAnalytics(analytics);
      setMostActiveUser(analytics[0] || null);
      setTotalLogins(totalLoginCount);
      setActiveUsers(activeUserCount);
      setNewUsers(newUserCount);
      setPlatformStats(platforms);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  // Render time range filter buttons
  const renderTimeFilters = () => (
    <div className="filter-container">
      <button
        className={`filter-button ${timeRange === '7d' ? 'active-filter-button' : ''}`}
        onClick={() => setTimeRange('7d')}
      >
        <span className={`filter-text ${timeRange === '7d' ? 'active-filter-text' : ''}`}>7 Days</span>
      </button>

      <button
        className={`filter-button ${timeRange === '30d' ? 'active-filter-button' : ''}`}
        onClick={() => setTimeRange('30d')}
      >
        <span className={`filter-text ${timeRange === '30d' ? 'active-filter-text' : ''}`}>30 Days</span>
      </button>

      <button
        className={`filter-button ${timeRange === '90d' ? 'active-filter-button' : ''}`}
        onClick={() => setTimeRange('90d')}
      >
        <span className={`filter-text ${timeRange === '90d' ? 'active-filter-text' : ''}`}>90 Days</span>
      </button>

      <button
        className={`filter-button ${timeRange === 'all' ? 'active-filter-button' : ''}`}
        onClick={() => setTimeRange('all')}
      >
        <span className={`filter-text ${timeRange === 'all' ? 'active-filter-text' : ''}`}>All Time</span>
      </button>
    </div>
  );

  // Render metrics overview
  const renderMetricsOverview = () => (
    <div className="metrics-container">
      <div className="metric-card">
        <span className="metric-value">{totalLogins}</span>
        <span className="metric-label">Total Logins</span>
      </div>

      <div className="metric-card">
        <span className="metric-value">{activeUsers}</span>
        <span className="metric-label">Active Users</span>
      </div>

      <div className="metric-card">
        <span className="metric-value">{newUsers}</span>
        <span className="metric-label">New Users</span>
      </div>
    </div>
  );

  // Render platform stats
  const renderPlatformStats = () => {
    const platformData = Object.entries(platformStats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return (
      <div className="card">
        <h3 className="card-title">Platform Usage</h3>

        {platformData.map((platform, index) => (
          <div key={platform.name} className="platform-row">
            <span className="platform-name">{platform.name}</span>
            <span className="platform-count">{platform.count} users</span>
            <div className="platform-bar-container">
              <div
                className="platform-bar"
                style={{ width: `${(platform.count / userAnalytics.length) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render most active users
  const renderMostActiveUsers = () => {
    const topUsers = userAnalytics.slice(0, 5);

    return (
      <div className="card">
        <h3 className="card-title">Most Active Users</h3>

        {topUsers.map((user, index) => (
          <div key={user.id} className="user-row">
            <span className="user-rank">{index + 1}</span>
            <div className="user-info">
              <span className="user-name">{user.displayName}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <div className="user-metrics">
              <span className="login-count">{user.loginCount} logins</span>
              <span className="user-role">{user.role}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render user retention analysis
  const renderRetentionAnalysis = () => {
    // Calculate user retention by registration time
    const newlyRegistered = userAnalytics.filter(u => u.daysSinceRegistration <= 7).length;
    const totalUsers = userAnalytics.length;
    const retentionRate = totalUsers > 0 ?
      ((userAnalytics.filter(u => u.lastLogin &&
        differenceInDays(new Date(), u.lastLogin) < 30).length / totalUsers) * 100).toFixed(1) : 0;

    return (
      <div className="card">
        <h3 className="card-title">User Retention</h3>

        <div className="retention-container">
          <div className="retention-metric">
            <span className="retention-value">{newlyRegistered}</span>
            <span className="retention-label">New this week</span>
          </div>

          <div className="retention-metric">
            <span className="retention-value">{retentionRate}%</span>
            <span className="retention-label">30-day retention</span>
          </div>
        </div>
      </div>
    );
  };

  // Render tab selector
  const renderTabSelector = () => (
    <div className="tab-container">
      <button
        className={`tab ${activeTab === 'overview' ? 'active-tab' : ''}`}
        onClick={() => setActiveTab('overview')}
      >
        <span className={`tab-text ${activeTab === 'overview' ? 'active-tab-text' : ''}`}>Overview</span>
      </button>

      <button
        className={`tab ${activeTab === 'users' ? 'active-tab' : ''}`}
        onClick={() => setActiveTab('users')}
      >
        <span className={`tab-text ${activeTab === 'users' ? 'active-tab-text' : ''}`}>Users</span>
      </button>

      <button
        className={`tab ${activeTab === 'engagement' ? 'active-tab' : ''}`}
        onClick={() => setActiveTab('engagement')}
      >
        <span className={`tab-text ${activeTab === 'engagement' ? 'active-tab-text' : ''}`}>Engagement</span>
      </button>
    </div>
  );

  // Render users table
  const renderUsersTable = () => (
    <div className="table-container">
      <div className="table-header">
        <span className="table-header-cell" style={{ flex: 2 }}>User</span>
        <span className="table-header-cell">Role</span>
        <span className="table-header-cell">Registered</span>
        <span className="table-header-cell">Logins</span>
      </div>

      <div className="table-body">
        {userAnalytics.map(item => (
          <div key={item.id} className="table-row">
            <div className="table-cell" style={{ flex: 2 }}>
              <span className="user-name-table">{item.displayName}</span>
              <span className="user-email-table">{item.email}</span>
            </div>
            <span className="table-cell">{item.role}</span>
            <span className="table-cell">
              {item.createdAt ? format(item.createdAt, 'MMM d') : 'Unknown'}
            </span>
            <span className="table-cell">{item.loginCount}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading && !refreshing) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1 className="header-title">Analytics Dashboard</h1>
        <p className="header-subtitle">User engagement metrics</p>
      </div>

      {renderTabSelector()}

      <div className="scroll-container">
        <button onClick={onRefresh} className="refresh-button">
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>

        {renderTimeFilters()}

        {activeTab === 'overview' && (
          <>
            {renderMetricsOverview()}
            {renderMostActiveUsers()}
            {renderPlatformStats()}
          </>
        )}

        {activeTab === 'users' && (
          <>
            {renderUsersTable()}
          </>
        )}

        {activeTab === 'engagement' && (
          <>
            {renderRetentionAnalysis()}

            <div className="card">
              <h3 className="card-title">User Activity by Role</h3>

              <div className="role-stats-container">
                {['admin', 'organizer', 'user'].map(role => {
                  const roleUsers = userAnalytics.filter(u => u.role === role);
                  const avgLogins = roleUsers.length > 0 ?
                    (roleUsers.reduce((sum, u) => sum + u.loginCount, 0) / roleUsers.length).toFixed(1) : '0';

                  return (
                    <div key={role} className="role-stat">
                      <span className="role-title">{role}</span>
                      <span className="role-user-count">{roleUsers.length} users</span>
                      <span className="role-avg-logins">{avgLogins} avg logins</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {mostActiveUser && (
              <div className="card">
                <h3 className="card-title">Most Active User</h3>

                <div className="most-active-user-container">
                  <h4 className="most-active-user-name">{mostActiveUser.displayName}</h4>
                  <p className="most-active-user-email">{mostActiveUser.email}</p>
                  <div className="most-active-stats">
                    <div className="most-active-stat">
                      <span className="most-active-stat-value">{mostActiveUser.loginCount}</span>
                      <span className="most-active-stat-label">Logins</span>
                    </div>
                    <div className="most-active-stat">
                      <span className="most-active-stat-value">{mostActiveUser.eventsCreated}</span>
                      <span className="most-active-stat-label">Events Created</span>
                    </div>
                    <div className="most-active-stat">
                      <span className="most-active-stat-value">{mostActiveUser.tasksCompleted}</span>
                      <span className="most-active-stat-label">Tasks Completed</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAnalyticsScreen;