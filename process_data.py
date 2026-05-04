import csv
import json
from dbfread import DBF
import os

def process_taiwanese():
    tw_data = []
    try:
        with open('台語推薦用字700.csv', mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                tw_data.append({
                    'word': row['建議用字'],
                    'reading': row['音讀'],
                    'mandarin': row['對應中語'],
                    'rank': int(row['編號']) if row['編號'].isdigit() else 999
                })
    except Exception as e:
        print(f"Error processing Taiwanese CSV: {e}")
    return tw_data

def process_mandarin():
    md_data = []
    try:
        # Try cp950 (Standard Traditional Chinese for DBF in Taiwan)
        table = DBF('SHREST1.DBF', encoding='cp950', char_decode_errors='ignore')
        for record in table:
            word = record['DWORD'].strip()
            if word:
                md_data.append({
                    'word': word,
                    'rank': int(record['NO']),
                    'percent': float(record['PERCENT']),
                    'cumulative': float(record['TPERCENT'])
                })
    except Exception as e:
        print(f"Error processing Mandarin DBF: {e}")
    return md_data

def main():
    print("Processing data files...")
    tw = process_taiwanese()
    md = process_mandarin()
    
    output = {
        'taiwanese': tw,
        'mandarin': md
    }
    
    os.makedirs('public/data', exist_ok=True)
    with open('public/data/word_db.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully processed {len(tw)} Taiwanese words and {len(md)} Mandarin words.")

if __name__ == "__main__":
    main()
