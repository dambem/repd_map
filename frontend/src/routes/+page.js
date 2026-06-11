const SOURCES = {
  geojson: '/points.geojson',
  nimby_score: '/nimby_score.json',
  refused: '/df_refused.json',
  withdrawn: '/df_withdrawn.json',
  a_refused: '/df_a_refused.json',
  final_stats: '/final.json',
  councils: '/councils.json',
};

export async function load({ fetch }) {
  try {
    const entries = await Promise.all(
      Object.entries(SOURCES).map(async ([key, url]) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url} → ${response.status}`);
        return [key, await response.json()];
      }),
    );
    const data = Object.fromEntries(entries);

    return {
      points: data.geojson.features,
      nimby_score: data.nimby_score,
      refused: data.refused,
      a_refused: data.a_refused,
      withdrawn: data.withdrawn,
      final_stats: data.final_stats,
      council: data.councils,
    };
  } catch (error) {
    console.error('Error loading map data:', error);
    return { points: [], nimby_score: [], refused: [], a_refused: [], withdrawn: [], final_stats: [], council: {} };
  }
}
