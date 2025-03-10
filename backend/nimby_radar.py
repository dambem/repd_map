from funcs import repd_converter as repd
from funcs import scrape_and_analyse as scrape
import json
import time
import os 
import sys

if __name__ == "__main__":    
    print("Creating REPD Geojson")
    repd.repd_geojson_file()
    
    df = repd.get_repd_dataframe()
    nimby_radar = {}
    nimby_scores = []
    score = 0
    start_row = 40
    
    if os.path.exists("nimby_score.json"):
        with open("nimby_score.json", "r", encoding="utf-8") as f:
            try:
                for n in json.load(f):
                    nimby_scores.append(n)
            except json.JSONDecodeError:
                pass
    print(f'nimby scores {nimby_scores}')
    # sys.exit(1)
    for _, row in df.iloc[start_row:].iterrows():
        string = f"{row['Site Name']}, {row['Planning Authority']} "

        query_res = repd.search_query(string)

        if query_res:
            url = query_res[0]["link"] 
            mime = 'n/a'
            if query_res[0].get('mime'):
                mime = query_res[0]['mime']
            content = scrape.scrape_content(url, mime=mime)
            if content == None:
                next
            else:
                ai = scrape.gemini_process(content)
                new_text = ai.text.replace("json", "")
                new_text = new_text.replace("```", "")

                try:
                    object = json.loads(new_text)
                    ref_id = row['Ref ID']
                    object['refid'] = ref_id
                    object['article_url'] = url
                    nimby_scores.append(object)    
                except Exception as e:
                    print("failed to parse")
                    next

                with open("nimby_score.json", "w", encoding="utf-8") as f: 
                    json.dump(nimby_scores, f, ensure_ascii=False, indent=4)
                time.sleep(1)
        if score >= 20:
            break
        else:
            score += 1
            
