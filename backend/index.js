// try to load runtime dependencies and show friendly message if missing
let express, cors, axios, dotenv;
try {
  express = require('express');
  cors = require('cors');
  axios = require('axios');
  dotenv = require('dotenv');
} catch (err) {
  console.error('\nMissing Node.js dependencies for backend.');
  console.error('Please run the following in the backend folder:');
  console.error('  cd d:\\Project\\NHAT-ITSS\\backend');
  console.error('  npm install\n');
  console.error('Detailed error:', err.message);
  // exit with non-zero so nodemon reports graceful stop
  process.exit(1);
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

app.use(cors());
app.use(express.json());

function sanitizeText(input = '') {
  let normalized = String(input).trim();
  try {
    normalized = normalized.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, '');
  } catch (err) {
    normalized = normalized.replace(/[\u{1F300}-\u{1FAFF}]/gu, '');
  }
  normalized = normalized
    .replace(/[\r\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ');
  return normalized;
}

function splitSentences(text) {
  return text
    .split(/(?:。|！|!|\?|？)+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseGeminiJson(raw) {
  if (typeof raw !== 'string') return null;
  let trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```(?:json|JSON)?\s*/u, '');
    trimmed = trimmed.replace(/```$/u, '').trim();
  }
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    return null;
  }
}

const TYPE_LABELS = {
  '命令文': 'Câu mệnh lệnh',
  '疑問文': 'Câu nghi vấn',
  '肯定文': 'Câu khẳng định'
};

function resolveTypeLabel(type) {
  if (typeof type !== 'string') return 'Không xác định';
  return TYPE_LABELS[type.trim()] || 'Không xác định';
}

// helper: call Gemini / Google Generative API (using API key)
// improved: more tolerant parsing of different response shapes
async function callGemini(prompt, model = 'gemini-2.5-flash') {
  if (!GEMINI_KEY) throw new Error('NO_GEMINI_KEY');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  const res = await axios.post(url, payload, {
    headers: { "Content-Type": "application/json" }
  });

  // chuẩn parse cho Gemini 1.5
  return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}


// health
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, time: Date.now(), hasGemini: !!GEMINI_KEY });
});

// classify sentences: Gemini -> heuristic fallback
app.post('/api/classify', async (req, res) => {
  const rawText = req.body && typeof req.body.text === 'string' ? req.body.text : '';
  const cleaned = sanitizeText(rawText);
  const sentences = splitSentences(cleaned);
  if (!sentences.length) {
    return res.status(400).json({ error: 'No text provided' });
  }

  // Gemini classification path
  if (GEMINI_KEY) {
    try {
      const sentencesList = sentences.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
      const gPrompt = `Bạn là trợ lý ngôn ngữ tiếng Nhật cho học sinh Việt Nam. Hãy phân loại từng câu sau thành đúng một trong 3 loại: 命令文 (mệnh lệnh), 疑問文 (nghi vấn), 肯定文 (khẳng định). Với mỗi câu, hãy trả về JSON theo cấu trúc:\n{\n  "sentences": [\n    {\n      "original": "...",\n      "normalized": "...",\n      "type": "命令文" | "疑問文" | "肯定文",\n     "actionSuggestion": "..." // gợi ý hành động bằng tiếng Việt\n    }\n  ]\n}\n\nChỉ trả về JSON hợp lệ duy nhất, không thêm giải thích. Dữ liệu đầu vào:\n${sentencesList}`;
      const giResp = await callGemini(gPrompt);
      const parsed = parseGeminiJson(giResp);
      if (parsed && Array.isArray(parsed.sentences)) {
        const sentencesResult = parsed.sentences
          .map((item, idx) => {
            const original = item && typeof item.original === 'string' ? item.original.trim() : sentences[idx] || '';
            const normalized = item && typeof item.normalized === 'string' ? item.normalized.trim() : original;
            const type = item && typeof item.type === 'string' ? item.type.trim() : '肯定文';
            const mainIdea = item && typeof item.mainIdea === 'string' ? item.mainIdea.trim() : '';
            const actionSuggestion = item && typeof item.actionSuggestion === 'string' ? item.actionSuggestion.trim() : '';
            return {
              original,
              normalized,
              type,
              typeVi: resolveTypeLabel(type),
              mainIdea,
              actionSuggestion
            };
          })
          .filter((item) => item.original);
        if (sentencesResult.length) {
          return res.json({ sentences: sentencesResult, provider: 'gemini' });
        }
      }
      console.error('Gemini classify parse failed: unexpected format');
    } catch (err) {
      console.error('Gemini classify failed:', err.message || err);
    }
  }

  const fallbackSentences = sentences.map((sentence) => {
    const normalized = sanitizeText(sentence);
    let type = '肯定文';
    if (/[？?]$/.test(sentence) || sentence.includes('か')) type = '疑問文';
    if (/(なさい|しろ|せよ|ください)$/u.test(sentence)) type = '命令文';
    const mainIdea = `Ý chính (placeholder) của câu: "${normalized}"`;
    const actionSuggestion = type === '命令文'
      ? 'Thực hiện yêu cầu được nêu (placeholder)'
      : type === '疑問文'
        ? 'Cân nhắc câu trả lời phù hợp (placeholder)'
        : 'Ghi nhớ thông tin chính (placeholder)';
    return { original: sentence, normalized, type, typeVi: resolveTypeLabel(type), mainIdea, actionSuggestion };
  });

  res.json({ sentences: fallbackSentences, provider: 'fallback' });
});

// translate: Gemini -> LibreTranslate -> placeholder
app.post('/api/translate', async (req, res) => {
  const rawText = req.body && typeof req.body.text === 'string' ? req.body.text : '';
  const text = sanitizeText(rawText);
  if (!text) return res.status(400).json({ error: 'No text provided' });

  if (GEMINI_KEY) {
    try {
      const gPrompt = `Dịch đoạn sau từ tiếng Nhật sang tiếng Việt. Chỉ trả về phần dịch tiếng Việt, giữ nguyên dấu câu:\n\n${text}`;
      const giResp = await callGemini(gPrompt, 'gemini-2.5-flash');
      if (giResp && giResp.trim()) {
        return res.json({ jp: text, vi: giResp.trim(), provider: 'gemini' });
      }
    } catch (err) {
      console.error('Gemini translate failed:', err.message || err);
    }
  }

  try {
    const ltRes = await axios.post('https://libretranslate.de/translate', {
      q: text,
      source: 'ja',
      target: 'vi',
      format: 'text'
    }, { headers: { 'accept': 'application/json' } });
    const vi = ltRes?.data?.translatedText;
    if (vi) return res.json({ jp: text, vi, provider: 'libretranslate' });
  } catch (err) {
    console.error('LibreTranslate failed:', err.message || err);
  }

  return res.json({ jp: text, vi: `Tiếng Việt (server fallback): ${text}`, provider: 'fallback' });
});

// vocab lookup: Gemini -> placeholder fallback
app.post('/api/vocab/lookup', async (req, res) => {
  const rawInput = req.body && typeof req.body.input === 'string' ? req.body.input : '';
  const word = sanitizeText(rawInput);
  if (!word) return res.status(400).json({ error: 'No input provided' });

  if (GEMINI_KEY) {
    try {
      const gPrompt = `Bạn là từ điển Nhật-Việt. Với từ hoặc cụm "${word}", trả về CHỈ 1 JSON hợp lệ và duy nhất theo cấu trúc:\n{\n  "meaning": "...",\n  "synonyms": ["...", "..."],\n  "examples": [\n    { "jp": "...", "vi": "..." }
  ]\n}\nYêu cầu: synonyms phải có ít nhất 1 phần tử, examples phải có ít nhất 1 phần tử. Không giải thích thêm.`;
      const giResp = await callGemini(gPrompt);
      try {
        const parsed = parseGeminiJson(giResp);
        if (!parsed) {
          console.error('Gemini vocab lookup parse failed: null result');
        } else {
          const meaning = typeof parsed.meaning === 'string' ? parsed.meaning.trim() : '';
          const synonyms = Array.isArray(parsed.synonyms)
            ? Array.from(new Set(parsed.synonyms.map((s) => String(s).trim()).filter(Boolean)))
            : [];
          const examples = Array.isArray(parsed.examples)
            ? parsed.examples
                .map((ex) => {
                  const jpCandidate = ex && typeof ex.jp === 'string' ? ex.jp
                    : ex && typeof ex.ja === 'string' ? ex.ja
                    : ex && typeof ex.example_jp === 'string' ? ex.example_jp
                    : '';
                  const viCandidate = ex && typeof ex.vi === 'string' ? ex.vi
                    : ex && typeof ex.vn === 'string' ? ex.vn
                    : ex && typeof ex.example_vi === 'string' ? ex.example_vi
                    : '';
                  return {
                    jp: sanitizeText(jpCandidate),
                    vi: sanitizeText(viCandidate)
                  };
                })
                .filter((ex) => ex.jp && ex.vi)
            : [];
          if (meaning && synonyms.length && examples.length) {
            return res.json({ meaning, synonyms, examples, provider: 'gemini' });
          }
        }
      } catch (err) {
        console.error('Gemini vocab lookup parse failed:', err.message || err);
      }
    } catch (err) {
      console.error('Gemini vocab lookup failed:', err.message || err);
    }
  }

  const fallback = {
    meaning: `Nghĩa tiếng Việt (placeholder) của "${word}"`,
    synonyms: [`${word} の類義語 (placeholder)`],
    examples: [
      {
        jp: `${word} の例文 (placeholder)`,
        vi: `Ví dụ tiếng Việt cho "${word}" (placeholder)`
      }
    ],
    provider: 'fallback'
  };

  res.json(fallback);
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT} (Gemini: ${!!GEMINI_KEY})`);
});
