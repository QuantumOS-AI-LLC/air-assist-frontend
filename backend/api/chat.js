const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// OpenAI API Key from environment variables
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

// Chat completions endpoint
router.post('/chat/completions', async (req, res) => {
  try {
    console.log('📝 Chat completions request received');

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'OpenAI API key not configured',
        message: 'Please set OPENAI_API_KEY environment variable'
      });
    }

    const { messages, model = 'gpt-4o-mini', max_tokens = 1000, temperature = 0.7 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Messages array is required'
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Chat API Error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'OpenAI API error',
        details: errorText
      });
    }

    const data = await response.json();
    console.log('✅ Chat completions response sent');
    res.json(data);

  } catch (error) {
    console.error('Error in chat completions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
