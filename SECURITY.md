# Security Guidelines

## Environment Variables

### ✅ What We've Implemented

1. **API Key Protection**: OpenAI API keys stored in backend environment variables
2. **Frontend Configuration**: URLs and settings in frontend environment variables
3. **Git Exclusion**: All `.env` files excluded from version control via `.gitignore`
4. **Template Files**: `.env.example` files provide templates without sensitive data
5. **Validation**: Backend validates required environment variables on startup
6. **Centralized Config**: Frontend uses centralized configuration management

### 🔒 Best Practices

#### For Development

1. **Never commit `.env` files**
   ```bash
   # Always verify .env is in .gitignore
   git status --ignored
   ```

2. **Use different API keys for different environments**
   ```env
   # Development
   OPENAI_API_KEY=sk-dev-...
   
   # Production  
   OPENAI_API_KEY=sk-prod-...
   ```

3. **Rotate API keys regularly**
   - Generate new keys monthly
   - Revoke old keys after rotation
   - Update all environments

#### For Production

1. **Use environment-specific configuration**
   ```env
   NODE_ENV=production
   OPENAI_API_KEY=sk-prod-...
   CORS_ORIGIN=https://yourdomain.com
   ```

2. **Implement proper CORS**
   ```javascript
   app.use(cors({
     origin: process.env.CORS_ORIGIN || 'https://yourdomain.com'
   }));
   ```

3. **Use HTTPS everywhere**
   - Enable HTTPS for all endpoints
   - Use secure WebSocket connections (wss://)
   - Set secure cookie flags

## API Key Management

### Current Implementation

- ✅ **Backend**: Environment variables for API keys
- ✅ **Frontend**: Environment variables for URLs and configuration
- ✅ **User Data**: API keys provided by user (stored in localStorage)
- ✅ **Source Code**: No hardcoded keys or sensitive URLs

### Recommendations

1. **For Production**: Implement server-side API key management
2. **For Enterprise**: Use key management services (AWS KMS, Azure Key Vault)
3. **For Teams**: Use secret management tools (HashiCorp Vault, etc.)

## Data Security

### Current State

- ⚠️ API keys stored in browser localStorage (not ideal for production)
- ⚠️ No encryption for stored data
- ⚠️ No authentication/authorization system

### Improvements Needed

1. **Implement proper authentication**
   ```javascript
   // Example: JWT-based auth
   const jwt = require('jsonwebtoken');
   
   app.use('/api', authenticateToken);
   
   function authenticateToken(req, res, next) {
     const token = req.headers['authorization'];
     // Validate token...
   }
   ```

2. **Encrypt sensitive data**
   ```javascript
   // Example: Encrypt API keys before storing
   const crypto = require('crypto');
   
   function encryptApiKey(key) {
     const cipher = crypto.createCipher('aes192', process.env.ENCRYPTION_KEY);
     // Encrypt key...
   }
   ```

3. **Implement rate limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/api', limiter);
   ```

## Network Security

### WebSocket Security

1. **Use secure connections in production**
   ```javascript
   // Production WebSocket URL
   const wsUrl = `wss://yourdomain.com/openai-realtime`;
   ```

2. **Implement connection authentication**
   ```javascript
   wss.on('connection', (ws, request) => {
     // Validate connection token
     const token = request.headers.authorization;
     if (!validateToken(token)) {
       ws.close(1008, 'Unauthorized');
       return;
     }
   });
   ```

### CORS Configuration

```javascript
// Restrictive CORS for production
app.use(cors({
  origin: [
    'https://yourdomain.com',
    'https://app.yourdomain.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

## Deployment Security

### Environment Setup

1. **Use process managers**
   ```bash
   # PM2 with environment files
   pm2 start ecosystem.config.js --env production
   ```

2. **Set proper file permissions**
   ```bash
   chmod 600 .env  # Read/write for owner only
   chown app:app .env  # Proper ownership
   ```

3. **Use reverse proxy**
   ```nginx
   # Nginx configuration
   server {
     listen 443 ssl;
     server_name yourdomain.com;
     
     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;
     
     location / {
       proxy_pass http://localhost:3001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```

## Monitoring and Logging

### Security Logging

```javascript
// Log security events
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'security.log' })
  ]
});

// Log failed authentication attempts
app.use((req, res, next) => {
  if (req.path.includes('/api') && !req.headers.authorization) {
    securityLogger.warn('Unauthorized API access attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
  }
  next();
});
```

## Incident Response

### If API Key is Compromised

1. **Immediate Actions**
   - Revoke the compromised key immediately
   - Generate a new API key
   - Update all environments with new key
   - Monitor usage for suspicious activity

2. **Investigation**
   - Check git history for accidental commits
   - Review access logs
   - Identify potential exposure points

3. **Prevention**
   - Implement git hooks to prevent key commits
   - Use secret scanning tools
   - Regular security audits

### Git Hooks Example

```bash
#!/bin/sh
# pre-commit hook to prevent API key commits

if git diff --cached --name-only | grep -E "\.(js|jsx|ts|tsx|json)$" | xargs grep -l "sk-[a-zA-Z0-9]"; then
    echo "Error: Potential API key found in staged files"
    exit 1
fi
```

## Security Checklist

### Before Deployment

- [ ] All API keys moved to environment variables
- [ ] `.env` files excluded from git
- [ ] CORS properly configured
- [ ] HTTPS enabled
- [ ] Rate limiting implemented
- [ ] Input validation added
- [ ] Error handling doesn't expose sensitive info
- [ ] Logging configured for security events
- [ ] Dependencies updated and scanned for vulnerabilities

### Regular Maintenance

- [ ] Rotate API keys monthly
- [ ] Update dependencies regularly
- [ ] Monitor for security vulnerabilities
- [ ] Review access logs
- [ ] Test backup and recovery procedures
