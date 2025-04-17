import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../../services/api';
import Chart from 'chart.js/auto';

interface StatsData {
    events: {
        total: number;
        upcoming: number;
        ongoing: number;
        percentage: number;
    };
    tasks: {
        completed: number;
        pending: number;
        overdue: number;
        total: number;
        completionRate: number;
    };
    users: {
        total: number;
        new: number;
        organizers: number;
        growth: number;
    };
}

interface LoginActivity {
    date: string;
    count: number;
}

interface UserData {
    _id: string;
    uid: string;
    email: string;
    displayName: string;
    role: string;
    createdAt: string;
    lastLogin: string;
    photoURL?: string;
    managedEvents?: string[];
}

export const AnalyticsTab: React.FC = () => {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loginActivity, setLoginActivity] = useState<LoginActivity[]>([]);
    const [activeUsers, setActiveUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    const loginChartRef = useRef<HTMLCanvasElement>(null);
    const userRolesChartRef = useRef<HTMLCanvasElement>(null);
    const eventStatusChartRef = useRef<HTMLCanvasElement>(null);

    // Store chart instances so we can destroy them later
    const chartInstancesRef = useRef<{ [key: string]: Chart | null }>({
        login: null,
        roles: null,
        events: null
    });

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);

                // Generate mock data for development since backend might not be ready
                const mockData = {
                    events: {
                        total: 25,
                        upcoming: 12,
                        ongoing: 5,
                        percentage: 48
                    },
                    tasks: {
                        completed: 45,
                        pending: 23,
                        overdue: 7,
                        total: 75,
                        completionRate: 60
                    },
                    users: {
                        total: 84,
                        organizers: 12,
                        new: 8,
                        growth: 24
                    }
                };

                const mockLoginActivity = Array(30).fill(0).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - 29 + i);
                    return {
                        date: date.toISOString().split('T')[0],
                        count: Math.floor(Math.random() * 20) + 1
                    };
                });

                // Try to fetch real data, fall back to mock data
                try {
                    // Try to get stats from API
                    const statsResponse = await fetchWithAuth('/admin/stats');
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        setStats(statsData);
                    } else {
                        console.log('Using mock stats data');
                        setStats(mockData);
                    }

                    // Try to get login activity
                    const activityResponse = await fetchWithAuth('/admin/login-activity');
                    if (activityResponse.ok) {
                        const activityData = await activityResponse.json();
                        setLoginActivity(activityData.activity);
                    } else {
                        console.log('Using mock login activity data');
                        setLoginActivity(mockLoginActivity);
                    }

                    // Try to get active users
                    const usersResponse = await fetchWithAuth('/admin/active-users');
                    if (usersResponse.ok) {
                        const usersData = await usersResponse.json();
                        setActiveUsers(usersData.users);
                    } else {
                        console.log('Error');
                    }
                } catch (error) {
                    console.error('Error fetching analytics data:', error);
                    // Fall back to mock data
                    setStats(mockData);
                    setLoginActivity(mockLoginActivity);
                }
            } finally {
                // Always set loading to false, even if there's an error
                setLoading(false);
            }
        };

        fetchAnalytics();

        // Cleanup function to destroy charts when component unmounts
        return () => {
            // Destroy any existing charts to prevent memory leaks
            Object.values(chartInstancesRef.current).forEach(chart => {
                if (chart) chart.destroy();
            });
        };
    }, []);

    useEffect(() => {
        if (loading || !stats) return;

        // Destroy existing charts before creating new ones
        Object.values(chartInstancesRef.current).forEach(chart => {
            if (chart) chart.destroy();
        });

        // Create login activity chart
        if (loginChartRef.current) {
            const ctx = loginChartRef.current.getContext('2d');
            if (ctx && loginActivity.length > 0) {
                chartInstancesRef.current.login = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: loginActivity.map(item => item.date),
                        datasets: [{
                            label: 'User Logins',
                            data: loginActivity.map(item => item.count),
                            borderColor: '#4285F4',
                            backgroundColor: 'rgba(66, 133, 244, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Login Activity (Last 30 days)'
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false
                            },
                        },
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }
        }

        // Create user roles chart
        if (userRolesChartRef.current) {
            const ctx = userRolesChartRef.current.getContext('2d');
            if (ctx && stats) {
                chartInstancesRef.current.roles = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Regular Users', 'Organizers', 'Admins'],
                        datasets: [{
                            data: [
                                stats.users.total - stats.users.organizers - 3, // Assuming 3 admins
                                stats.users.organizers,
                                3 // Placeholder for admin count
                            ],
                            backgroundColor: [
                                'rgba(66, 133, 244, 0.7)',
                                'rgba(52, 168, 83, 0.7)',
                                'rgba(251, 188, 4, 0.7)'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: 'User Distribution by Role'
                            },
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
            }
        }

        // Create event status chart
        if (eventStatusChartRef.current) {
            const ctx = eventStatusChartRef.current.getContext('2d');
            if (ctx && stats) {
                chartInstancesRef.current.events = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Upcoming', 'Ongoing', 'Completed'],
                        datasets: [{
                            label: 'Events',
                            data: [
                                stats.events.upcoming,
                                stats.events.ongoing,
                                stats.events.total - stats.events.upcoming - stats.events.ongoing
                            ],
                            backgroundColor: [
                                'rgba(52, 168, 83, 0.7)',
                                'rgba(66, 133, 244, 0.7)',
                                'rgba(234, 67, 53, 0.7)'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Events by Status'
                            },
                            legend: {
                                display: false
                            }
                        }
                    }
                });
            }
        }
    }, [loading, stats, loginActivity]);

    if (loading) {
        return <div className="loading-spinner">Loading analytics data...</div>;
    }

    return (
        <div className="analytics-tab">
            {/* KPI Summary */}
            <div className="kpi-summary">
                <div className="kpi-card">
                    <h3>Total Users</h3>
                    <div className="kpi-value">{stats?.users.total || 0}</div>
                    <div className="kpi-trend">
                        +{stats?.users.new || 0} new (last 7 days)
                    </div>
                </div>

                <div className="kpi-card">
                    <h3>Total Events</h3>
                    <div className="kpi-value">{stats?.events.total || 0}</div>
                    <div className="kpi-trend">
                        {stats?.events.upcoming || 0} upcoming
                    </div>
                </div>

                <div className="kpi-card">
                    <h3>Tasks</h3>
                    <div className="kpi-value">{stats?.tasks.total || 0}</div>
                    <div className="kpi-trend">
                        {stats?.tasks.completionRate || 0}% completion rate
                    </div>
                </div>

                <div className="kpi-card">
                    <h3>Organizers</h3>
                    <div className="kpi-value">{stats?.users.organizers || 0}</div>
                    <div className="kpi-trend">
                        {Math.round((stats?.users.organizers || 0) / (stats?.users.total || 1) * 100)}% of users
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="analytics-charts">
                <div className="chart-container">
                    <h3>Login Activity</h3>
                    <canvas ref={loginChartRef}></canvas>
                </div>

                <div className="chart-container">
                    <h3>User Roles</h3>
                    <canvas ref={userRolesChartRef}></canvas>
                </div>

                <div className="chart-container">
                    <h3>Event Status</h3>
                    <canvas ref={eventStatusChartRef}></canvas>
                </div>
            </div>

            {/* Active Users */}
            <div className="active-users-section">
                <h3>Currently Active Users ({activeUsers.length})</h3>
                <div className="active-users-list">
                    {activeUsers.length > 0 ? (
                        activeUsers.map(user => (
                            <div key={user._id} className="active-user-card">
                                <div className="user-avatar">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName || user.email} />
                                    ) : (
                                        <div className="default-avatar">
                                            {(user.displayName || user.email || '?')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <span className={`status-indicator ${user.role}`}></span>
                                </div>
                                <div className="user-info">
                                    <span className="user-name">{user.displayName || 'No Name'}</span>
                                    <span className="user-email">{user.email}</span>
                                    <span className="user-role">{user.role}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="no-data">No active users found</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsTab;