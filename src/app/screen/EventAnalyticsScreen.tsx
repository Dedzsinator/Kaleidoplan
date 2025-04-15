import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../../services/api';
import Chart from 'chart.js/auto';
import '../styles/AnalyticsScreen.css';

interface EventData {
    _id: string;
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    coverImageUrl?: string;
}

interface AnalyticsData {
    registrations: {
        total: number;
        daily: { date: string; count: number }[];
    };
    demographics?: {
        ageGroups?: { group: string; count: number }[];
        gender?: { type: string; count: number }[];
        location?: { city: string; count: number }[];
    };
    engagement: {
        pageViews: number;
        avgTimeOnPage: number;
        clickThroughRate: number;
    };
}

const EventAnalyticsScreen: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const { isOrganizer, isAdmin } = useAuth();
    const [event, setEvent] = useState<EventData | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeframe, setTimeframe] = useState('7day');
    const [exportLoading, setExportLoading] = useState(false);

    const registrationChartRef = useRef<HTMLCanvasElement>(null);
    const demographicsChartRef = useRef<HTMLCanvasElement>(null);
    const registrationChart = useRef<Chart | null>(null);
    const demographicsChart = useRef<Chart | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        if (!isOrganizer && !isAdmin) {
            navigate('/dashboard');
            return;
        }

        const fetchEventData = async () => {
            try {
                setLoading(true);
                setError('');

                // Fetch event details
                const eventResponse = await fetchWithAuth(`/api/events/${eventId}`);

                if (!eventResponse.ok) {
                    throw new Error('Failed to fetch event details');
                }

                const eventData = await eventResponse.json();
                setEvent(eventData);

                // Fetch analytics data
                const analyticsResponse = await fetchWithAuth(
                    `/api/events/${eventId}/analytics?timeframe=${timeframe}`
                );

                if (!analyticsResponse.ok) {
                    throw new Error('Failed to fetch analytics data');
                }

                const analyticsData = await analyticsResponse.json();
                setAnalytics(analyticsData);

            } catch (err: any) {
                setError(err.message || 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchEventData();
    }, [eventId, timeframe, isOrganizer, isAdmin, navigate]);

    // Initialize and update charts when data changes
    useEffect(() => {
        if (!analytics || loading) return;

        // Destroy previous charts if they exist
        if (registrationChart.current) {
            registrationChart.current.destroy();
        }

        if (demographicsChart.current) {
            demographicsChart.current.destroy();
        }

        // Create registration chart
        if (registrationChartRef.current && analytics.registrations.daily) {
            const ctx = registrationChartRef.current.getContext('2d');
            if (ctx) {
                const dates = analytics.registrations.daily.map(item => item.date);
                const counts = analytics.registrations.daily.map(item => item.count);

                registrationChart.current = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: [{
                            label: 'Registrations',
                            data: counts,
                            backgroundColor: 'rgba(66, 133, 244, 0.2)',
                            borderColor: 'rgba(66, 133, 244, 1)',
                            borderWidth: 2,
                            tension: 0.3
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Registration Trend'
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false
                            }
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

        // Create demographics chart (if data available)
        if (demographicsChartRef.current && analytics.demographics?.ageGroups) {
            const ctx = demographicsChartRef.current.getContext('2d');
            if (ctx) {
                const labels = analytics.demographics.ageGroups.map(item => item.group);
                const data = analytics.demographics.ageGroups.map(item => item.count);

                demographicsChart.current = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.7)',
                                'rgba(54, 162, 235, 0.7)',
                                'rgba(255, 206, 86, 0.7)',
                                'rgba(75, 192, 192, 0.7)',
                                'rgba(153, 102, 255, 0.7)'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Age Group Distribution'
                            },
                            legend: {
                                position: 'right'
                            }
                        }
                    }
                });
            }
        }

    }, [analytics, loading]);

    const handleExportCSV = async () => {
        try {
            setExportLoading(true);

            const response = await fetchWithAuth(`/api/events/${eventId}/analytics/export`, {
                headers: {
                    'Accept': 'text/csv'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to export analytics data');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `event-analytics-${eventId}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <div className="analytics-title">
                    <h1>Event Analytics</h1>
                    {event && <h2>{event.name}</h2>}
                </div>

                <div className="analytics-actions">
                    <Link to={`/events/edit/${eventId}`} className="edit-event-button">Edit Event</Link>
                    <button
                        className="export-button"
                        onClick={handleExportCSV}
                        disabled={exportLoading}
                    >
                        {exportLoading ? 'Exporting...' : 'Export CSV'}
                    </button>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-spinner">Loading analytics data...</div>
            ) : (
                <>
                    <div className="analytics-timeframe">
                        <label htmlFor="timeframe">Time Period:</label>
                        <select
                            id="timeframe"
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                        >
                            <option value="7day">Last 7 Days</option>
                            <option value="30day">Last 30 Days</option>
                            <option value="90day">Last 90 Days</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>

                    <div className="analytics-summary">
                        <div className="summary-card">
                            <h3>Total Registrations</h3>
                            <p className="summary-value">{analytics?.registrations.total || 0}</p>
                        </div>

                        <div className="summary-card">
                            <h3>Page Views</h3>
                            <p className="summary-value">{analytics?.engagement.pageViews || 0}</p>
                        </div>

                        <div className="summary-card">
                            <h3>Conversion Rate</h3>
                            <p className="summary-value">
                                {analytics && (analytics.engagement.clickThroughRate * 100).toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    <div className="analytics-charts">
                        <div className="chart-container">
                            <h3>Registration Trend</h3>
                            <canvas ref={registrationChartRef}></canvas>
                        </div>

                        {analytics?.demographics?.ageGroups && (
                            <div className="chart-container">
                                <h3>Attendee Demographics</h3>
                                <canvas ref={demographicsChartRef}></canvas>
                            </div>
                        )}
                    </div>

                    {analytics?.demographics?.location && (
                        <div className="analytics-section">
                            <h3>Geographic Distribution</h3>
                            <div className="location-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Location</th>
                                            <th>Attendees</th>
                                            <th>Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.demographics.location.map((loc, index) => (
                                            <tr key={index}>
                                                <td>{loc.city}</td>
                                                <td>{loc.count}</td>
                                                <td>
                                                    {((loc.count / analytics.registrations.total) * 100).toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default EventAnalyticsScreen;