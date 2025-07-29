// Load environment variables
require('dotenv').config();

/**
 * OpenAI Realtime API WebSocket Proxy Server - Backend Version
 *
 * IMPORTANT: OpenAI Realtime API behavior:
 * - OpenAI closes WebSocket connections after session completion (normal behavior)
 * - Code 1000 closures are expected and indicate successful session completion
 * - Audio data is sent as binary messages before connection closes
 * - This proxy keeps client connections open for reconnection
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*'
}));
app.use(express.json());

// OpenAI API Key from environment variables
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

// Validate required environment variables
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  console.error('Please add VITE_OPENAI_API_KEY or OPENAI_API_KEY to your .env file');
  process.exit(1);
}

// Import API routes
const sessionRoutes = require('./api/session');
const chatRoutes = require('./api/chat');
const healthRoutes = require('./api/health');

// Use API routes
app.use('/api', sessionRoutes);
app.use('/api', chatRoutes);
app.use('/', healthRoutes);

// Basic root route
app.get('/', (req, res) => {
  res.json({ message: 'Air Assist Backend Server is running!', status: 'OK' });
});

// Create Socket.IO server for OpenAI Realtime API proxy
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  },
  path: '/socket.io/'
});

console.log('Setting up Socket.IO proxy for OpenAI Realtime API...');

// Store OpenAI WebSocket connections per socket
const openaiConnections = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Client connected to Socket.IO proxy:', socket.id);

  let openaiWs = null;
  let isConnecting = false;

  // Handle realtime messages from client
  socket.on('realtime-message', async (message) => {
    try {
      console.log('🔍 Received Socket.IO message from client:', socket.id);

      let data = null;
      let isBinary = false;

      // Check if message is binary (Buffer) or JSON
      if (Buffer.isBuffer(message)) {
        console.log('📤 Client binary message (audio data)', message.length, 'bytes');
        isBinary = true;
        // Forward binary message to OpenAI if connected
        if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
          try {
            openaiWs.send(message, { binary: true });
          } catch (sendError) {
            console.error('❌ Error sending binary message to OpenAI:', sendError);
          }
        }
        return;
      } else {
        // Handle JSON messages
        data = message;
        console.log('📤 Client JSON message:', data.type);
      }

      // If this is the first message or connection is closed, establish connection to OpenAI
      if ((!openaiWs || openaiWs.readyState !== WebSocket.OPEN) && data.type === 'session.create' && !isConnecting) {
        console.log('🚀 Establishing connection to OpenAI Realtime API...');
        isConnecting = true;

        // Connect to OpenAI with proper authentication
        openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        });

        // Store the connection
        openaiConnections.set(socket.id, openaiWs);

        openaiWs.on('open', () => {
          console.log('✅ Connected to OpenAI Realtime API for socket:', socket.id);
          isConnecting = false; // Reset connecting flag
          // Add a small delay to ensure WebSocket is fully ready
          setTimeout(() => {
            if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
              try {
                openaiWs.send(JSON.stringify(data));
                console.log('📤 Session.create message sent to OpenAI');
              } catch (sendError) {
                console.error('❌ Error sending session.create to OpenAI:', sendError);
                socket.emit('realtime-error', {
                  type: 'error',
                  error: {
                    message: 'Failed to initialize session: ' + sendError.message,
                    type: 'session_init_error'
                  }
                });
              }
            } else {
              console.warn('⚠️ WebSocket not ready after open event');
              socket.emit('realtime-error', {
                type: 'error',
                error: {
                  message: 'WebSocket connection not ready',
                  type: 'connection_not_ready'
                }
              });
            }
          }, 100); // 100ms delay to ensure connection is fully established
        });

        openaiWs.on('message', (openaiMessage, isBinary) => {
          try {
            if (isBinary || Buffer.isBuffer(openaiMessage)) {
              console.log('🎵 OpenAI audio response received:', openaiMessage.length, 'bytes');
              // Forward binary message to client
              socket.emit('realtime-response', openaiMessage);
            } else {
              // Handle text messages
              const messageStr = openaiMessage.toString();
              try {
                const messageData = JSON.parse(messageStr);
                console.log('📥 OpenAI response:', messageData.type);
                // Forward JSON message to client
                socket.emit('realtime-response', messageData);
              } catch (parseError) {
                console.log('📥 OpenAI text response (non-JSON):', messageStr.substring(0, 100));
                // Forward as text
                socket.emit('realtime-response', messageStr);
              }
            }
          } catch (error) {
            console.error('❌ Error processing OpenAI message:', error);
            // Forward the message anyway
            socket.emit('realtime-response', openaiMessage);
          }
        });

        openaiWs.on('error', (error) => {
          console.error('❌ OpenAI WebSocket error:', error);
          isConnecting = false; // Reset connecting flag on error
          socket.emit('realtime-error', {
            type: 'error',
            error: {
              message: 'OpenAI connection error: ' + error.message,
              type: 'connection_error'
            }
          });
        });

        openaiWs.on('close', (code, reason) => {
          const reasonStr = reason.toString();
          if (code === 1000) {
            console.log('✅ OpenAI WebSocket closed normally (code 1000):', reasonStr || 'Session completed');
            console.log('🔄 This is expected behavior - OpenAI closes after session completion');
          } else {
            console.log('🔌 OpenAI WebSocket closed with code:', code, reasonStr);
          }
          isConnecting = false; // Reset connecting flag on close
          openaiConnections.delete(socket.id);
          openaiWs = null;
          // Don't close client connection - let it stay open for reconnection
          console.log('🔄 Client connection remains open for future requests');
        });

      } else if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
        // Forward other messages to OpenAI
        console.log('📤 Forwarding message to OpenAI:', data.type);
        try {
          openaiWs.send(JSON.stringify(data));
        } catch (sendError) {
          console.error('❌ Error sending message to OpenAI:', sendError);
          socket.emit('realtime-error', {
            type: 'error',
            error: {
              message: 'Failed to send message to OpenAI: ' + sendError.message,
              type: 'send_error'
            }
          });
        }
      } else {
        console.warn('⚠️ OpenAI connection not ready for message:', data.type);
        // If it's not a session.create message and OpenAI is not connected,
        // we should try to reconnect first
        if (data.type !== 'session.create') {
          console.log('🔄 Attempting to reconnect to OpenAI for message:', data.type);
          // Send an error back to client indicating connection issue
          socket.emit('realtime-error', {
            type: 'error',
            error: {
              message: 'OpenAI connection lost. Please reconnect.',
              type: 'connection_lost'
            }
          });
        }
      }

    } catch (error) {
      console.error('❌ Error processing client message:', error);
      socket.emit('realtime-error', {
        type: 'error',
        error: {
          message: 'Server error: ' + error.message,
          type: 'server_error'
        }
      });
    }
  });

  // Handle binary audio data separately
  socket.on('realtime-audio', (audioData) => {
    console.log('🎵 Received audio data from client:', audioData.length, 'bytes');
    if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
      try {
        openaiWs.send(audioData, { binary: true });
      } catch (sendError) {
        console.error('❌ Error sending audio data to OpenAI:', sendError);
      }
    } else {
      console.warn('⚠️ Cannot send audio data - OpenAI WebSocket not ready');
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected from Socket.IO proxy:', socket.id);
    const connection = openaiConnections.get(socket.id);
    if (connection) {
      connection.close();
      openaiConnections.delete(socket.id);
    }
  });

  socket.on('error', (error) => {
    console.error('❌ Socket.IO client error:', error);
    const connection = openaiConnections.get(socket.id);
    if (connection) {
      connection.close();
      openaiConnections.delete(socket.id);
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 OpenAI Realtime API proxy ready`);
  console.log(`🔌 Socket.IO server available at http://localhost:${PORT}/socket.io/`);
});
