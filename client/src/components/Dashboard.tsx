import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Cloud, Activity, TrendingUp, Droplets, Thermometer, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import { fetchAnalytics, addLiveReading, setConnected, clearLiveReadings } from '../store/weatherSlice';
import socketService from '../services/socketService';
import { WeatherReading } from '../types';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { liveReadings, analytics, loading, connected } = useAppSelector((state) => state.weather);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Fetch initial analytics
    dispatch(fetchAnalytics(24));

    // Connect to WebSocket

    socketService.onConnect(() => {
      console.log('WebSocket connected');
      dispatch(setConnected(true));
    });

    socketService.onDisconnect(() => {
      console.log('WebSocket disconnected');
      dispatch(setConnected(false));
    });

    socketService.onWeatherUpdate((reading: WeatherReading) => {
      console.log('New weather reading:', reading);
      dispatch(addLiveReading(reading));
    });

    return () => {
      socketService.offWeatherUpdate();
      socketService.disconnect();
    };
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearLiveReadings());
    navigate('/login');
  };

  const handleRefreshAnalytics = async () => {
    setRefreshing(true);
    await dispatch(fetchAnalytics(24));
    setRefreshing(false);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTemperatureColor = (temp: number) => {
    if (temp < 0) return '#3b82f6'; // Blue
    if (temp < 15) return '#06b6d4'; // Cyan
    if (temp < 25) return '#10b981'; // Green
    if (temp < 35) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Cloud size={32} color="#3b82f6" />
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Weather Monitor</h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Welcome, {user?.username}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className={`badge ${connected ? 'badge-success' : 'badge-danger'}`}>
              {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
              <span style={{ marginLeft: '0.5rem' }}>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary">
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: '2rem 1rem' }}>
        {/* Analytics Section */}
        <section style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={24} />
                Historical Analytics (24 Hours)
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Aggregated weather data from tracked cities
              </p>
            </div>
            <button
              onClick={handleRefreshAnalytics}
              className="btn btn-primary"
              disabled={refreshing}
            >
              <RefreshCw size={20} className={refreshing ? 'spinner' : ''} />
              Refresh
            </button>
          </div>

          {loading && !analytics.length ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto' }}></div>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading analytics...</p>
            </div>
          ) : analytics.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Activity size={48} color="var(--text-secondary)" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                No data available yet. Weather readings will appear here soon.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {analytics.map((city) => (
                <div key={city.city_name} className="card fade-in">
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cloud size={20} color="#3b82f6" />
                    {city.city_name}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--background)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Thermometer size={20} color="#ef4444" />
                        <span style={{ fontWeight: 500 }}>Min Temp</span>
                      </div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: getTemperatureColor(city.min_temperature) }}>
                        {city.min_temperature.toFixed(1)}°C
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--background)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Thermometer size={20} color="#f59e0b" />
                        <span style={{ fontWeight: 500 }}>Max Temp</span>
                      </div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: getTemperatureColor(city.max_temperature) }}>
                        {city.max_temperature.toFixed(1)}°C
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--background)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Droplets size={20} color="#3b82f6" />
                        <span style={{ fontWeight: 500 }}>Avg Humidity</span>
                      </div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
                        {city.avg_humidity.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Live Feed Section */}
        <section>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={24} />
              Live Weather Feed
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Real-time weather updates via WebSocket
            </p>
          </div>

          <div className="card">
            {!connected && (
              <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <WifiOff size={20} color="#92400e" />
                <span style={{ color: '#92400e' }}>
                  WebSocket disconnected. Attempting to reconnect...
                </span>
              </div>
            )}

            {liveReadings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Activity size={48} color="var(--text-secondary)" style={{ margin: '0 auto' }} />
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  Waiting for live weather updates...
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  New readings will appear here in real-time
                </p>
              </div>
            ) : (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>City</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Temperature</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Humidity</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveReadings.map((reading, index) => (
                      <tr
                        key={`${reading.id}-${index}`}
                        className="fade-in"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Cloud size={16} color="#3b82f6" />
                            {reading.city_name}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: getTemperatureColor(reading.temperature_c) }}>
                            {reading.temperature_c.toFixed(1)}°C
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ color: '#3b82f6', fontWeight: 500 }}>
                            {reading.humidity_percent}%
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {formatDateTime(reading.recorded_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
