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
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

app.use(cors());
app.use(express.json());

// helper: call OpenAI ChatCompletion (gpt-3.5-turbo)
async function callOpenAI(systemPrompt, userPrompt) {
  if (!OPENAI_KEY) throw new Error('NO_OPENAI_KEY');
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
    max_tokens: 1200
  };
  const res = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' }
  });
  return res.data.choices?.[0]?.message?.content || '';
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
  res.json({ ok: true, time: Date.now(), hasOpenAI: !!OPENAI_KEY, hasGemini: !!GEMINI_KEY });
});

// analyze: try OpenAI -> Gemini -> placeholder
app.post('/api/analyze', async (req, res) => {
  const text = (req.body && req.body.text) ? String(req.body.text).trim() : '';
  if (!text) return res.status(400).json({ error: 'No text provided' });

  // OpenAI path
  if (OPENAI_KEY) {
    try {
      const system = `Bạn là trợ lý ngôn ngữ: phân tích câu tiếng Nhật cho học sinh Việt. Trả về duy nhất 1 JSON hợp lệ gồm: sentenceType, keywords (mảng), vocabulary (mảng object {word,reading,pos,meaning_vi,example}), suggestions (mảng).`;
      const userPrompt = `Phân tích đoạn sau:\n\n${text}\n\nTrả về JSON.`;
      const aiResp = await callOpenAI(system, userPrompt);
      try {
        return res.json({ text, ...(JSON.parse(aiResp)) });
      } catch (e) {
        return res.json({ text, raw: aiResp });
      }
    } catch (err) {
      console.error('OpenAI analyze failed:', err.message || err);
      // fall through to Gemini
    }
  }

  // Gemini path
  if (GEMINI_KEY) {
    try {
      const gPrompt = `Bạn là trợ lý ngôn ngữ cho học sinh Việt. Phân tích đoạn Nhật sau và trả về CHỈ 1 JSON hợp lệ với các trường: sentenceType, keywords (mảng), vocabulary (mảng object {word,reading,pos,meaning_vi,example}), suggestions (mảng).\n\nText:\n${text}`;
      const giResp = await callGemini(gPrompt);
      try {
        return res.json({ text, ...(JSON.parse(giResp)) });
      } catch (e) {
        return res.json({ text, raw: giResp });
      }
    } catch (err) {
      console.error('Gemini analyze failed:', err.message || err);
    }
  }

  // fallback placeholder
  const words = text.split(/\s+|、|。|\.|,/).filter(Boolean);
  const keywords = words.slice(0, Math.min(6, words.length));
  const vocab = keywords.map((w, i) => ({
    word: w,
    pos: i % 2 === 0 ? '名詞 (placeholder)' : '動詞 (placeholder)',
    meaning_vi: `Nghĩa tiếng Việt (placeholder) của "${w}"`,
    example: text
  }));

  res.json({
    text,
    sentenceType: 'Trần thuật / Mệnh lệnh (placeholder)',
    keywords,
    vocabulary: vocab,
    suggestions: ['Hãy trả lời giáo viên (placeholder)']
  });
});

// translate: OpenAI -> Gemini -> LibreTranslate -> placeholder
app.post('/api/translate', async (req, res) => {
  const text = (req.body && req.body.text) ? String(req.body.text).trim() : '';
  if (!text) return res.status(400).json({ error: 'No text provided' });

  // OpenAI
  if (OPENAI_KEY) {
    try {
      const system = 'Bạn là bản dịch chuyên nghiệp Nhật->Tiếng Việt. Chỉ trả về phần dịch tiếng Việt.';
      const aiResp = await callOpenAI(system, `Dịch sang tiếng Việt:\n\n${text}`);
      return res.json({ jp: text, vi: aiResp.trim(), provider: 'openai' });
    } catch (err) {
      console.error('OpenAI translate failed:', err.message || err);
    }
  }

  // Gemini
  if (GEMINI_KEY) {
    try {
      const gPrompt = `Dịch đoạn sau từ tiếng Nhật sang tiếng Việt. Trả về CHỈ phần dịch (Tiếng Việt):\n\n${text}`;
      const giResp = await callGemini(gPrompt, 'gemini-2.5-flash');
      if (giResp && giResp.trim()) {
        return res.json({ jp: text, vi: giResp.trim(), provider: 'gemini' });
      } else {
        console.warn('Gemini returned empty response for translate.');
      }
    } catch (err) {
      console.error('Gemini translate failed:', err.message || err);
    }
  }

  // LibreTranslate fallback
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

  // final fallback placeholder
  return res.json({ jp: text, vi: `Tiếng Việt (server fallback): ${text}`, provider: 'fallback' });
});

// vocab lookup: OpenAI -> Gemini -> placeholder
app.post('/api/vocab', async (req, res) => {
  const word = (req.body && req.body.word) ? String(req.body.word).trim() : '';
  if (!word) return res.status(400).json({ error: 'No word provided' });

  if (OPENAI_KEY) {
    try {
      const system = 'Bạn là từ điển Nhật-Việt. Trả về JSON: { word, reading, pos, meaning_vi, examples: [...] }';
      const aiResp = await callOpenAI(system, `Cho thông tin chi tiết cho từ: ${word}`);
      try {
        return res.json(JSON.parse(aiResp));
      } catch (e) {
        return res.json({ raw: aiResp });
      }
    } catch (err) {
      console.error('OpenAI vocab failed:', err.message || err);
    }
  }

  if (GEMINI_KEY) {
    try {
      const gPrompt = `Bạn là từ điển Nhật-Việt. Trả về CHỈ 1 JSON với các trường: word, reading, pos, meaning_vi, examples (mảng). Từ: ${word}`;
      const giResp = await callGemini(gPrompt);
      try {
        return res.json(JSON.parse(giResp));
      } catch (e) {
        return res.json({ raw: giResp });
      }
    } catch (err) {
      console.error('Gemini vocab failed:', err.message || err);
    }
  }

  // fallback
  return res.json({
    word,
    reading: '',
    pos: '名詞 (placeholder)',
    meaning_vi: `Nghĩa tiếng Việt (placeholder) của "${word}"`,
    examples: [`${word} の例文 (placeholder)`]
  });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT} (OpenAI: ${!!OPENAI_KEY}, Gemini: ${!!GEMINI_KEY})`);
});
