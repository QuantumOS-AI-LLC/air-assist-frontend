// Environment configuration utility
// Centralizes access to environment variables with fallbacks

export const config = {
  // Environment Detection
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,

  // Backend API Configuration
  get backendUrl() {
    if (this.isProduction) {
      // In production (Vercel), use relative URLs for API routes
      return window.location.origin;
    }
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  },

  get websocketUrl() {
    if (this.isProduction) {
      // In production, connect directly to OpenAI (no proxy)
      return null; // Will use direct OpenAI connection
    }
    return import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001/openai-realtime';
  },

  // OpenAI Configuration
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',

  // Default n8n Configuration
  defaultN8nUrl: import.meta.env.VITE_DEFAULT_N8N_URL || 'https://n8n.dev.quantumos.ai/webhook/air',

  // App Configuration
  appName: import.meta.env.VITE_APP_NAME || 'Air Assist',
  appDescription: import.meta.env.VITE_APP_DESCRIPTION || 'Voice-Controlled PWA with Bluetooth Support',

  // Development Settings
  nodeEnv: import.meta.env.VITE_NODE_ENV || 'development',
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  
  // Computed URLs
  get healthCheckUrl() {
    return `${this.backendUrl}/api/health`;
  },

  get sessionUrl() {
    return `${this.backendUrl}/api/session`;
  },

  get chatUrl() {
    return `${this.backendUrl}/api/chat`;
  }
};

// Validation function to check required environment variables
export const validateConfig = () => {
  const errors = [];
  
  // Check if backend URL is accessible (in production)
  if (config.isProduction && !config.backendUrl.startsWith('https://')) {
    errors.push('VITE_BACKEND_URL should use HTTPS in production');
  }
  
  if (config.isProduction && !config.websocketUrl.startsWith('wss://')) {
    errors.push('VITE_WEBSOCKET_URL should use WSS in production');
  }
  
  if (errors.length > 0) {
    console.warn('⚠️ Configuration warnings:', errors);
  }
  
  return errors;
};

// Debug function to log configuration (only in development)
export const logConfig = () => {
  if (config.debugMode && config.isDevelopment) {
    console.group('🔧 Environment Configuration');
    console.log('Environment:', config.isProduction ? 'Production (Vercel)' : 'Development (Local)');
    console.log('Backend URL:', config.backendUrl);
    console.log('WebSocket Mode:', config.websocketUrl ? 'Proxy (Local)' : 'Direct (Production)');
    console.log('Default n8n URL:', config.defaultN8nUrl);
    console.log('App Name:', config.appName);
    console.log('Debug Mode:', config.debugMode);
    console.log('OpenAI API Key:', config.openaiApiKey ? '✅ Auto-loaded from environment' : '❌ Not found in environment');
    console.groupEnd();
  }
};

// Initialize configuration validation and logging
validateConfig();
logConfig();

export default config;
