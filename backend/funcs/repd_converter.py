import pandas as pd 
from pyproj import Transformer
import json
from datetime import datetime
from bs4 import BeautifulSoup
# from newspaper import Article  # For article extraction and summarization
import requests
import time
transformer = Transformer.from_crs("EPSG:27700", "EPSG:4326")
import requests
import os
from dotenv import load_dotenv
load_dotenv()
API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")
CSE_ID = os.getenv("GOOGLE_CSE_ID")


def google_search(query, api_key, cse_id, num_results=5):
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": api_key,
        "cx": cse_id,
        "q": query,
        "num": min(num_results, 5),  # Limit to 100 results per request
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        print(data)
        return data.get("items", [])
    except requests.exceptions.RequestException as e:
        print(f"Error during search: {e}")
        return None
    except KeyError:
        print("Error: Invalid API response format.")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None

    
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

def get_repd_dataframe(date='2021-01-01'):
    df = pd.read_csv('data/repdoct.csv', encoding='cp1252')
    df = df[df['Development Status (short)'].isin(['Application Refused', 'Abandoned', 'Application Withdrawn', 'Appeal Refused'])]
    df['Planning Application Submitted'] = pd.to_datetime(df['Planning Application Submitted'], format='%d/%m/%Y')
    df = df[df['Planning Application Submitted'] >= pd.Timestamp(date)]
    df['Installed Capacity (MWelec)'] = df['Installed Capacity (MWelec)'].apply(get_capacity_value)
    df = convert_coordinates(df, easting_col='X-coordinate', northing_col='Y-coordinate')
    # df = df[['Site Name', 'Operator (or Applicant)', 'Technology Type', 'Planning Authority', 'Planning Application Submitted']]
    df['Planning Application Submitted'] = df['Planning Application Submitted'].dt.strftime('%Y-%m-%d')
    df = df.fillna(0)
    return df


def repd_geojson_file():
    df = get_repd_dataframe()
    geojson = create_geojson(df)
    with open('points.geojson', 'w') as f:
        json.dump(geojson, f, indent=2)

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

def search_query(query):
    try:
        results = google_search(query, API_KEY, CSE_ID, num_results=1)
        return(results)
    except Exception as e:
        return False

