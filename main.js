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

const scene = viewer.scene;

//  Cesium World Terrain
let worldTerrain;
try {
  worldTerrain = await Cesium.createWorldTerrainAsync();
} catch (error) {
  console.log(`There was an error creating world terrain. ${error}`);
}

// Add Google Photorealistic 3D Tiles
let world3DTileset;
try {
    world3DTileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
    scene.primitives.add(world3DTileset);
} catch (error) {
    console.log(error);
}

scene.globe.show = false;

// OSM LOD2 buildings
let osmBuildings;
try {
    osmBuildings = await Cesium.createOsmBuildingsAsync();
    scene.primitives.add(osmBuildings);
    osmBuildings.show = false;
} catch (error) {
    console.log("Error loading OSM buildings:", error);
}

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

// Toggle between Cesium global terrain and Google 3D Tileset
const mapStyleSelect = document.getElementById('mapStyleSelect');

mapStyleSelect.addEventListener('change', () => {
    const selectedValue = mapStyleSelect.value;

    if (selectedValue === 'terrain') {
        // Show Cesium World Terrain and the OSM buildings
        scene.globe.show = true;
        scene.terrainProvider = worldTerrain;
        world3DTileset.show = false;
        osmBuildings.show = true;

    } else if (selectedValue === '3dtiles') {
        // Show Google 3D Tiles and remove OSM buildings
        scene.globe.show = false;
        scene.terrainProvider = undefined;
        world3DTileset.show = true;
        osmBuildings.show = false;

    }
});

// Functions to style OSM Buildings based on Different Criteria
function highlightAllResidentialBuildings() {
    osmBuildings.style = new Cesium.Cesium3DTileStyle({
      color: {
        conditions: [
          [
            "${feature['building']} === 'apartments' || ${feature['building']} === 'residential'",
            "color('cyan', 0.9)",
          ],
          [true, "color('white')"],
        ],
      },
    });
}

function showByBuildingType(buildingType) {
    switch (buildingType) {
      case "office":
        osmBuildings.style = new Cesium.Cesium3DTileStyle({
          show: "${feature['building']} === 'office'",
        });
        break;
      case "apartments":
        osmBuildings.style = new Cesium.Cesium3DTileStyle({
          show: "${feature['building']} === 'apartments'",
        });
        break;
      default:
        break;
    }
}

// Color the buildings based on their distance from the highlighted location
function colorByDistanceToCoordinate(pickedLatitude, pickedLongitude) {
    osmBuildings.style = new Cesium.Cesium3DTileStyle({
      defines: {
        distance: `distance(vec2(\${feature['cesium#longitude']}, \${feature['cesium#latitude']}), vec2(${pickedLongitude},${pickedLatitude}))`,
      },
      color: {
        conditions: [
          ["${distance} > 0.014", "color('blue')"],
          ["${distance} > 0.010", "color('green')"],
          ["${distance} > 0.006", "color('yellow')"],
          ["${distance} > 0.0001", "color('red')"],
          ["true", "color('white')"],
        ],
      },
    });
  }

// Call the styling functions depending on the selected OSM buildings style
const osmStyleSelect = document.getElementById('osmStyleSelect');
osmStyleSelect.addEventListener('change', () => {
    const selectedValue = osmStyleSelect.value;
    if (selectedValue === 'residential') {
        highlightAllResidentialBuildings()
    } else if (selectedValue === 'officeBuildings') {
        showByBuildingType("office");
    } else if (selectedValue === 'apartmentBuildings') {
        showByBuildingType("apartments");
    } else if (selectedValue === 'distance') {
        colorByDistanceToCoordinate(53.564869, 9.969486);
    }
});



// Air quality widget
const airQualityWidget = document.getElementById('airQualityWidget');

// Get individual elements for the air quality parameters
const stationName = document.getElementById('stationName');
const measurementTime = document.getElementById('measurementTime');
const aqiElement = document.getElementById('aqiElement');
const coElement = document.getElementById('coElement');
const no2Element = document.getElementById('no2Element');
const o3Element = document.getElementById('o3Element');
const pm10Element = document.getElementById('pm10Element');
const pm25Element = document.getElementById('pm25Element');
const so2Element = document.getElementById('so2Element');

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
        // console.log(data)
        updateAirQualityWidget(data);
    } catch (error) {
        console.log(error.message);
        //if there is a problem, update with N/A values.
        updateAirQualityWidget({});
    }
};


// Inserting a proposed building into the 3D Scene
// Highlight the target area for development
const targetHighlight = new Cesium.Entity({
    polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(
            [
                [9.968901256397512, 53.56551794813478],
                [9.969287519385556, 53.56556601391285],
                [9.969705827131326, 53.565558689097514],
                [9.969984964265247, 53.56546845874044],
                [9.96979432612361, 53.564577549435015],
                [9.968641828371895, 53.564839696184],
                [9.968695537941766, 53.565328962353256]
            ].flat(2),
        ),
        material: Cesium.Color.YELLOW.withAlpha(0.6),
        classificationType: Cesium.ClassificationType.CESIUM_3D_TILE
    },
});
viewer.entities.add(targetHighlight);

// Add tileset of proposed new building
let buildingTileset;
try {
    buildingTileset = await Cesium.Cesium3DTileset.fromIonAssetId(3225663);
    viewer.scene.primitives.add(buildingTileset);
} catch (error) {
    console.log(error);
}

// Toggle Button to show or hide highlighted area
const highlightAreaToggleButton = document.getElementById('targetHighlightToggle');
highlightAreaToggleButton.addEventListener('change', () => {
    if (highlightAreaToggleButton.checked) {
        viewer.entities.add(targetHighlight);
    } else {
        viewer.entities.remove(targetHighlight);
    }
});

// Toggle button to show or hide proposed building
const showBuildingToggleButton = document.getElementById('proposedBuildingToggle');
showBuildingToggleButton.addEventListener('change', () => {
    buildingTileset.show = showBuildingToggleButton.checked;
})


// Fetch data initially and then set up the interval
fetchAirQuality(currentLat, currentLon);
setInterval(() => fetchAirQuality(currentLat, currentLon), 300000);
