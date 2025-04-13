import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';

// Get Firestore instance
const db = getFirestore();
const firebaseAuth = getAuth();

// Chart dimension
const screenWidth = Dimensions.get('window').width;

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

const AdminAnalyticsScreen = ({ navigation }) => {
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
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, timeRange === '7d' && styles.activeFilterButton]}
        onPress={() => setTimeRange('7d')}
      >
        <Text style={[styles.filterText, timeRange === '7d' && styles.activeFilterText]}>7 Days</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, timeRange === '30d' && styles.activeFilterButton]}
        onPress={() => setTimeRange('30d')}
      >
        <Text style={[styles.filterText, timeRange === '30d' && styles.activeFilterText]}>30 Days</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, timeRange === '90d' && styles.activeFilterButton]}
        onPress={() => setTimeRange('90d')}
      >
        <Text style={[styles.filterText, timeRange === '90d' && styles.activeFilterText]}>90 Days</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, timeRange === 'all' && styles.activeFilterButton]}
        onPress={() => setTimeRange('all')}
      >
        <Text style={[styles.filterText, timeRange === 'all' && styles.activeFilterText]}>All Time</Text>
      </TouchableOpacity>
    </View>
  );

  // Render metrics overview
  const renderMetricsOverview = () => (
    <View style={styles.metricsContainer}>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{totalLogins}</Text>
        <Text style={styles.metricLabel}>Total Logins</Text>
      </View>

      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{activeUsers}</Text>
        <Text style={styles.metricLabel}>Active Users</Text>
      </View>

      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{newUsers}</Text>
        <Text style={styles.metricLabel}>New Users</Text>
      </View>
    </View>
  );

  // Render platform stats
  const renderPlatformStats = () => {
    const platformData = Object.entries(platformStats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Platform Usage</Text>

        {platformData.map((platform, index) => (
          <View key={platform.name} style={styles.platformRow}>
            <Text style={styles.platformName}>{platform.name}</Text>
            <Text style={styles.platformCount}>{platform.count} users</Text>
            <View style={styles.platformBarContainer}>
              <View
                style={[
                  styles.platformBar,
                  { width: `${(platform.count / userAnalytics.length) * 100}%` }
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render most active users
  const renderMostActiveUsers = () => {
    const topUsers = userAnalytics.slice(0, 5);

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Most Active Users</Text>

        {topUsers.map((user, index) => (
          <View key={user.id} style={styles.userRow}>
            <Text style={styles.userRank}>{index + 1}</Text>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.displayName}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <View style={styles.userMetrics}>
              <Text style={styles.loginCount}>{user.loginCount} logins</Text>
              <Text style={styles.userRole}>{user.role}</Text>
            </View>
          </View>
        ))}
      </View>
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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>User Retention</Text>

        <View style={styles.retentionContainer}>
          <View style={styles.retentionMetric}>
            <Text style={styles.retentionValue}>{newlyRegistered}</Text>
            <Text style={styles.retentionLabel}>New this week</Text>
          </View>

          <View style={styles.retentionMetric}>
            <Text style={styles.retentionValue}>{retentionRate}%</Text>
            <Text style={styles.retentionLabel}>30-day retention</Text>
          </View>
        </View>
      </View>
    );
  };

  // Render tab selector
  const renderTabSelector = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
        onPress={() => setActiveTab('overview')}
      >
        <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'users' && styles.activeTab]}
        onPress={() => setActiveTab('users')}
      >
        <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'engagement' && styles.activeTab]}
        onPress={() => setActiveTab('engagement')}
      >
        <Text style={[styles.tabText, activeTab === 'engagement' && styles.activeTabText]}>Engagement</Text>
      </TouchableOpacity>
    </View>
  );

  // Render users table
  const renderUsersTable = () => (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>User</Text>
        <Text style={styles.tableHeaderCell}>Role</Text>
        <Text style={styles.tableHeaderCell}>Registered</Text>
        <Text style={styles.tableHeaderCell}>Logins</Text>
      </View>

      <FlatList
        data={userAnalytics}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, { flex: 2 }]}>
              <Text style={styles.userNameTable}>{item.displayName}</Text>
              <Text style={styles.userEmailTable}>{item.email}</Text>
            </View>
            <Text style={styles.tableCell}>{item.role}</Text>
            <Text style={styles.tableCell}>
              {item.createdAt ? format(item.createdAt, 'MMM d') : 'Unknown'}
            </Text>
            <Text style={styles.tableCell}>{item.loginCount}</Text>
          </View>
        )}
      />
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <Text style={styles.loadingText}>Loading analytics data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <Text style={styles.headerSubtitle}>User engagement metrics</Text>
      </View>

      {renderTabSelector()}

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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

            <View style={styles.card}>
              <Text style={styles.cardTitle}>User Activity by Role</Text>

              <View style={styles.roleStatsContainer}>
                {['admin', 'organizer', 'user'].map(role => {
                  const roleUsers = userAnalytics.filter(u => u.role === role);
                  const avgLogins = roleUsers.length > 0 ?
                    (roleUsers.reduce((sum, u) => sum + u.loginCount, 0) / roleUsers.length).toFixed(1) : '0';

                  return (
                    <View key={role} style={styles.roleStat}>
                      <Text style={styles.roleTitle}>{role}</Text>
                      <Text style={styles.roleUserCount}>{roleUsers.length} users</Text>
                      <Text style={styles.roleAvgLogins}>{avgLogins} avg logins</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {mostActiveUser && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Most Active User</Text>

                <View style={styles.mostActiveUserContainer}>
                  <Text style={styles.mostActiveUserName}>{mostActiveUser.displayName}</Text>
                  <Text style={styles.mostActiveUserEmail}>{mostActiveUser.email}</Text>
                  <View style={styles.mostActiveStats}>
                    <View style={styles.mostActiveStat}>
                      <Text style={styles.mostActiveStatValue}>{mostActiveUser.loginCount}</Text>
                      <Text style={styles.mostActiveStatLabel}>Logins</Text>
                    </View>
                    <View style={styles.mostActiveStat}>
                      <Text style={styles.mostActiveStatValue}>{mostActiveUser.eventsCreated}</Text>
                      <Text style={styles.mostActiveStatLabel}>Events Created</Text>
                    </View>
                    <View style={styles.mostActiveStat}>
                      <Text style={styles.mostActiveStatValue}>{mostActiveUser.tasksCompleted}</Text>
                      <Text style={styles.mostActiveStatLabel}>Tasks Completed</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#0a7ea4',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#0a7ea4',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeFilterButton: {
    backgroundColor: '#0a7ea4',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
  },
  activeFilterText: {
    color: 'white',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingVertical: 16,
    marginRight: 24,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0a7ea4',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#0a7ea4',
    fontWeight: '500',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  platformRow: {
    marginBottom: 12,
  },
  platformName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  platformCount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  platformBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  platformBar: {
    height: 8,
    backgroundColor: '#0a7ea4',
    borderRadius: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userRank: {
    width: 30,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a7ea4',
    textAlign: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
  },
  userMetrics: {
    alignItems: 'flex-end',
  },
  loginCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  userRole: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  retentionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  retentionMetric: {
    alignItems: 'center',
  },
  retentionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  retentionLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tableContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableHeaderCell: {
    flex: 1,
    fontWeight: 'bold',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    flex: 1,
  },
  userNameTable: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  userEmailTable: {
    fontSize: 12,
    color: '#666',
  },
  roleStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleStat: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    margin: 4,
    borderRadius: 8,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0a7ea4',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  roleUserCount: {
    fontSize: 14,
    color: '#333',
  },
  roleAvgLogins: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  mostActiveUserContainer: {
    alignItems: 'center',
    padding: 16,
  },
  mostActiveUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mostActiveUserEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  mostActiveStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
  },
  mostActiveStat: {
    alignItems: 'center',
  },
  mostActiveStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  mostActiveStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default AdminAnalyticsScreen;