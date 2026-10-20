/**
 * 介面文字：md = 中語、tw = 台語。
 * 靜態文字用 data-i / data-i-ph / data-i-label 屬性對應；動態文字用 t(key, {n: ...})。
 */
window.I18N = {
  md: {
    'aria.uiLang': '介面語言', 'aria.theme': '佈景主題', 'aria.light': '淺色', 'aria.dark': '深色',
    'aria.toLight': '切換為淺色', 'aria.toDark': '切換為深色', 'aria.tabs': '功能分頁',
    'err.db': '字庫載入失敗，請重新整理頁面。',
    'hero.pat': '給特教與台語老師的教學工具',
    'hero.title': '文本分析助手',
    'hero.sub': '貼上教材文本，看每個字有多常見，也找出超出常用字範圍的字。',
    'counter.title': '造訪人次', 'counter.aria': '造訪人次 {n}', 'counter.none': '暫時無法顯示造訪人次',
    'tab.analysis': '文本分析', 'tab.prompt': '提示詞產生器', 'tab.exam': '識字量測驗',

    'limit.label': '常用字上限',
    'limit.hint': '只用字頻排名前幾名的字（1–5021）。超出的字會在原文標紅，也會寫進提示詞。字庫實際收錄 {n} 字，不在字庫內的字視為超出。',
    'limit.err': '請輸入 1–5021 的整數',

    'input.label': '貼上或輸入要分析的文本',
    'input.ph': '例如：小明今天在校園裡發現一隻蟋蟀……',
    'input.count': '已輸入 {n} 字', 'input.clear': '清除', 'input.start': '開始分析',
    'input.empty': '請先輸入文本', 'input.noHan': '文本中沒有找到漢字，請確認內容。',

    'res.title': '文本分析結果', 'res.again': '重新分析', 'res.excel': '下載 Excel',
    'sum.total': '總字數', 'sum.unique': '相異字數', 'sum.cover': '前 1000 字涵蓋率', 'sum.over': '超出上限的字數',
    'unit.char': '字', 'sum.overKinds': '字（共 {n} 種）',

    'band.title': '分段字頻', 'band.sub': '依字頻排名區間分組。點選任一列，展開該區間的字卡。',
    'band.colRange': '排名區間', 'band.colBar': '佔全文比例（刻度 0–60%）', 'band.colCount': '字數', 'band.colPct': '百分比',
    'band.over': '超出 5021', 'band.panelNote': '此區間共 {k} 種字，出現 {n} 次', 'band.count': '{n} 字',
    'tier.1': '前 500', 'tier.2': '前 1000', 'tier.3': '其餘', 'tier.4': '超出 5021',
    'cards.title': '字卡', 'cards.note': '角標＝出現次數',
    'src.title': '原文標色檢視', 'src.red': '紅字', 'src.legend': '超出上限的字',

    'adv.title': '進階', 'adv.sub': '完整區間統計、詳細字頻清單、台語推薦用字',
    'adv.bands': '區間統計（完整欄位）', 'adv.chars': '詳細字頻清單', 'adv.tw': '原文中的台語推薦用字（詞）⭐',
    'th.range': '字距範圍', 'th.C': '總字數(C)', 'th.D': '相異字數(D)', 'th.E': '總字數比(E)', 'th.F': '總字數累積(F)',
    'th.G': '相異字數比(G)', 'th.H': '相異累積比(H)', 'th.words': '字庫文字',
    'th.char': '字', 'th.count': '出現次數', 'th.rank': '5021 排名',
    'th.word': '詞', 'th.reading': '讀音', 'th.mandarin': '對應華語',
    'tw.none': '原文中沒有出現台語推薦用字（詞）。',
    'adv.over': '超出排名／未收錄',

    'prompt.settings': '設定', 'prompt.lang': '目標語言', 'prompt.langTw': '台語', 'prompt.langMd': '中語',
    'prompt.len': '目標長度', 'prompt.lenNone': '不調整',
    'prompt.lenHint': '改寫後約為原文長度的 {p}%', 'prompt.lenHintN': '（約 {n} 字）', 'prompt.lenHintNone': '改寫後長度與原文相近',
    'prompt.limitEdit': '到文本分析修改',
    'prompt.preview': '提示詞預覽', 'prompt.copy': '複製提示詞', 'prompt.copied': '已複製', 'prompt.copyFail': '複製失敗，請手動選取文字複製。',
    'prompt.pasteBack': 'AI 改寫完成後，把文章貼回本站再分析一次',
    'prompt.goAi': '複製後，到你慣用的 AI 貼上',

    'exam.soon': '自編識字量估計測驗即將開放。',
    'foot.rights': '版權所有',
    'xl.summary': '統計總結', 'xl.bands': '區間分佈分析', 'xl.chars': '詳細字頻清單', 'xl.tw': '台語推薦用字',
    'xl.item': '項目', 'xl.value': '數值', 'xl.time': '分析時間', 'xl.limit': '常用字上限',
  },
  tw: {
    'aria.uiLang': '介面語言', 'aria.theme': '佈景主題', 'aria.light': '光色', 'aria.dark': '暗色',
    'aria.toLight': '換做光色', 'aria.toDark': '換做暗色', 'aria.tabs': '功能分頁',
    'err.db': '字庫載入失敗，請重新整理頁面。',
    'hero.pat': '予特教佮台語老師的教學工具',
    'hero.title': '文本分析助手',
    'hero.sub': '共教材文本貼起來，看逐个字外捷出現，嘛揣出超過捷用字範圍的字。',
    'counter.title': '來訪人次', 'counter.aria': '來訪人次 {n}', 'counter.none': '這馬無法度顯示來訪人次',
    'tab.analysis': '文本分析', 'tab.prompt': '提示詞產生器', 'tab.exam': '識字量測驗',

    'limit.label': '捷用字上限',
    'limit.hint': '干焦用字頻排名頭前幾名的字（1–5021）。超過的字會佇原文標紅，嘛會寫入去提示詞。字庫實際收 {n} 字，無佇字庫內底的字算做超過。',
    'limit.err': '請輸入 1–5021 的整數',

    'input.label': '共欲分析的文本貼抑是拍佇遮',
    'input.ph': '比論講：小明今仔日佇校園內底看著一隻蟋蟀……',
    'input.count': '已經拍 {n} 字', 'input.clear': '清掉', 'input.start': '開始分析',
    'input.empty': '請先輸入文本', 'input.noHan': '文本內底揣無漢字，請確認內容。',

    'res.title': '文本分析結果', 'res.again': '重新分析', 'res.excel': '下載 Excel',
    'sum.total': '總字數', 'sum.unique': '相異字數', 'sum.cover': '頭前 1000 字涵蓋率', 'sum.over': '超過上限的字數',
    'unit.char': '字', 'sum.overKinds': '字（共 {n} 種）',

    'band.title': '分段字頻', 'band.sub': '照字頻排名區間分組。點任何一列，展開彼个區間的字卡。',
    'band.colRange': '排名區間', 'band.colBar': '佔全文比例（刻度 0–60%）', 'band.colCount': '字數', 'band.colPct': '百分比',
    'band.over': '超過 5021', 'band.panelNote': '這个區間總共 {k} 種字，出現 {n} 擺', 'band.count': '{n} 字',
    'tier.1': '頭前 500', 'tier.2': '頭前 1000', 'tier.3': '其他', 'tier.4': '超過 5021',
    'cards.title': '字卡', 'cards.note': '角標＝出現幾擺',
    'src.title': '原文標色檢視', 'src.red': '紅字', 'src.legend': '超過上限的字',

    'adv.title': '進階', 'adv.sub': '完整區間統計、詳細字頻清單、台語推薦用字',
    'adv.bands': '區間統計（完整欄位）', 'adv.chars': '詳細字頻清單', 'adv.tw': '原文內底的台語推薦用字（詞）⭐',
    'th.range': '字距範圍', 'th.C': '總字數(C)', 'th.D': '相異字數(D)', 'th.E': '總字數比(E)', 'th.F': '總字數累積(F)',
    'th.G': '相異字數比(G)', 'th.H': '相異累積比(H)', 'th.words': '字庫文字',
    'th.char': '字', 'th.count': '出現幾擺', 'th.rank': '5021 排名',
    'th.word': '詞', 'th.reading': '讀音', 'th.mandarin': '對應華語',
    'tw.none': '原文內底無出現台語推薦用字（詞）。',
    'adv.over': '超過排名／無收錄',

    'prompt.settings': '設定', 'prompt.lang': '目標語言', 'prompt.langTw': '台語', 'prompt.langMd': '中語',
    'prompt.len': '目標長度', 'prompt.lenNone': '無調整',
    'prompt.lenHint': '改寫了後大約是原文長度的 {p}%', 'prompt.lenHintN': '（約 {n} 字）', 'prompt.lenHintNone': '改寫了後的長度佮原文差不多',
    'prompt.limitEdit': '去文本分析修改',
    'prompt.preview': '提示詞預覽', 'prompt.copy': '複製提示詞', 'prompt.copied': '已經複製', 'prompt.copyFail': '複製失敗，請家己選取文字複製。',
    'prompt.pasteBack': 'AI 改寫好了後，共文章貼轉來本站閣分析一遍',
    'prompt.goAi': '複製了後，去你慣勢用的 AI 貼起去',

    'exam.soon': '自編識字量估計測驗就欲開放。',
    'foot.rights': '版權所有',
    'xl.summary': '統計總結', 'xl.bands': '區間分佈分析', 'xl.chars': '詳細字頻清單', 'xl.tw': '台語推薦用字',
    'xl.item': '項目', 'xl.value': '數值', 'xl.time': '分析時間', 'xl.limit': '捷用字上限',
  },
};
