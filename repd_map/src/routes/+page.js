export async function load({ fetch }) {
    try {
      const response = await fetch('/points.geojson');  // Place your GeoJSON in the static folder
      const geojson = await response.json();
      
      return {
        points: geojson.features
      };
    } catch (error) {
      console.error('Error loading GeoJSON:', error);
      return {
        points: []
      };
    }
  }