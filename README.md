# Air Assist PWA

A voice-controlled Progressive Web Application with Bluetooth support and AI integration.

## Features

- 🎤 Voice recognition and control
- 📱 Progressive Web App (installable)
- 🔗 Bluetooth device connectivity
- 🤖 Dual AI provider support (OpenAI & n8n)
- 🌐 Offline support
- 📱 Mobile-first responsive design

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key (for AI features)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd air-assist-pwa
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Environment Configuration

#### Backend Configuration

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit the `.env` file and add your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
NODE_ENV=development
```

#### Frontend Configuration

Create a `.env` file in the `frontend` directory:

```bash
cd frontend
cp .env.example .env
```

Edit the `.env` file to configure your endpoints:

```env
VITE_BACKEND_URL=http://localhost:3001
VITE_WEBSOCKET_URL=ws://localhost:3001/openai-realtime
VITE_DEFAULT_N8N_URL=https://your-n8n-instance.com/webhook/air
VITE_APP_NAME=Air Assist
VITE_DEBUG_MODE=true
```

**Important**: Never commit your `.env` files to version control. They're already included in `.gitignore`.

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

### 5. Running the Application

#### Development Mode

Start the backend server:
```bash
cd backend
npm run dev
```

In a new terminal, start the frontend:
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

#### Production Build

```bash
cd frontend
npm run build
npm run preview
```

## Configuration

### OpenAI API Key

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to the `backend/.env` file
3. The frontend will prompt you to enter the API key in the settings

### n8n Integration

1. Set up your n8n instance
2. Create a webhook endpoint
3. Configure the webhook URL in the app settings

## Security Notes

- ✅ **Backend**: API keys stored in environment variables
- ✅ **Frontend**: URLs and configuration in environment variables
- ✅ **Git Protection**: All `.env` files excluded from version control
- ✅ **User Input**: Frontend requires manual API key entry
- ✅ **Configuration**: Centralized environment management
- ⚠️ **Production**: Use HTTPS/WSS for all connections
- ⚠️ **Authentication**: Implement proper auth for production use

## Browser Compatibility

- Chrome/Edge (recommended for full feature support)
- Firefox (limited Bluetooth support)
- Safari (limited Web Speech API support)

## Troubleshooting

### Common Issues

1. **Speech recognition not working**: Ensure microphone permissions are granted
2. **Bluetooth connection fails**: Check browser compatibility and device pairing
3. **OpenAI API errors**: Verify API key and account credits
4. **CORS errors**: Ensure backend is running on the correct port

### Environment Variables Not Loading

If environment variables aren't loading:
1. Ensure `.env` file is in the `backend` directory
2. Check file permissions
3. Restart the backend server
4. Verify no syntax errors in `.env` file

## Development

### Project Structure

```
air-assist-pwa/
├── backend/
│   ├── .env                 # Environment variables (not in git)
│   ├── .env.example         # Environment template
│   ├── server.js            # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main application
│   │   ├── hooks/           # React hooks
│   │   └── services/        # API services
│   ├── public/
│   └── package.json
└── README.md
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
