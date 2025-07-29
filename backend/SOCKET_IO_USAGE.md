# Socket.IO Implementation for Air Assist Backend

This backend server has been converted from native WebSocket to Socket.IO for better real-time communication with the OpenAI Realtime API.

## Features

- **Socket.IO Server**: Replaces the native WebSocket server for better connection management
- **OpenAI Realtime API Proxy**: Maintains the same functionality for proxying to OpenAI's Realtime API
- **Binary Audio Support**: Handles both JSON messages and binary audio data
- **Connection Management**: Tracks individual client connections and their corresponding OpenAI WebSocket connections
- **Error Handling**: Improved error handling with Socket.IO events

## Server Events

### Client → Server Events

- `realtime-message`: Send JSON messages to OpenAI (e.g., session.create, conversation messages)
- `realtime-audio`: Send binary audio data to OpenAI

### Server → Client Events

- `realtime-response`: Receive responses from OpenAI (JSON or binary audio)
- `realtime-error`: Receive error messages from the server or OpenAI

## Client Connection Example

```javascript
// Connect to the Socket.IO server
const socket = io('http://localhost:3001', {
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Send a session create message
const sessionMessage = {
  type: 'session.create',
  session: {
    modalities: ['text', 'audio'],
    instructions: 'You are a helpful assistant.',
    voice: 'alloy',
    input_audio_format: 'pcm16',
    output_audio_format: 'pcm16',
    input_audio_transcription: {
      model: 'whisper-1'
    },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 200
    }
  }
};

socket.emit('realtime-message', sessionMessage);

// Handle responses
socket.on('realtime-response', (data) => {
  if (Buffer.isBuffer(data)) {
    console.log('Received audio data:', data.length, 'bytes');
    // Handle binary audio data
  } else if (typeof data === 'object') {
    console.log('Received JSON:', data);
    // Handle JSON response
  } else {
    console.log('Received text:', data);
    // Handle text response
  }
});

// Handle errors
socket.on('realtime-error', (error) => {
  console.error('Realtime error:', error);
});

// Send audio data
socket.emit('realtime-audio', audioBuffer);
```

## Key Differences from WebSocket

1. **Event-based Communication**: Instead of raw message sending, Socket.IO uses named events
2. **Automatic Reconnection**: Socket.IO handles reconnection automatically
3. **Better Error Handling**: More granular error events
4. **Connection Management**: Each client gets a unique socket ID
5. **Transport Fallback**: Automatically falls back to polling if WebSocket fails

## Environment Variables

Make sure you have the following environment variables set in your `.env` file:

```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
CORS_ORIGIN=*
PORT=3001
```

## Running the Server

```bash
# Install dependencies
npm install

# Start the server
npm start

# For development with auto-restart
npm run dev
```

The server will be available at:
- HTTP API: `http://localhost:3001`
- Socket.IO: `http://localhost:3001/socket.io/`

## Testing

You can test the Socket.IO connection using any Socket.IO client library or browser developer tools. The server maintains the same OpenAI Realtime API functionality while providing better real-time communication capabilities.
