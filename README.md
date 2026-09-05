🌦️ Atmosphere Weather App

An interactive and responsive weather dashboard built using HTML, CSS, and vanilla JavaScript. Search for any city to view live weather conditions, hourly forecasts, air quality, and detailed atmospheric information.






🔗 Live Demo

Open Atmosphere Weather

✨ Features

Search for cities anywhere in the world

Detect and display weather for the user's current location

View live temperature, weather condition, and feels-like temperature

Switch between Celsius and Fahrenheit

Explore a 24-hour weather forecast

View a seven-day forecast with temperature ranges

Check AQI, PM2.5, and PM10 levels

View humidity, UV index, atmospheric pressure, and visibility

Check wind speed, wind gusts, and wind direction

View precipitation probability, sunrise, and sunset times

Save favorite cities using browser local storage

Responsive layout for desktop, tablet, and mobile devices

Animated glassmorphism interface with weather-based colors

Loading, offline, and error states

🛠️ Technologies Used

HTML5 — Semantic page structure

CSS3 — Responsive layouts, animations, gradients, and glassmorphism

JavaScript — API requests, DOM updates, search, location, and local storage

Open-Meteo API — Weather forecasts and current conditions

Open-Meteo Geocoding API — City search and coordinates

Open-Meteo Air Quality API — AQI and pollution readings

📁 Project Structure

Atmosphere-Weather-App/
├── index.html
├── styles.css
├── app.js
└── README.md

🚀 Getting Started

1. Clone the repository

git clone <your-repository-url>
cd Atmosphere-Weather-App

Replace <your-repository-url> with the URL of your GitHub repository.

2. Run the application

No packages or build commands are required.

Open the project folder in VS Code.

Install the Live Server extension if it is not already installed.

Right-click index.html.

Select Open with Live Server.

You can also open index.html directly in a modern web browser.

🔌 API Information

The application uses the following free Open-Meteo services:

Forecast:    https://api.open-meteo.com/v1/forecast
Geocoding:   https://geocoding-api.open-meteo.com/v1/search
Air Quality: https://air-quality-api.open-meteo.com/v1/air-quality

No API key is required.

💾 Saved Cities

Favorite cities and the selected temperature unit are stored using localStorage. This means the settings remain available in the same browser after refreshing or reopening the website.

📱 Responsive Design

The interface automatically adapts to different screen sizes. On smaller screens, saved cities appear in a slide-out sidebar while the main weather information remains easy to navigate.

🔮 Future Improvements

Interactive weather maps

Weather alerts and notifications

Historical temperature charts

Multiple language support

Pollen and allergy information

Custom themes

🤝 Contributing

Contributions are welcome. To contribute:

Fork the repository.

Create a new branch: git checkout -b feature/your-feature-name

Commit your changes: git commit -m "Add your feature"

Push the branch: git push origin feature/your-feature-name

Open a pull request.

👨‍💻 Author

Created by Aman Kumar Sinha.

If you found this project useful, consider giving the repository a ⭐.
