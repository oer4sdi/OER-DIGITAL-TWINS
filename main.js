import { CESIUM_ION_ACCESS_TOKEN, AIR_QUALITY_OPEN_DATA_PLATFORM_TOKEN } from './config.js';

// Access Token
Cesium.Ion.defaultAccessToken = CESIUM_ION_ACCESS_TOKEN;

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer('cesiumContainer', {
    sceneModePicker: false,
    baseLayerPicker: false,
});

viewer.scene.globe.show = false;

// Set the camera to focus on Hamburg
viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(9.9949553, 53.5542627, 500),
    orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-30.0),
        roll: 0.0
    },
    duration: 2
});

// Add Google Photorealistic 3D Tiles
try {
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
    viewer.scene.primitives.add(tileset);
} catch (error) {
    console.log(error);
}

// --- UI Widget Setup ---
// Main Container for the air quality information widget
const airQualityWidget = document.createElement('div');
airQualityWidget.id = 'airQualityWidget';
airQualityWidget.style.position = 'absolute';
airQualityWidget.style.top = '10px';
airQualityWidget.style.left = '10px';
airQualityWidget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
airQualityWidget.style.color = 'white';
airQualityWidget.style.padding = '10px';
airQualityWidget.style.borderRadius = '5px';
airQualityWidget.style.zIndex = '999';
document.body.appendChild(airQualityWidget);

// Create individual elements for the air quality parameters
const stationName = document.createElement('div');
const measurementTime = document.createElement('div');
const aqiElement = document.createElement('div');
const coElement = document.createElement('div');
const no2Element = document.createElement('div');
const o3Element = document.createElement('div');
const pm10Element = document.createElement('div');
const pm25Element = document.createElement('div');
const so2Element = document.createElement('div');

// Add elements to the widget
airQualityWidget.appendChild(stationName);
airQualityWidget.appendChild(measurementTime);
airQualityWidget.appendChild(aqiElement);
airQualityWidget.appendChild(coElement);
airQualityWidget.appendChild(no2Element);
airQualityWidget.appendChild(o3Element);
airQualityWidget.appendChild(pm10Element);
airQualityWidget.appendChild(pm25Element);
airQualityWidget.appendChild(so2Element);

// --- Air Quality Data Handling ---
const updateAirQualityWidget = (data) => {
    if (data.status === 'ok' && data.data) {
        const { aqi, iaqi, city, time } = data.data;

        aqiElement.textContent = `AQI: ${aqi}`;
        
        stationName.textContent = `Station: ${city.name}`;
        measurementTime.textContent = `Measurement Time: ${time.s}`;

        //Check if the data.aqi is a number and not "-"
        if (typeof aqi !== "number"){
          aqiElement.textContent = `AQI: Data not available`;
        }

        if (iaqi) {
            coElement.textContent = iaqi.co ? `CO: ${iaqi.co.v}` : 'CO: N/A';
            no2Element.textContent = iaqi.no2 ? `NO2: ${iaqi.no2.v}` : 'NO2: N/A';
            o3Element.textContent = iaqi.o3 ? `O3: ${iaqi.o3.v}` : 'O3: N/A';
            pm10Element.textContent = iaqi.pm10 ? `PM10: ${iaqi.pm10.v}` : 'PM10: N/A';
            pm25Element.textContent = iaqi.pm25 ? `PM2.5: ${iaqi.pm25.v}` : 'PM2.5: N/A';
            so2Element.textContent = iaqi.so2 ? `SO2: ${iaqi.so2.v}` : 'SO2: N/A';
        } else {
            coElement.textContent =  'CO: N/A';
            no2Element.textContent = 'NO2: N/A';
            o3Element.textContent = 'O3: N/A';
            pm10Element.textContent = 'PM10: N/A';
            pm25Element.textContent = 'PM2.5: N/A';
            so2Element.textContent = 'SO2: N/A';
        }
    } else {
        stationName.textContent = 'Station: N/A';
        measurementTime.textContent = 'Measurement Time: N/A';
        aqiElement.textContent = 'AQI: N/A';
        coElement.textContent = 'CO: N/A';
        no2Element.textContent = 'NO2: N/A';
        o3Element.textContent = 'O3: N/A';
        pm10Element.textContent = 'PM10: N/A';
        pm25Element.textContent = 'PM2.5: N/A';
        so2Element.textContent = 'SO2: N/A';
    }
};

// Fetch Air Quality Data from API and update the widget
const fetchAirQuality = async () => {
    const url = `https://api.waqi.info/feed/geo:53.5458170;9.9746386/?token=${AIR_QUALITY_OPEN_DATA_PLATFORM_TOKEN}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(data)
        updateAirQualityWidget(data);
    } catch (error) {
        console.log(error.message);
        //if there is a problem, update with N/A values.
        updateAirQualityWidget({});
    }
};

// Fetch data initially and then set up the interval
fetchAirQuality();
setInterval(fetchAirQuality, 5000);
