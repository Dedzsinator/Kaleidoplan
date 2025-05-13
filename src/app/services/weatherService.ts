import axios from 'axios';

const NASA_POWER_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point';

export interface WeatherForecast {
  time: string;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  precipitation: number;
}

export interface NasaPowerResponse {
  properties: {
    parameter: {
      T2M: { [date: string]: number }; // Temperature at 2 Meters
      RH2M: { [date: string]: number }; // Relative Humidity at 2 Meters
      PRECTOTCORR: { [date: string]: number }; // Precipitation
      WS10M: { [date: string]: number }; // Wind Speed at 10 Meters
    };
  };
}

// Weather descriptions based on temperature
export const getWeatherDescription = (temperature: number): { description: string; icon: number } => {
  if (temperature > 30) return { description: 'Hot', icon: 0 };
  if (temperature > 20) return { description: 'Warm', icon: 0 };
  if (temperature > 10) return { description: 'Mild', icon: 2 };
  if (temperature > 0) return { description: 'Cold', icon: 3 };
  return { description: 'Freezing', icon: 73 };
};

export const getWeatherForecast = async (
  latitude: number,
  longitude: number,
  startDate: Date,
  endDate: Date,
): Promise<WeatherForecast[]> => {
  try {
    // Format dates for API - NASA POWER uses YYYYMMDD format
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    const start = formatDate(startDate);
    const end = formatDate(endDate);

    const response = await axios.get<NasaPowerResponse>(NASA_POWER_URL, {
      params: {
        start: start,
        end: end,
        latitude: latitude,
        longitude: longitude,
        parameters: 'T2M,RH2M,PRECTOTCORR,WS10M',
        community: 'RE',
        format: 'JSON',
        units: 'METRIC',
      },
    });

    // Transform the data into our format
    const forecastData: WeatherForecast[] = [];

    const { T2M, RH2M, PRECTOTCORR, WS10M } = response.data.properties.parameter;

    Object.keys(T2M).forEach((date) => {
      const temp = T2M[date];
      const weatherInfo = getWeatherDescription(temp);

      forecastData.push({
        time: `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`,
        temperature: temp,
        weatherCode: weatherInfo.icon,
        windSpeed: WS10M[date] || 0,
        humidity: RH2M[date] || 0,
        precipitation: PRECTOTCORR[date] || 0,
      });
    });

    return forecastData;
  } catch (error) {
    console.error('Error fetching NASA POWER data:', error);
    if (axios.isAxiosError(error)) {
      console.error('API Error Response:', error.response?.data);
      console.error('API Response Status:', error.response?.status);
    }
    return [];
  }
};
