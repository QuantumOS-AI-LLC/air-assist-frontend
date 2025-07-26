// OpenAI Realtime API Service
import config from '../config/env.js';

class OpenAIRealtimeService {
  constructor() {
    this.ws = null;
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
    if (this.ws && this.isConnected) {
      console.log("Already connected.");
      return;
    }

    this.apiKey = apiKey;
    this.onMessage = callbacks.onMessage || (() => {});
    this.onError = callbacks.onError || (() => {});
    this.onConnect = callbacks.onConnect || (() => {});
    this.onDisconnect = callbacks.onDisconnect || (() => {});

    try {
      // Determine connection method based on environment
      if (config.isProduction || !config.websocketUrl) {
        // Production: Connect directly to OpenAI using ephemeral token
        console.log("Getting ephemeral token for OpenAI Realtime API...");

        // Get ephemeral token from our session API
        const sessionResponse = await fetch(config.sessionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!sessionResponse.ok) {
          throw new Error(`Failed to get session: ${sessionResponse.status}`);
        }

        const sessionData = await sessionResponse.json();
        console.log("Got ephemeral token:", sessionData.ephemeral_token.substring(0, 20) + '...');

        // Connect using ephemeral token - OpenAI Realtime API format
        // For browser WebSocket, we need to use the token and beta header in subprotocols
        const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;
        console.log("Connecting to OpenAI Realtime API with ephemeral token:", sessionData.ephemeral_token.substring(0, 20) + '...');

        // Use subprotocols to pass both authorization and beta header
        this.ws = new WebSocket(wsUrl, [
          `openai-insecure-api-key.${sessionData.ephemeral_token}`,
          `openai-beta.realtime=v1`
        ]);
        this.ephemeralToken = sessionData.ephemeral_token;
      } else {
        // Development: Use local proxy
        console.log("Connecting to OpenAI Realtime API via local WebSocket proxy...");
        const wsUrl = config.websocketUrl;
        this.ws = new WebSocket(wsUrl);
      }

    } catch (error) {
      console.error("Failed to get ephemeral token:", error);
      this.onError(error);
      return;
    }

    this.ws.onopen = () => {
      console.log("WebSocket connection established.");

      this.isConnected = true;
      this.onConnect();

      // After connection, create a session
      if (!config.isProduction && config.websocketUrl) {
        // Development: Use local proxy
        this.createSession();
      } else {
        // Production: Send session.update with ephemeral token authentication
        console.log("Sending session.update for authentication...");
        this.send({
          type: 'session.update',
          session: {
            model: 'gpt-4o-realtime-preview-2024-12-17',
            modalities: ['text', 'audio'],
            instructions: 'You are Air Assist, a helpful voice-controlled AI assistant. Respond naturally and concisely to voice commands. Do not repeat the user\'s name unnecessarily. Focus on being helpful and conversational.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            }
          }
        });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        // Handle binary messages (audio data)
        if (event.data instanceof Blob) {
          console.log("Received binary message from OpenAI (audio data)", event.data.size, "bytes");
          // Handle binary audio data - could be processed for audio playback
          this.handleBinaryMessage(event.data);
          return;
        }

        // Handle ArrayBuffer (another binary format)
        if (event.data instanceof ArrayBuffer) {
          console.log("Received ArrayBuffer from OpenAI (audio data)", event.data.byteLength, "bytes");
          this.handleBinaryMessage(event.data);
          return;
        }

        // Handle text messages
        if (typeof event.data === 'string') {
          try {
            const message = JSON.parse(event.data);
            console.log("Received text message from OpenAI:", message.type || 'unknown');
            this.onMessage(message);
          } catch (parseError) {
            console.log("Received non-JSON text message:", event.data.substring(0, 100));
          }
          return;
        }

        console.warn("Received unknown message type:", typeof event.data, event.data);

      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.isConnected = false;
      this.onError(new Error("WebSocket connection error."));
    };

    this.ws.onclose = (event) => {
      if (event.code === 1000 && this.sessionCreated) {
        console.log("✅ OpenAI session completed successfully (code 1000)");
        console.log("🔄 This is normal behavior - OpenAI closes after session completion");
        console.log("🔄 Connection state maintained for future requests");
        // Keep connection state as true since we can reconnect
        return;
      }

      console.log("🔌 WebSocket connection closed. Code:", event.code, "Reason:", event.reason);
      this.isConnected = false;
      this.ws = null;
      this.onDisconnect();
    };
  }

  // Disconnect from the service
  disconnect() {
    if (this.ws) {
      console.log("Disconnecting from OpenAI Realtime API...");
      this.ws.close();
    }
  }

  // Send a message to the API
  send(message) {
    if (this.ws && this.isConnected) {
      console.log('📤 Sending message to OpenAI:', message.type);
      const jsonString = JSON.stringify(message);
      console.log('📤 Sending as text string, length:', jsonString.length);
      this.ws.send(jsonString);
    } else if (!this.isConnected) {
      console.error("WebSocket is not connected.");
      this.onError(new Error("Attempted to send message while disconnected."));
    }
  }

  // Create a new session
  createSession(options = {}) {
    console.log('🚀 Creating OpenAI session...');
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
    console.log('📤 Sending session.create:', sessionMessage);
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

  // Send text message and get response using Chat Completions API (via backend proxy)
  async sendTextMessage(text, options = {}) {
    console.log('📝 Sending text message via backend proxy:', text);

    try {
      // Use appropriate API endpoint based on environment
      const response = await fetch(config.chatUrl, {
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
          console.log('✅ Backend proxy response received:', assistantMessage);

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
        console.error('❌ Backend proxy error:', response.status, errorData);
        throw new Error(`Backend error: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error sending message via backend:', error.message);
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
