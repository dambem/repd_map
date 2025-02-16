import json
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()
api_key= os.getenv("GEMINI_API_KEY")

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

generation_config = {
  "temperature": 1,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192,
  "response_mime_type": "text/plain",
}


def scrape_content(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        soup = BeautifulSoup(response.content, "html.parser")
        # Example: Extract all text from <p> tags
        paragraphs = soup.find_all("p")
        text = " ".join(p.get_text() for p in paragraphs)
        return text.strip()
    except requests.exceptions.RequestException as e:
        print(f"Error scraping {url}: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occured when scraping {url}: {e}")
        return None
    

def gemini_process(content):
    model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=generation_config,
    )
    
    print("Sending Content To Gemini")
    chat_session = model.start_chat(
    history=[      {
            "role": "user",  # or "model" if it was a prior model response
            "parts": [
                "You are a NIMBY radar. Return all messages with a JSON string. The header should be a short summary, similar to a POKEDEX style. The JSON object should also contain the following: Nimby Score (out of 100), a evaluation of how likely this project has been destroyed by NIMBYs, Valid - Score out of 100 of how valid it is, Petty - how petty the reasons are, Organized - How organised the set up was and a Tory/Green party score, 0 being tory and 100 being green party."
            ]
        }])
    response = chat_session.send_message(content)
    return response

def parse_json_string(json_string):
    cleaned_string = json_string.replace("```json", "").replace("```", "")
    cleaned_string = cleaned_string.replace("\\n", "\n")
    try:
        json_object = json.loads(cleaned_string)
        return json_object
    except json.JSONDecodeError as e:
        return f"Error parsing JSON: {str(e)}"

content = scrape_content('https://www.hampshirechronicle.co.uk/news/20076213.controversial-solar-farm-plan-godsfield-near-alresford-withdrawn-developers/')
ai = gemini_process(content)

with open('nimby_score.json', "w", encoding="utf-8") as f:
    json.dump(parse_json_string(ai.text), f, ensure_ascii=False, indent=4)
    
# print(ai.text)