# 🚀 Vercel Deployment Guide

This guide will help you deploy Air Assist to Vercel without WebSocket issues.

## 🔧 Architecture Changes for Vercel

### ✅ What Works on Vercel:
- ✅ **HTTP API Endpoints**: `/api/session`, `/api/chat`, `/api/health`
- ✅ **Static File Serving**: React frontend with PWA features
- ✅ **Direct OpenAI WebSocket**: Frontend connects directly to OpenAI
- ✅ **Environment Variables**: Secure API key handling

### ❌ What Doesn't Work on Vercel:
- ❌ **WebSocket Proxy**: Vercel doesn't support persistent WebSocket connections
- ❌ **Long-running Processes**: Serverless functions have time limits

## 📁 Project Structure for Vercel

```
frontend/
├── api/                    # Vercel serverless functions
│   ├── session.js         # Create OpenAI sessions
│   ├── chat.js           # Chat completions proxy
│   └── health.js         # Health check
├── src/                   # React frontend
├── dist/                  # Built frontend (auto-generated)
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies and scripts
```

## 🚀 Deployment Steps

### 1. Push to GitHub

```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit with Vercel support"

# Push to GitHub
git remote add origin https://github.com/yourusername/air-assist-pwa.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project:**
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist`

### 3. Set Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

```env
OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
```

### 4. Deploy

Click **"Deploy"** and wait for the build to complete.

## 🔍 How It Works

### Development Mode (Local)
- Frontend runs on `http://localhost:5173`
- Serverless server runs on `http://localhost:3001`
- WebSocket connections go through local proxy
- API calls go to local server

### Production Mode (Vercel)
- Frontend served from Vercel CDN
- API endpoints run as Vercel serverless functions
- WebSocket connections go directly to OpenAI
- No proxy needed - eliminates WebSocket issues

## 🧪 Testing Your Deployment

### 1. Check API Endpoints
```bash
curl https://your-app.vercel.app/api/health
```

### 2. Test Frontend
- Open your Vercel URL
- Check if API key is auto-populated
- Test voice commands
- Verify OpenAI connection

## 🔧 Environment Detection

The app automatically detects the environment:

```javascript
// Development: Uses local proxy
if (config.isDevelopment) {
  websocketUrl = 'ws://localhost:3001/openai-realtime'
}

// Production: Direct OpenAI connection
if (config.isProduction) {
  websocketUrl = 'wss://api.openai.com/v1/realtime'
}
```

## 🐛 Troubleshooting

### WebSocket Connection Issues
- ✅ **Fixed**: Direct OpenAI connection in production
- ✅ **No proxy needed**: Eliminates Vercel WebSocket limitations

### API Key Issues
```bash
# Check environment variables in Vercel
vercel env ls

# Add missing environment variable
vercel env add OPENAI_API_KEY
```

### Build Issues
```bash
# Check build logs in Vercel dashboard
# Common issues:
# - Missing dependencies
# - Environment variable not set
# - Build command incorrect
```

## 📱 Features That Work on Vercel

- ✅ **Voice Commands**: Full voice recognition
- ✅ **OpenAI Integration**: Real-time chat and voice
- ✅ **PWA Features**: Install as app, offline support
- ✅ **Auto API Key**: Environment variable auto-population
- ✅ **Responsive Design**: Works on all devices
- ✅ **n8n Integration**: Webhook support

## 🎉 Success!

Your Air Assist PWA is now deployed on Vercel without WebSocket issues!

**Live URL**: `https://your-app.vercel.app`
