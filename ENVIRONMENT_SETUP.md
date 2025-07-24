# Environment Variables Setup Guide

## Overview

This project now uses environment variables to protect sensitive information and make configuration flexible across different environments.

## 🔒 Security Benefits

- ✅ **API Keys Protected**: No hardcoded API keys in source code
- ✅ **URLs Configurable**: Backend and service URLs can be changed per environment
- ✅ **Git Safe**: All `.env` files are excluded from version control
- ✅ **Environment Specific**: Different configs for development/production

## 📁 File Structure

```
air-assist-pwa/
├── backend/
│   ├── .env                 # Your actual backend config (not in git)
│   ├── .env.example         # Backend template (safe to commit)
│   └── server.js            # Uses process.env variables
├── frontend/
│   ├── .env                 # Your actual frontend config (not in git)
│   ├── .env.example         # Frontend template (safe to commit)
│   ├── .env.production      # Production template (safe to commit)
│   └── src/config/env.js    # Centralized config management
└── .gitignore               # Excludes all .env files
```

## 🛠️ Setup Instructions

### 1. Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
OPENAI_API_KEY=your_actual_openai_api_key_here
PORT=3001
NODE_ENV=development
```

### 2. Frontend Environment

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_WEBSOCKET_URL=ws://localhost:3001/openai-realtime
VITE_DEFAULT_N8N_URL=https://your-n8n-instance.com/webhook/air
VITE_APP_NAME=Air Assist
VITE_DEBUG_MODE=true
```

## 🌍 Environment Variables Reference

### Backend Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | - | ✅ Yes |
| `PORT` | Server port | 3001 | No |
| `NODE_ENV` | Environment mode | development | No |
| `CORS_ORIGIN` | Allowed CORS origins | * | No |

### Frontend Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_BACKEND_URL` | Backend API URL | http://localhost:3001 | No |
| `VITE_WEBSOCKET_URL` | WebSocket proxy URL | ws://localhost:3001/openai-realtime | No |
| `VITE_DEFAULT_N8N_URL` | Default n8n webhook URL | - | No |
| `VITE_APP_NAME` | Application name | Air Assist | No |
| `VITE_DEBUG_MODE` | Enable debug logging | false | No |

## 🚀 Production Setup

### Backend Production

```env
OPENAI_API_KEY=sk-prod-your-production-key
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

### Frontend Production

```env
VITE_BACKEND_URL=https://api.yourdomain.com
VITE_WEBSOCKET_URL=wss://api.yourdomain.com/openai-realtime
VITE_DEFAULT_N8N_URL=https://n8n.yourdomain.com/webhook/air
VITE_APP_NAME=Air Assist
VITE_DEBUG_MODE=false
```

## 🔍 Verification

### Check Backend Environment

```bash
cd backend
npm start
```

Should show: `🚀 Backend server running on http://localhost:3001`

### Check Frontend Environment

```bash
cd frontend
npm run dev
```

Open browser console and look for: `🔧 Environment Configuration`

## ⚠️ Important Security Notes

1. **Never commit `.env` files** - They contain sensitive data
2. **Use different API keys** for development and production
3. **Rotate API keys regularly** - Generate new keys monthly
4. **Use HTTPS in production** - All URLs should use secure protocols
5. **Validate environment variables** - Check required vars on startup

## 🐛 Troubleshooting

### Backend Issues

- **"OPENAI_API_KEY environment variable is required"**
  - Ensure `.env` file exists in `backend/` directory
  - Check that `OPENAI_API_KEY=your_key_here` is in the file
  - Restart the backend server

### Frontend Issues

- **Configuration not loading**
  - Ensure `.env` file exists in `frontend/` directory
  - All frontend env vars must start with `VITE_`
  - Restart the frontend dev server

### Connection Issues

- **WebSocket connection failed**
  - Check `VITE_WEBSOCKET_URL` matches backend WebSocket endpoint
  - Ensure backend is running before starting frontend

## 📝 Development Workflow

1. **Clone repository**
2. **Copy environment templates**: `cp .env.example .env` (both directories)
3. **Add your API keys** to the `.env` files
4. **Start backend**: `cd backend && npm start`
5. **Start frontend**: `cd frontend && npm run dev`
6. **Never commit `.env` files** - Git will ignore them automatically

## 🔄 Team Collaboration

When sharing the project:
1. **Share**: `.env.example` files (safe templates)
2. **Don't share**: `.env` files (contain secrets)
3. **Document**: Any new environment variables in this guide
4. **Update**: `.env.example` files when adding new variables
