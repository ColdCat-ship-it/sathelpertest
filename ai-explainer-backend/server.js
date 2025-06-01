const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to format prompt
function buildExplanationPrompt({ passage, question, options, highlight }) {
  return `
You're an expert SAT tutor. The student highlighted this part of the explanation: "${highlight}"

Here is the context:

Passage:
${passage}

Question:
${question}

Options:
${options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

Explain what the highlighted portion means. Break your explanation into three numbered subpoints. Be clear, concise, and helpful.
  `;
}

function buildSubpointPrompt({ highlight, subpointText, pointIndex }) {
  return `
The student previously highlighted: "${highlight}"

They are asking for deeper explanation of this subpoint:
(${pointIndex + 1}) ${subpointText}

Explain this subpoint in more detail. Use analogies, examples, and plain English.
  `;
}

// Endpoint 1: Main explanation
app.post('/api/ai-explanation', async (req, res) => {
  const { passage, question, options, highlight } = req.body;
  const prompt = buildExplanationPrompt({ passage, question, options, highlight });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;

    // Split subpoints: assumes format "1. ... 2. ... 3. ..."
    const subpoints = content
      .split(/\n[1-3]\.\s+/)
      .filter(p => p.trim())
      .map(p => p.trim());

    res.json({
      mainResponse: content,
      subpoints,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI explanation failed' });
  }
});

// Endpoint 2: Deeper explanation for a subpoint
app.post('/api/ai-explanation-subpoint', async (req, res) => {
  const { highlight, subpoint, pointIndex } = req.body;
  const prompt = buildSubpointPrompt({ highlight, subpointText: subpoint, pointIndex });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    res.json({ subExplanation: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Subpoint explanation failed' });
  }
});

// Endpoint 3
// app.post('/api/debrief-audio', async (req, res) => {
//   // const tagScores = req.body.tagScores;
//   const { tagPerformance } = req.body;
//   console.log("Received tagPerformance:", tagPerformance);
//   // new updates
//   const summaryPrompt = `Give a brief spoken 50-word debrief of a student's SAT performance. The student scored:\n\n` +
//     // Object.entries(tagScores)
//     //   .map(([tag, { correct, total }]) => `${tag}: ${correct}/${total}`)
//     //   .join(', ') +
//     Object.entries(tagPerformance)
//       .map(([ tag, percent ]) => `${tag}: ${percent}%`)
//       .join(', ') +
//     `.\nSpeak like a tutor giving encouragement and key feedback.`;
//
//   const completion = await openai.chat.completions.create({
//     model: 'gpt-4.1-nano',
//     messages: [{ role: 'user', content: summaryPrompt }],
//     temperature: 0.7,
//   });
//
//   const debriefText = completion.choices[0].message.content;
//
//   // Optional: generate audio using ElevenLabs or OpenAI TTS
//   const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       model: 'tts-1',
//       voice: 'nova',
//       input: debriefText,
//     }),
//   });
//
//   const audioBuffer = await ttsResponse.arrayBuffer();
//   const base64Audio = Buffer.from(audioBuffer).toString('base64');
//
//   res.json({ text: debriefText, audio: `data:audio/mpeg;base64,${base64Audio}` });
// });

app.post('/api/debrief-audio', async (req, res) => {
  const { tagPerformance } = req.body;

  if (!tagPerformance || !Array.isArray(tagPerformance)) {
    return res.status(400).json({ error: "Invalid tagPerformance data" });
  }

  const scoreSummary = tagPerformance
    .map(({ tag, percent }) => `${tag}: ${percent}%`)
    .join(', ');

  const prompt = `
You are a helpful SAT tutor. Here's how a student scored by topic:

${scoreSummary}

Write a 50-word spoken summary highlighting strengths and weaknesses. Use encouraging language. Speak like a supportive tutor summarizing a student's SAT practice review.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = completion.choices[0].message.content;

    // TTS conversion (OpenAI Whisper)
    const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "nova",
        input: summary,
      }),
    });

    const audioBuffer = await ttsResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    res.json({
      text: summary,
      audio: `data:audio/mpeg;base64,${base64Audio}`,
    });
  } catch (error) {
    console.error("Error generating audio:", error);
    res.status(500).json({ error: "Failed to generate audio summary." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`AI explanation server running on port ${PORT}`));
