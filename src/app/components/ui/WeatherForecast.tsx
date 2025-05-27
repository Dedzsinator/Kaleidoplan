import React from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  WeatherForecast as WeatherForecastType,
  getWeatherForecast,
  getWeatherDescription,
} from '../../services/weatherService';
import '../../styles/WeatherForecast.css';

interface WeatherForecastProps {
  latitude: number;
  longitude: number;
  startDate: Date;
  endDate: Date;
  eventColor: string;
}

// Simple SVG Weather Icons
const WeatherIcon = ({ temperature, color }: { temperature: number; color: string }) => {
  const { icon } = getWeatherDescription(temperature);

  // Sun icon for warm weather
  if (icon === 0) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
        <circle cx="12" cy="12" r="5" fill={color} />
        <line x1="12" y1="1" x2="12" y2="3" stroke={color} strokeWidth="1.5" />
        <line x1="12" y1="21" x2="12" y2="23" stroke={color} strokeWidth="1.5" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={color} strokeWidth="1.5" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} strokeWidth="1.5" />
        <line x1="1" y1="12" x2="3" y2="12" stroke={color} strokeWidth="1.5" />
        <line x1="21" y1="12" x2="23" y2="12" stroke={color} strokeWidth="1.5" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={color} strokeWidth="1.5" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }

  // Partly cloudy icon
  if (icon === 2) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
        <circle cx="12" cy="9" r="4" fill={color} />
        <path
          d="M18,14c0-2-1.5-3-3-3c-1,0-2,0.5-2.5,1.5c-0.5-0.2-1-0.3-1.5-0.3c-2,0-3.5,1.5-3.5,3.5c0,2,1.5,3.5,3.5,3.5h7c1.5,0,3-1.5,3-3C21,15,19.5,14,18,14z"
          fill="#bbd4e6"
          stroke={color}
          strokeWidth="0.5"
        />
      </svg>
    );
  }

  // Cloudy icon
  if (icon === 3) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
        <path
          d="M19,14c0-3.31-2.69-6-6-6c-2.72,0-5.05,1.82-5.79,4.4C6.51,12.17,5.85,12,5.17,12C2.36,12,0,14.36,0,17.17
          c0,2.24,1.44,4.16,3.44,4.83h14.05C20.56,21.41,23,18.61,23,15.17C23,14.56,19,14,19,14z"
          fill="#bbd4e6"
          stroke={color}
          strokeWidth="0.75"
        />
      </svg>
    );
  }

  // Snow icon
  if (icon === 73) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
        <path
          d="M19,10c0-3.31-2.69-6-6-6c-2.72,0-5.05,1.82-5.79,4.4C6.51,8.17,5.85,8,5.17,8C2.36,8,0,10.36,0,13.17
          c0,2.24,1.44,4.16,3.44,4.83h14.05C20.56,17.41,23,14.61,23,11.17C23,10.56,19,10,19,10z"
          fill="#bbd4e6"
          stroke={color}
          strokeWidth="0.75"
        />
        <circle cx="7" cy="20" r="1" fill="#ffffff" stroke={color} strokeWidth="0.5" />
        <circle cx="12" cy="22" r="1" fill="#ffffff" stroke={color} strokeWidth="0.5" />
        <circle cx="17" cy="20" r="1" fill="#ffffff" stroke={color} strokeWidth="0.5" />
      </svg>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="1.5" />
      <text x="12" y="16" fontSize="10" textAnchor="middle" fill={color}>
        ?
      </text>
    </svg>
  );
};

const WeatherForecast: React.FC<WeatherForecastProps> = ({ latitude, longitude, startDate, endDate, eventColor }) => {
  const {
    data: forecast,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['nasa-weather', latitude, longitude, startDate.toISOString(), endDate.toISOString()],
    queryFn: () => getWeatherForecast(latitude, longitude, startDate, endDate),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  if (isLoading) {
    return (
      <div className="weather-loading">
        <div className="weather-loading-spinner" style={{ borderTopColor: eventColor }}></div>
        <p>Loading NASA weather data...</p>
      </div>
    );
  }

  if (isError || !forecast || !Array.isArray(forecast) || forecast.length === 0) {
    return (
      <div className="weather-error">
        <p>Unable to load weather forecast for this location.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="weather-forecast-container">
      <div className="weather-forecast-scroll">
        {forecast.map((dayForecast, index) => {
          const weatherInfo = getWeatherDescription(dayForecast.temperature);

          return (
            <div key={index} className="weather-day-card" style={{ borderColor: `${eventColor}33` }}>
              <div className="weather-date-header" style={{ backgroundColor: `${eventColor}22` }}>
                {formatDate(dayForecast.time)}
              </div>

              <div className="weather-icon">
                <WeatherIcon temperature={dayForecast.temperature} color={eventColor} />
              </div>

              <div className="weather-temp" style={{ color: eventColor }}>
                {Math.round(dayForecast.temperature)}°C
              </div>

              <div className="weather-description">{weatherInfo.description}</div>

              <div className="weather-details">
                <div className="weather-detail">
                  <span className="weather-detail-label">Wind:</span>
                  <span className="weather-detail-value">{Math.round(dayForecast.windSpeed)} km/h</span>
                </div>
                <div className="weather-detail">
                  <span className="weather-detail-label">Humidity:</span>
                  <span className="weather-detail-value">{Math.round(dayForecast.humidity)}%</span>
                </div>
                <div className="weather-detail">
                  <span className="weather-detail-label">Precip:</span>
                  <span className="weather-detail-value">{dayForecast.precipitation.toFixed(1)} mm</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeatherForecast;
