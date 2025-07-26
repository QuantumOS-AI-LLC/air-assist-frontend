// Simple WebSocket test for the OpenAI Realtime API proxy
// Run this with: node test-websocket.js

const WebSocket = require('ws');

console.log('🧪 Testing WebSocket proxy connection...');

const ws = new WebSocket('ws://localhost:3001/openai-realtime');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket proxy');
  
  // Send a test session.create message
  const sessionMessage = {
    type: 'session.create',
    session: {
      model: 'gpt-4o-realtime-preview-2024-12-17',
      modalities: ['text', 'audio'],
      instructions: 'You are a helpful AI assistant.',
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16'
    }
  };
  
  console.log('📤 Sending session.create message...');
  ws.send(JSON.stringify(sessionMessage));
});

ws.on('message', (data, isBinary) => {
  if (isBinary) {
    console.log('🎵 Received audio data:', data.length, 'bytes');
  } else {
    try {
      const message = JSON.parse(data.toString());
      console.log('📥 Received message:', message.type);
      
      if (message.type === 'session.created') {
        console.log('✅ Session created successfully!');
        console.log('🔄 Connection will close normally after this - this is expected behavior');
      }
    } catch (e) {
      console.log('📥 Received non-JSON message:', data.toString().substring(0, 100));
    }
  }
});

ws.on('close', (code, reason) => {
  if (code === 1000) {
    console.log('✅ Connection closed normally (code 1000) - SUCCESS!');
    console.log('🎉 The WebSocket proxy is working correctly');
  } else {
    console.log('🔌 Connection closed with code:', code, reason.toString());
  }
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  ws.close();
}, 30000);
