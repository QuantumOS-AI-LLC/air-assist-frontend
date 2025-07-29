// Environment configuration utility
// Centralizes access to environment variables with fallbacks

export const config = {
  // Environment Detection
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,


  // OpenAI Configuration
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',

  // Backend Configuration
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',

  // Default n8n Configuration
  defaultN8nUrl: import.meta.env.VITE_DEFAULT_N8N_URL || 'https://n8n.dev.quantumos.ai/webhook/air',

  // App Configuration
  appName: import.meta.env.VITE_APP_NAME || 'Air Assist',
  appDescription: import.meta.env.VITE_APP_DESCRIPTION || 'Voice-Controlled PWA with Bluetooth Support',

  // Development Settings
  nodeEnv: import.meta.env.VITE_NODE_ENV || 'development',
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  
};

// Debug function to log configuration (only in development)
export const logConfig = () => {
  if (config.debugMode && config.isDevelopment) {
    console.group('🔧 Environment Configuration');
    console.log('Environment:', config.isProduction ? 'Production' : 'Development');
    console.log('Default n8n URL:', config.defaultN8nUrl);
    console.log('App Name:', config.appName);
    console.log('Debug Mode:', config.debugMode);
    console.log('OpenAI API Key:', config.openaiApiKey ? '✅ Auto-loaded from environment' : '❌ Not found in environment');
    console.groupEnd();
  }
};

// Initialize configuration logging
logConfig();

export default config;
