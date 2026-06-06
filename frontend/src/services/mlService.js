const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const predictTraffic = async (params) => {
  try {
    // The ML model expects a 24-hour sequence with 7 features:
    // [hour, day, temp, rain_1h, snow_1h, clouds_all, weather_main]
    
    const sequence = [];
    // Generate a synthetic 24-hour sequence ending with the user's input
    for (let i = 23; i >= 0; i--) {
      const simulatedHour = (params.hour - i + 24) % 24;
      sequence.push([
        simulatedHour,
        params.day,
        params.temp,
        params.rain,
        0, // snow
        params.clouds,
        0  // weather_main
      ]);
    }

    const response = await fetch(`${API_URL}/api/ml/predict-traffic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: sequence })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Traffic Prediction Error:", error);
    return { error: error.message };
  }
};
