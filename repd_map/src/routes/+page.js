export async function load({ fetch }) {
    try {
      const response = await fetch('/points.geojson');  // Place your GeoJSON in the static folder
      const nimby_r = await fetch('/nimby_score.json');  // Place your GeoJSON in the static folder

      const geojson = await response.json();
      const nimby_score = await nimby_r.json();
      
      return {
        points: geojson.features,
        nimby_score: nimby_score
      };
    } catch (error) {
      console.error('Error loading GeoJSON:', error);
      return {
        points: []
      };
    }
  }