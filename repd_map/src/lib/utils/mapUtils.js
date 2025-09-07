// mapUtils.js
export async function addMarkerLayer(map) {
    map.addLayer({
        id: 'places',
        type: 'symbol',
        source: 'points',
        layout: {
            'icon-image': 'triangle',
            'icon-size': 2,
            'icon-allow-overlap': true,
            'icon-padding': 2
        },
        'paint': {
            'icon-color': '#8B4513',
            'icon-halo-color': '#FFFFFF',
            'icon-halo-width': 2,
        }
    });
}

export async function addLocalAuthoritiesSource(map, geojsonData) {
    map.addSource('local-authorities',  {
        type: 'geojson',
        data: geojsonData
    });
}

export async function addLocalAuthoritiesLayer(map) {
    map.addLayer({
        'id': 'local-authorities-layer',
        'source': 'local-authorities',
        'type':'fill',
        'paint': {
            'fill-outline-color': 'white',
            'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                0.5
            ],
            'fill-color':'#fbb03b',
        }
    });
}

export async function addRenewableProjectsSource(map, geojsonData) {
    map.addSource('points', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: points
        }
    });
}