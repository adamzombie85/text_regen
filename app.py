import os
import json
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=os.path.join(BASE_DIR, 'public'))
CORS(app)

# --- Configuration ---
DAILY_LIMIT = 50
USAGE_FILE = os.path.join(BASE_DIR, 'data/usage.json')
# API Key should be set in environment variable GEMINI_API_KEY
# or placed in a file named 'api_key.txt'
API_KEY = os.environ.get('GEMINI_API_KEY', '')
if not API_KEY:
    key_file = os.path.join(BASE_DIR, 'api_key.txt')
    if os.path.exists(key_file):
        with open(key_file, 'r') as f:
            API_KEY = f.read().strip()

if API_KEY:
    genai.configure(api_key=API_KEY)

# --- Helper Functions ---
def get_usage():
    if not os.path.exists(USAGE_FILE):
        return {"date": str(datetime.date.today()), "count": 0}
    
    with open(USAGE_FILE, 'r') as f:
        usage = json.load(f)
        
    if usage.get("date") != str(datetime.date.today()):
        usage = {"date": str(datetime.date.today()), "count": 0}
        save_usage(usage)
        
    return usage

def save_usage(usage):
    os.makedirs('data', exist_ok=True)
    with open(USAGE_FILE, 'w') as f:
        json.dump(usage, f)

# --- Routes ---
import os
import json
import datetime

STATS_FILE = 'data/stats.json'

def load_stats():
    if not os.path.exists(STATS_FILE):
        return {"visitors": 0, "history": []}
    with open(STATS_FILE, 'r') as f:
        return json.load(f)

def save_stats(stats):
    with open(STATS_FILE, 'w') as f:
        json.dump(stats, f)

@app.route('/')
def index():
    stats = load_stats()
    stats['visitors'] += 1
    save_stats(stats)
    return send_from_directory('public', 'index.html')

@app.route('/api/stats')
def get_stats():
    return jsonify(load_stats())

@app.route('/api/log_analysis', methods=['POST'])
def log_analysis():
    data = request.json
    text_preview = data.get('preview', '')[:15] + '...'
    word_count = data.get('count', 0)
    
    stats = load_stats()
    stats['history'].insert(0, {
        "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "preview": text_preview,
        "count": word_count
    })
    # Keep only last 50 records
    stats['history'] = stats['history'][:50]
    save_stats(stats)
    return jsonify({"status": "ok"})

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('public', path)

@app.route('/api/quota', methods=['GET'])
def quota():
    usage = get_usage()
    return jsonify({
        "remaining": max(0, DAILY_LIMIT - usage['count']),
        "limit": DAILY_LIMIT
    })

@app.route('/api/generate', methods=['POST'])
def generate():
    if not API_KEY:
        return jsonify({"error": "API Key not configured on server."}), 500
        
    usage = get_usage()
    if usage['count'] >= DAILY_LIMIT:
        return jsonify({"error": "今日 API 額度已用完，請明天再試。"}), 429
    
    data = request.json
    text = data.get('text', '')
    lang = data.get('lang', 'tw')
    freq_limit = data.get('freq_limit', 3000)
    word_count = data.get('word_count', 100)
    
    lang_name = "台語 (Taiwanese)" if lang == 'tw' else "中語 (Mandarin)"
    
    # Prompt Construction
    system_prompt = f"""
你是一位專業的語文教學助理。你的任務是將給定的文章「改寫」成更簡單的版本。
重要規則：
1. **絕對禁止跨語言翻譯**：
   - 如果目標語言是 {lang_name}，請確保輸出的文本「完全」使用 {lang_name}。
   - 不要將台語原文翻譯成中語，也不要將中語原文翻譯成台語。
2. **長度控制**：請將改寫後的內容控制在約 {word_count} 字左右。
3. **難度控制**：儘量使用基礎詞彙（目標是讓初學者能讀懂）。
4. **格式要求**：只輸出改寫後的文本內容，不要有任何解釋或開場白。

如果是台語 (Taiwanese) 改寫，請務必遵循以下「教育部權威語法邏輯」：
- **句型轉換**：
  * **「共 (kā)」字句**：代換中語的「把」字句。例：『共門開開』。
  * **「予 (hōo)」字句**：代換中語的「被」、「讓」、「叫」。例：『予老師呵咾』。
  * **賓語提前與動結式**：強調處置感。例：『食飯飽矣』、『車騎咧』。
- **時態與助詞**：
  * **正在/進行**：使用『當咧 (tòng-leh)』或『咧』，嚴禁使用『正』或『著』。例：『伊當咧看冊』。
  * **完成**：使用『矣 (ah)』，嚴禁使用『了』。例：『食飯飽矣』。
- **否定系統**：
  * 『毋』(m̄)：否定意願或本質（不要、不是）。
  * 『無』(bô)：否定事實或擁有（沒有）。
  * 『袂曉』(bē-hiáu) 或 『袂』：否定能力或可能（不會、不能）。例：『袂曉寫』。
  * 『未』(buē)：否定已經發生（尚未）。
- **地道詞彙代換 (參考《台語心花開》)**：
  * 動作：代換『攪拌』為『抐 (lā)』或『攪 (kiáu)』；代換『沾』為『搵 (ùn)』。
  * 心情：代換『煩躁』為『齷齪 (ak-tsak)』；代換『生氣』為『起毛䆀』或『受氣』。
  * 狀態：代換『解決/抒解』為『消敨 (siau-tháu)』；代換『漂亮』為『媠噹噹』。
  * 物品：代換『衣服』為『衫仔褲』；代換『廁所』為『便所』。
- **用字與識字難度限制**：
  * **用字標準**：優先使用『教育部 700 個台語推薦用字』來表達，確保台語漢字書寫的規範性。
  * **難度門檻**：全篇所選用的漢字，其難度（字頻）不得超過『中語字頻前 {freq_limit} 名』，以適配學生的識字量。
  * **嚴禁**：不得使用超出頻率範圍的生僻字。
- **時態與虛詞**：
  * **正在**：優先使用『當咧 (tòng-leh)』。
  * **完成**：使用『矣 (ah)』。
  * **程度**：使用『傷 (siunn)』表示過度；使用『誠』、『真』表示正面程度。
- **漢字標準**：必須完全遵循教育部「臺灣台語常用詞辭典」。

請根據以上規則改寫以下原文：
{text}
"""

    try:
        # Using the exact stable model names available in your environment
        model_name = 'gemini-flash-latest'
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(system_prompt)
        except Exception:
            # Fallback to the latest pro model
            model = genai.GenerativeModel('gemini-pro-latest')
            response = model.generate_content(system_prompt)
            
        new_text = response.text
        
        # Update usage
        usage['count'] += 1
        save_usage(usage)
        
        return jsonify({
            "text": new_text,
            "remaining": DAILY_LIMIT - usage['count']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # For local development
    app.run(port=5001, debug=True)
