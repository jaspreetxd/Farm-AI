export interface WeatherData {
  temperature: number;
  windspeed: number;
  weathercode: number;
}

export const fetchWeather = async (lat: number, lon: number): Promise<WeatherData | null> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data && data.current_weather) {
      return {
        temperature: data.current_weather.temperature,
        windspeed: data.current_weather.windspeed,
        weathercode: data.current_weather.weathercode,
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    return null;
  }
};