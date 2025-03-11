import { CESIUM_ION_ACCESS_TOKEN, AIR_QUALITY_OPEN_DATA_PLATFORM_TOKEN } from './config.js';

// Access Token
Cesium.Ion.defaultAccessToken = CESIUM_ION_ACCESS_TOKEN;

// Default Coordinates for initial air quality data fetch
let DEFAULT_LATITUDE = 53.5542627;
let DEFAULT_LONGITUDE = 9.9949553;

// Variable to store the current coordinates for air quality data fetching
let currentLat = DEFAULT_LATITUDE;
let currentLon = DEFAULT_LONGITUDE;

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer('cesiumContainer', {
    sceneModePicker: false,
    baseLayerPicker: false,
});

viewer.scene.globe.show = false;

// Set the camera to focus on Hamburg
viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(DEFAULT_LONGITUDE, DEFAULT_LATITUDE, 500),
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

// get the coordinates of mouse click position
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction((movement) => {
    const pickedPosition = viewer.scene.pickPosition(movement.position);
    
    if (Cesium.defined(pickedPosition)) {
        const cartographic = Cesium.Cartographic.fromCartesian(pickedPosition);
        if (Cesium.defined(cartographic)) {
            const lat = Cesium.Math.toDegrees(cartographic.latitude);
            const lon = Cesium.Math.toDegrees(cartographic.longitude);

            // update current coordinates
            currentLat = lat;
            currentLon = lon;
            
            fetchAirQuality(lat, lon)
        }
    }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK)

// --- Air Quality Data Handling ---
let sensorMarker;

// Helper Function to determine color based on AQI
const getColorFromAQI = (aqi) => {
    if (aqi <= 50) {
        return Cesium.Color.GREEN;
    } else if (aqi <= 100) {
        return Cesium.Color.YELLOW;
    } else if (aqi <= 150) {
        return Cesium.Color.ORANGE;
    } else if (aqi <= 200) {
        return Cesium.Color.RED;
    } else if (aqi <= 300) {
        return Cesium.Color.PURPLE;
    } else {
        return Cesium.Color.MAROON;
    }
};

// Helper Function to determine size based on AQI
const getSizeFromAQI = (aqi) => {
    if (aqi <= 50) {
        return 5;
    } else if (aqi <= 100) {
        return 7.5;
    } else if (aqi <= 150) {
        return 10;
    } else if (aqi <= 200) {
        return 12.5;
    } else if (aqi <= 300) {
        return 15;
    } else {
        return 20;
    }
};

const updateAirQualityWidget = (data) => {
    if (data.status === 'ok' && data.data) {
        const { aqi, iaqi, city, time } = data.data;
        const [ lat, lon ] = city.geo;
        const color = getColorFromAQI(aqi);
        const size = getSizeFromAQI(aqi);

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

        //Add or update the marker
        if (sensorMarker) {
            viewer.entities.remove(sensorMarker);
        }

        sensorMarker = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lon, lat,50),
            point: {
                pixelSize: 20,
                color: color,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
            },
            label: {
                text: `Air Quality Sensor`,
                font: '14px sans-serif',
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                verticalOrigin: Cesium.VerticalOrigin.BASELINE,
                fillColor: Cesium.Color.GHOSTWHITE,
                showBackground: true,
                backgroundColor: Cesium.Color.DARKSLATEGREY.withAlpha(0.8),
                backgroundPadding: new Cesium.Cartesian2(8, 4),
                pixelOffset: new Cesium.Cartesian2(15, 6),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
            }
        });
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
const fetchAirQuality = async (latitude, longitude) => {
    const url = `https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=${AIR_QUALITY_OPEN_DATA_PLATFORM_TOKEN}`;
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
fetchAirQuality(currentLat, currentLon);
setInterval(() => fetchAirQuality(currentLat, currentLon), 5000);
