// OpenAI Realtime API Service - Socket.IO Version
import { io } from 'socket.io-client';
import config from '../config/env.js';

class OpenAIRealtimeService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.sessionCreated = false;
    this.apiKey = null;
    this.onMessage = null;
    this.onError = null;
    this.onConnect = null;
    this.onDisconnect = null;
  }

  // Handle binary messages (audio data)
  handleBinaryMessage(binaryData) {
    // For now, we'll just log the binary data
    // In a full implementation, you would:
    // 1. Convert the binary data to audio format
    // 2. Play the audio through Web Audio API
    // 3. Handle audio streaming and buffering
    console.log("Processing binary audio data - audio playback not implemented yet");
  }

  // Initialize connection with API key
  async connect(apiKey, callbacks = {}) {
    if (this.socket && this.isConnected) {
      console.log("Already connected.");
      return;
    }

    this.apiKey = apiKey;
    this.onMessage = callbacks.onMessage || (() => {});
    this.onError = callbacks.onError || (() => {});
    this.onConnect = callbacks.onConnect || (() => {});
    this.onDisconnect = callbacks.onDisconnect || (() => {});

    try {
      // Connect to backend Socket.IO server
      console.log("Connecting to backend Socket.IO server...");
      
      this.socket = io(config.backendUrl, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

    } catch (error) {
      console.error("Failed to connect to backend:", error);
      this.onError(error);
      return;
    }

    this.socket.on('connect', () => {
      console.log("✅ Socket.IO connection established with backend");
      this.isConnected = true;
      this.onConnect();

      // After connection, create a session
      this.createSession();
    });

    this.socket.on('realtime-response', (message) => {
      try {
        // Handle binary messages (audio data)
        if (Buffer.isBuffer(message) || message instanceof ArrayBuffer) {
          console.log("🎵 Received binary message from backend (audio data)", message.length || message.byteLength, "bytes");
          this.handleBinaryMessage(message);
          return;
        }

        // Handle JSON messages
        if (typeof message === 'object' && message.type) {
          console.log("📥 Received JSON message from backend:", message.type);

          // Log detailed error information
          if (message.type === 'error') {
            console.error("🚨 OpenAI Realtime API Error Details:");
            console.error("Error Type:", message.error?.type);
            console.error("Error Code:", message.error?.code);
            console.error("Error Message:", message.error?.message);
            console.error("Error Param:", message.error?.param);
            console.error("Full Error Object:", JSON.stringify(message.error, null, 2));
          }

          this.onMessage(message);
          return;
        }

        // Handle string messages
        if (typeof message === 'string') {
          try {
            const parsedMessage = JSON.parse(message);
            console.log("📥 Received parsed JSON message from backend:", parsedMessage.type || 'unknown');
            this.onMessage(parsedMessage);
          } catch (parseError) {
            console.log("📥 Received non-JSON string message:", message.substring(0, 100));
            // Handle as plain text
            this.onMessage({ type: 'text', content: message });
          }
          return;
        }

        console.warn("Received unknown message type:", typeof message, message);

      } catch (error) {
        console.error("Error processing message from backend:", error);
      }
    });

    this.socket.on('realtime-error', (error) => {
      console.error("❌ Backend error:", error);
      this.onError(new Error(error.error?.message || 'Backend connection error'));
    });

    this.socket.on('disconnect', (reason) => {
      console.log("🔌 Socket.IO connection disconnected. Reason:", reason);
      this.isConnected = false;
      this.socket = null;
      this.onDisconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error("❌ Socket.IO connection error:", error);
      this.isConnected = false;
      this.onError(new Error("Failed to connect to backend: " + error.message));
    });
  }

  // Disconnect from the service
  disconnect() {
    if (this.socket) {
      console.log("Disconnecting from backend Socket.IO server...");
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Send a message to the API via Socket.IO
  send(message) {
    if (this.socket && this.isConnected) {
      console.log('📤 Sending message to backend:', message.type);
      this.socket.emit('realtime-message', message);
    } else if (!this.isConnected) {
      console.error("Socket.IO is not connected.");
      this.onError(new Error("Attempted to send message while disconnected."));
    }
  }

  // Send binary audio data
  sendAudio(audioData) {
    if (this.socket && this.isConnected) {
      console.log('🎵 Sending audio data to backend:', audioData.length || audioData.byteLength, 'bytes');
      this.socket.emit('realtime-audio', audioData);
    } else if (!this.isConnected) {
      console.error("Socket.IO is not connected.");
      this.onError(new Error("Attempted to send audio while disconnected."));
    }
  }

  // Create a new session
  createSession(options = {}) {
    console.log('🚀 Creating OpenAI session via backend...');
    const sessionMessage = {
      type: 'session.create',
      session: {
        model: options.model || 'gpt-4o-realtime-preview-2024-12-17',
        modalities: options.modalities || ['text', 'audio'],
        instructions: options.instructions || 'You are Air Assist, a helpful voice-controlled AI assistant. Respond naturally and concisely to voice commands. Do not repeat the user\'s name unnecessarily. Focus on being helpful and conversational.',
        voice: options.voice || 'alloy',
        input_audio_format: options.input_audio_format || 'pcm16',
        output_audio_format: options.output_audio_format || 'pcm16',
        ...options
      }
    };
    console.log('📤 Sending session.create via Socket.IO:', sessionMessage);
    this.send(sessionMessage);
    this.sessionCreated = true;
  }

  // Convert Float32Array of audio data to PCM16 ArrayBuffer
  floatTo16BitPCM(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  // Convert Float32Array to base64-encoded PCM16 data
  base64EncodeAudio(float32Array) {
    const arrayBuffer = this.floatTo16BitPCM(float32Array);
    let binary = '';
    let bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000; // 32KB chunk size
    for (let i = 0; i < bytes.length; i += chunkSize) {
      let chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  // Send audio data to the input buffer
  appendAudioBuffer(audioData) {
    const base64Audio = this.base64EncodeAudio(audioData);
    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Audio
    });
  }

  // Commit the audio buffer
  commitAudioBuffer() {
    this.send({
      type: 'input_audio_buffer.commit'
    });
  }

  // Create a response
  createResponse(options = {}) {
    this.send({
      type: 'response.create',
      response: {
        modalities: options.modalities || ["text", "audio"],
        instructions: options.instructions || "",
        voice: options.voice || "alloy",
        output_audio_format: options.output_audio_format || "pcm16",
        ...options
      }
    });
  }

  // Create a conversation item
  createConversationItem(content, role = "user") {
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: role,
        content: Array.isArray(content) ? content : [
          {
            type: "input_text",
            text: content
          }
        ]
      }
    });
  }

  // Create conversation item with audio
  createAudioConversationItem(audioData, role = "user") {
    const base64Audio = this.base64EncodeAudio(audioData);
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: role,
        content: [
          {
            type: "input_audio",
            audio: base64Audio,
          },
        ],
      },
    });
  }

  // Send text message and get response using backend Chat Completions API
  async sendTextMessage(text, options = {}) {
    console.log('📝 Sending text message via backend:', text);

    try {
      const response = await fetch(`${config.backendUrl}/api/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: text
            }
          ],
          model: options.model || 'gpt-4o-mini',
          max_tokens: options.max_tokens || 1000,
          temperature: options.temperature || 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage = data.choices[0]?.message?.content;

        if (assistantMessage) {
          console.log('✅ Backend response received:', assistantMessage);

          // Trigger the message callback to add the response to the chat
          if (this.onMessage) {
            this.onMessage({
              type: 'response.text',
              text: assistantMessage,
              role: 'assistant',
              model: data.model || 'gpt-4o-mini'
            });
          }

          return assistantMessage;
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Backend API error:', response.status, errorData);
        throw new Error(`Backend API error: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error sending message to backend:', error.message);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  // Send audio message and get response
  async sendAudioMessage(audioData, options = {}) {
    this.createAudioConversationItem(audioData);
    this.createResponse(options);
  }

  // Process audio from MediaRecorder or similar
  async processAudioBlob(audioBlob) {
    try {
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // For browser compatibility, we'll use Web Audio API to decode
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Get channel data (mono)
      const channelData = audioBuffer.getChannelData(0);
      
      return channelData;
    } catch (error) {
      console.error("Error processing audio blob:", error);
      throw error;
    }
  }

  // Create out-of-band response for classification or analysis
  createOutOfBandResponse(instructions, metadata = {}) {
    this.send({
      type: "response.create",
      response: {
        conversation: "none", // Out of band
        metadata: metadata,
        modalities: ["text"],
        instructions: instructions,
      },
    });
  }
}

export default OpenAIRealtimeService;
