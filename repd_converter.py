import pandas as pd 
from pyproj import Transformer
import json
from datetime import datetime
from bs4 import BeautifulSoup
# from newspaper import Article  # For article extraction and summarization
import requests
import time
transformer = Transformer.from_crs("EPSG:27700", "EPSG:4326")

def convert_coordinates(df, easting_col='easting', northing_col='northing'):
    lat, lon = transformer.transform(df[easting_col].values, df[northing_col].values)
    df['latitude'] = lat
    df['longitude'] = lon
    return df


def search_news(site_name, cancelled=True):
    """Searches for news articles related to a renewable energy site."""

    query = f"{site_name} renewable energy"  # Basic search query
    if cancelled:
      query += " cancelled"

    # search_url = f"https://www.googleapis.com/customsearch/v1?q={query}&cx=YOUR_CSE_ID&key={YOUR_API_KEY}" # Replace with your CSE ID and API key
    search_url = f"https://www.google.com/search?q={query}"

    headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0'
    }
    response = requests.get(search_url, headers=headers)
    soup = BeautifulSoup(response.text, "html.parser")
    print(soup)
    links = []
    for a_tag in soup.find_all('a'):
        href = a_tag.get('href')
        if href and href.startswith("http"): # Filter out relative links
            links.append(href)
    time.sleep(0.1)
    return links[:5] # Return top 5 links


def create_geojson(df):
    features = []
    for _, row in df.iterrows():
        # links = search_news(row['Site Name'])
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(row['longitude']), float(row['latitude'])]
            },
            "properties": row.drop(['latitude', 'longitude']).to_dict(),
            # "links": links
        }        
        features.append(feature)
    return {
        "type": "FeatureCollection",
        "features": features
    }
def get_capacity_value(value):
    if pd.isna(value) or value == '':
        return 0
    try:
        num_value = float(value)
        return num_value
    except (ValueError, TypeError):
        return 0

if __name__ == "__main__":    
    df = pd.read_csv('repdoct.csv', encoding='cp1252')
    df = df[df['Development Status (short)'].isin(['Application Refused', 'Abandoned', 'Application Withdrawn', 'Appeal Refused'])]
    print(df)
    df['Planning Application Submitted'] = pd.to_datetime(df['Planning Application Submitted'], format='%d/%m/%Y')
    df = df[df['Planning Application Submitted'] >= pd.Timestamp('2020-01-01')]
    print(df)
    df['Planning Application Submitted'] = df['Planning Application Submitted'].dt.strftime('%Y-%m-%d')
    # df = pd.DataFrame(data)
    # df[df["Installed Capacity (MWelec)"]
    df['Installed Capacity (MWelec)'] = df['Installed Capacity (MWelec)'].apply(get_capacity_value)
    print(df["Installed Capacity (MWelec)"].sum())
    df = convert_coordinates(df, easting_col='X-coordinate', northing_col='Y-coordinate')
    print(df)
    df = df[['Site Name', 'Operator (or Applicant)', 'Technology Type', 'Planning Authority', 'Planning Application Submitted']]
    df.to_csv("potential_sites.csv")
    geojson = create_geojson(df)

    with open('points_2.geojson', 'w') as f:
        json.dump(geojson, f, indent=2)

    # print("\nGeoJSON output:")
    # print(json.dumps(geojson, indent=2))

