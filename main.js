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
    viewer.scene.primitives.add(tileset)
} catch (error) {
    console.log(error)
}

// Fetch Air Quality Data from API at 5 seconds intervals
const fetchAirQuality = async () => {
    const url = `https://api.waqi.info/feed/geo:53.5458170;9.9746386/?token=${AIR_QUALITY_OPEN_DATA_PLATFORM_TOKEN}`;
    console.log(url)
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(data)
    } catch (error) {
        console.log(error.message);
    }
};
setInterval(fetchAirQuality, 5000);
