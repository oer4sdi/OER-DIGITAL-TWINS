import { CESIUM_ION_ACCESS_TOKEN } from './config.js';
// Access Token
Cesium.Ion.defaultAccessToken = CESIUM_ION_ACCESS_TOKEN;

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer('cesiumContainer', {
    globe: false,
    // skyAtmosphere: new Cesium.skyAtmosphere(),
    sceneModePicker: false,
    baseLayerPicker: false,
    // geocoder: Cesium.IonGeocodeProviderType.GOOGLE,
});

// Add Google Photorealistic 3D Tiles
try {
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
    viewer.scene.primitives.add(tileset)
} catch (error) {
    console.log(error)
}