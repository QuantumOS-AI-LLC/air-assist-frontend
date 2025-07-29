# Air Assist Backend Server

This is the backend server for the Air Assist PWA application. It provides API endpoints for OpenAI integration and WebSocket proxy for real-time communication.

## Features

- **OpenAI Realtime API Integration**: WebSocket proxy for real-time voice and text communication
- **Chat Completions API**: REST endpoint for text-based chat completions
- **Session Management**: Ephemeral session creation for OpenAI Realtime API
- **Health Check**: Simple health monitoring endpoint
- **CORS Support**: Cross-origin resource sharing for frontend integration

## Setup

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Edit the `.env` file and add your OpenAI API key:
```env
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### Running the Server

#### Development Mode (with auto-restart)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3001` by default.

## API Endpoints

### REST Endpoints

- `GET /` - Root endpoint with server status
- `GET /health` - Health check endpoint
- `POST /api/session` - Create OpenAI ephemeral session
- `POST /api/chat/completions` - OpenAI chat completions proxy

### WebSocket Endpoint

- `ws://localhost:3001/openai-realtime` - WebSocket proxy for OpenAI Realtime API

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Required |
| `VITE_OPENAI_API_KEY` | Alternative OpenAI API key variable | Required |
| `PORT` | Server port | 3001 |
| `CORS_ORIGIN` | CORS origin setting | * |
| `NODE_ENV` | Environment mode | development |

## Project Structure

```
backend/
├── api/
│   ├── chat.js      # Chat completions route
│   ├── health.js    # Health check route
│   └── session.js   # Session management route
├── server.js        # Main server file
├── package.json     # Dependencies and scripts
├── .env.example     # Environment variables template
└── README.md        # This file
```

## Usage with Frontend

The backend is designed to work with the Air Assist PWA frontend. Make sure to:

1. Update the frontend configuration to point to this backend server
2. Ensure CORS settings allow your frontend domain
3. Use the same OpenAI API key in both frontend and backend

## WebSocket Communication

The WebSocket proxy handles:
- Binary audio data forwarding
- JSON message routing
- Connection management
- Error handling
- Automatic reconnection support

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the PORT in your .env file
2. **OpenAI API errors**: Verify your API key is correct and has sufficient credits
3. **CORS errors**: Update CORS_ORIGIN in your .env file to match your frontend domain

### Logs

The server provides detailed console logging for:
- Connection events
- API requests and responses
- WebSocket message handling
- Error conditions

## Development

To contribute or modify the backend:

1. Follow the existing code structure
2. Add proper error handling
3. Include console logging for debugging
4. Test both REST and WebSocket endpoints
5. Update this README if adding new features
