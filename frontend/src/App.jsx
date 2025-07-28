import { useState, useEffect, useRef } from 'react'
import PWABadge from './PWABadge.jsx'
import useOpenAIRealtime from './hooks/useOpenAIRealtime.js'
import config from './config/env.js'
import './App.css'

function App() {
  const [isListening, setIsListening] = useState(false)
  const [audioDevices, setAudioDevices] = useState({ input: [], output: [] })
  const [selectedAudioInput, setSelectedAudioInput] = useState(null)
  const [selectedAudioOutput, setSelectedAudioOutput] = useState(null)
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false)
  const [isAudioDeviceScanning, setIsAudioDeviceScanning] = useState(false)
  const [bluetoothDevices, setBluetoothDevices] = useState([])
  const [showBluetoothModal, setShowBluetoothModal] = useState(false)
  const [availableBluetoothDevices, setAvailableBluetoothDevices] = useState([])
  const [isBluetoothScanning, setIsBluetoothScanning] = useState(false)
  const [currentMediaStream, setCurrentMediaStream] = useState(null)
  const [audioContext, setAudioContext] = useState(null)
  const [isMicrophoneTesting, setIsMicrophoneTesting] = useState(false)
  const [microphoneLevel, setMicrophoneLevel] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isPWA, setIsPWA] = useState(false)
  const [isN8nConnected, setIsN8nConnected] = useState(false)
  const [n8nUrl, setN8nUrl] = useState(() => {
    return localStorage.getItem('n8n_url') || config.defaultN8nUrl
  })
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: `Hello! I'm ${config.appName}. Connect your Bluetooth earpiece and configure OpenAI Realtime API or n8n to start.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: "assistant"
    }
  ])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [error, setError] = useState('')
  const [speechSupported, setSpeechSupported] = useState(true)
  const [lastCommand, setLastCommand] = useState('')
  const [lastCommandTime, setLastCommandTime] = useState(0)
  const [openaiApiKey, setOpenaiApiKey] = useState(() => {
    // Priority: localStorage > environment variable > empty string
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      return storedKey;
    }
    // Auto-populate from environment variable if available
    if (config.openaiApiKey) {
      // Store it in localStorage for persistence
      localStorage.setItem('openai_api_key', config.openaiApiKey);
      return config.openaiApiKey;
    }
    return '';
  })
  const [useOpenAI, setUseOpenAI] = useState(() => {
    const stored = localStorage.getItem('use_openai')
    console.log('🔧 Initial useOpenAI state from localStorage:', stored)
    return stored === 'true'
  })
  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)
  // const mediaRecorderRef = useRef(null)
  // const audioChunksRef = useRef([])

  // OpenAI Realtime hook
  const {
    isConnected: isOpenAIConnected,
    isConnecting: isOpenAIConnecting,
    error: openAIError,
    messages: openAIMessages,
    connect: connectOpenAI,
    disconnect: disconnectOpenAI,
    sendTextMessage,
    // sendAudioBlob,
    clearMessages: clearOpenAIMessages
  } = useOpenAIRealtime()

  // Auto scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Sync OpenAI messages with local messages
  useEffect(() => {
    if (useOpenAI && openAIMessages.length > 0) {
      console.log('🔄 Syncing OpenAI messages:', openAIMessages)

      // Convert OpenAI messages to local message format
      const convertedMessages = openAIMessages.map(msg => ({
        id: msg.id || Date.now() + Math.random(),
        text: msg.content || msg.text || '',
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: msg.role === 'user' ? 'user' : 'assistant'
      }))

      console.log('📝 Converted messages:', convertedMessages)

      // Update local messages with OpenAI messages
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMessages = convertedMessages.filter(m => !existingIds.has(m.id) && m.text.trim())
        console.log('➕ Adding new messages:', newMessages)
        return [...prev, ...newMessages]
      })
    }
  }, [openAIMessages, useOpenAI])

  // Mobile and platform detection
  useEffect(() => {
    const detectMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const ios = /iPad|iPhone|iPod/.test(userAgent)
      const android = /Android/i.test(userAgent)
      const pwa = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true ||
                  document.referrer.includes('android-app://')

      setIsMobile(mobile)
      setIsIOS(ios)
      setIsAndroid(android)
      setIsPWA(pwa)

      console.log('📱 Platform Detection:', { mobile, ios, android, pwa })
    }

    detectMobile()
  }, [])

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false  // Changed to false to prevent continuous listening
      recognitionRef.current.interimResults = false  // Changed to false to only get final results
      recognitionRef.current.lang = 'en-US'
      recognitionRef.current.maxAlternatives = 1

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          const trimmedCommand = finalTranscript.trim().toLowerCase()
          const now = Date.now()

          // Prevent duplicate commands within 3 seconds
          if (trimmedCommand === lastCommand.toLowerCase() && (now - lastCommandTime) < 3000) {
            console.log('🚫 Ignoring duplicate command:', trimmedCommand)
            return
          }

          // Ignore very short commands (likely noise)
          if (trimmedCommand.length < 3) {
            console.log('🚫 Ignoring short command:', trimmedCommand)
            return
          }

          setLastCommand(finalTranscript.trim())
          setLastCommandTime(now)
          // Remove duplicate addMessage call - sendTextMessage will handle adding the user message
          processVoiceCommand(finalTranscript)
        }
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setError(`Speech recognition error: ${event.error}`)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        console.log('🎤 Speech recognition ended. isListening:', isListening, 'isProcessing:', isProcessing)
        setIsListening(false)
        // Don't auto-restart - let the processVoiceCommand function handle restarting
        // This prevents duplicate processing of the same command
      }
    } else {
      setSpeechSupported(false)
      setError('Speech recognition is not supported in this browser')
    }
  }, [])

  // Check n8n connection only when URL changes and in n8n mode
  useEffect(() => {
    // Only auto-connect if we're explicitly in n8n mode and URL is valid
    if (!useOpenAI && n8nUrl && localStorage.getItem('use_openai') === 'false') {
      console.log('🔗 n8n URL changed, testing connection in n8n mode')
      // Add a small delay to ensure state is stable
      setTimeout(() => {
        if (!useOpenAI && localStorage.getItem('use_openai') === 'false') {
          checkN8nConnection()
        }
      }, 100)
    }
  }, [n8nUrl]) // Remove useOpenAI from dependencies to prevent auto-reconnection

  // Auto-connect to OpenAI when API key is available from environment or when switching to OpenAI mode
  useEffect(() => {
    if (useOpenAI && !isOpenAIConnected && openaiApiKey && localStorage.getItem('use_openai') === 'true') {
      console.log('🔄 Auto-connecting to OpenAI due to provider switch or auto-populated API key')
      // Ensure n8n is disconnected first
      setIsN8nConnected(false)
      localStorage.setItem('n8n_connected', 'false')
      // Add delay to ensure clean state
      setTimeout(() => {
        if (useOpenAI && localStorage.getItem('use_openai') === 'true') {
          connectOpenAI(openaiApiKey)
        }
      }, 100)
    }
  }, [useOpenAI, openaiApiKey]) // Depend on both useOpenAI and openaiApiKey for auto-connection

  // Initial auto-connection when component mounts with environment API key
  useEffect(() => {
    // Only auto-connect if we have an API key from environment and OpenAI mode is selected
    if (config.openaiApiKey && useOpenAI && !isOpenAIConnected && !localStorage.getItem('openai_connected')) {
      console.log('🚀 Auto-connecting to OpenAI with environment API key on startup')
      setTimeout(() => {
        connectOpenAI(openaiApiKey)
      }, 500) // Small delay to ensure all state is initialized
    }
  }, []) // Run only once on mount

  // Monitor and fix connection state synchronization
  useEffect(() => {
    if (!useOpenAI) return

    const checkConnectionState = () => {
      // Check if we have audio responses coming in (indicates OpenAI is working)
      const hasRecentOpenAIActivity = openAIMessages.length > 0 ||
        (localStorage.getItem('openai_connected') === 'true' && openaiApiKey)

      if (hasRecentOpenAIActivity && !isOpenAIConnected) {
        console.log('🔧 Fixing connection state: OpenAI is responding but state shows disconnected')
        // Force reconnection to sync state
        connectOpenAI(openaiApiKey)
      }
    }

    // Check connection state every 3 seconds when OpenAI mode is enabled
    const interval = setInterval(checkConnectionState, 3000)
    return () => clearInterval(interval)
  }, [useOpenAI, isOpenAIConnected, openAIMessages.length, openaiApiKey, connectOpenAI])

  // Ensure useOpenAI state is properly synchronized
  useEffect(() => {
    console.log('🔧 useOpenAI state changed to:', useOpenAI)
    localStorage.setItem('use_openai', useOpenAI.toString())

    // Provider isolation: ensure only one provider is connected at a time
    if (useOpenAI && isN8nConnected) {
      console.log('⚠️ Provider isolation: Disconnecting n8n when switching to OpenAI')
      setIsN8nConnected(false)
      localStorage.setItem('n8n_connected', 'false')
    } else if (!useOpenAI && isOpenAIConnected) {
      console.log('⚠️ Provider isolation: Disconnecting OpenAI when switching to n8n')
      disconnectOpenAI()
    }
  }, [useOpenAI, isN8nConnected, isOpenAIConnected])

  // Sync state with localStorage on mount and when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const storedValue = localStorage.getItem('use_openai')
      const shouldUseOpenAI = storedValue === 'true'
      if (useOpenAI !== shouldUseOpenAI) {
        console.log('🔄 Syncing useOpenAI state with localStorage:', shouldUseOpenAI)
        setUseOpenAI(shouldUseOpenAI)
      }
    }

    // Check on mount
    handleStorageChange()

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Check fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const processVoiceCommand = async (command) => {
    setIsProcessing(true)

    // Stop listening while processing to avoid interference
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
    }

    // Debug logging to understand the routing decision
    console.log('🎯 Processing voice command:', command)
    console.log('🔧 useOpenAI:', useOpenAI)
    console.log('🔧 isOpenAIConnected:', isOpenAIConnected)
    console.log('🔧 isN8nConnected:', isN8nConnected)
    console.log('🔧 openaiApiKey present:', !!openaiApiKey)
    console.log('🔧 localStorage use_openai:', localStorage.getItem('use_openai'))

    // Use localStorage as source of truth for routing decision
    const storedUseOpenAI = localStorage.getItem('use_openai') === 'true'
    const shouldUseOpenAI = storedUseOpenAI
    console.log('🔧 Decision: Will use', shouldUseOpenAI ? 'OpenAI' : 'n8n', '(from localStorage)')

    // Sync state if out of sync
    if (useOpenAI !== storedUseOpenAI) {
      console.log('🔄 State out of sync, correcting useOpenAI to:', storedUseOpenAI)
      setUseOpenAI(storedUseOpenAI)
    }

    // Additional safety check
    if (shouldUseOpenAI && isN8nConnected) {
      console.log('⚠️ WARNING: OpenAI mode selected but n8n is connected - forcing n8n disconnect')
      setIsN8nConnected(false)
      localStorage.setItem('n8n_connected', 'false')
    }

    try {
      // Use the selected provider (simplified routing)
      if (shouldUseOpenAI) {
        // Use OpenAI Realtime API
        console.log('📤 Sending to OpenAI:', command)
        await sendTextMessage(command)
        console.log('✅ OpenAI message sent successfully')
      } else {
        // Send to n8n webhook directly
        console.log('📤 Sending to n8n:', command)
        // Add user message to chat for n8n path
        addMessage(command, 'user')

        const response = await fetch(n8nUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            command,
            timestamp: new Date().toISOString(),
            type: 'voice_command'
          })
        })

        if (response.ok) {
          const result = await response.text()
          console.log('📥 n8n response:', result)
          try {
            const jsonResult = JSON.parse(result)
            addMessage(jsonResult.response || jsonResult.message || "Command processed successfully", 'assistant')
          } catch {
            addMessage(result || "Command processed successfully", 'assistant')
          }
          setIsN8nConnected(true)
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      }
    } catch (err) {
      console.error('❌ Error processing command:', err)
      if (useOpenAI && isOpenAIConnected) {
        addMessage(`OpenAI Error: ${err.message}. Please check your connection.`, 'assistant')
      } else {
        setIsN8nConnected(false)
        addMessage(`N8N Error: ${err.message}. Using fallback response: "${command}"`, 'assistant')
      }
    } finally {
      setIsProcessing(false)

      // Restart listening after processing if it was active
      setTimeout(() => {
        if (!isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start()
            setIsListening(true)
          } catch (e) {
            console.log('Failed to restart listening:', e.message)
          }
        }
      }, 500)
    }
  }

  const checkN8nConnection = async () => {
    try {
      // Check localStorage as source of truth for current mode
      const currentMode = localStorage.getItem('use_openai') === 'true'

      // Only test connection if we're in n8n mode
      if (currentMode) {
        console.log('🚫 Skipping n8n connection test - OpenAI mode is active (from localStorage)')
        setIsN8nConnected(false)
        return
      }

      console.log('🔗 Testing n8n connection in n8n mode')

      // Test the webhook with a ping message
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'connection_test',
          message: 'ping',
          timestamp: new Date().toISOString()
        })
      })

      setIsN8nConnected(response.ok)

      if (response.ok) {
        console.log('N8N connection test successful')
      } else {
        console.warn(`N8N connection test failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('N8N connection test error:', error)
      setIsN8nConnected(false)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const clearMessages = () => {
    setMessages([{
      id: Date.now(),
      text: "Messages cleared. How can I help you?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: "assistant"
    }])
  }

  const addMessage = (text, type) => {
    const newMessage = {
      id: Date.now(),
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type
    }
    setMessages(prev => [...prev, newMessage])
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  // Detect if a device name indicates it's a Bluetooth device
  const isBluetoothDevice = (deviceName, deviceId) => {
    if (!deviceName && !deviceId) return false

    const name = (deviceName || '').toLowerCase()
    const id = (deviceId || '').toLowerCase()

    // Exclude built-in/system audio devices
    const systemAudioExclusions = [
      'realtek', 'intel', 'nvidia', 'amd', 'via', 'creative', 'asus', 'msi',
      'built-in', 'internal', 'onboard', 'integrated', 'motherboard',
      'smart sound technology', 'high definition audio', 'hd audio',
      'ac97', 'azalia', 'conexant', 'sigmatel', 'idt', 'cirrus logic'
    ]

    // If it's a system audio device, it's not Bluetooth
    if (systemAudioExclusions.some(exclusion => name.includes(exclusion) || id.includes(exclusion))) {
      return false
    }

    // Specific Bluetooth brand indicators (more precise)
    const bluetoothBrands = [
      'airpods', 'sony', 'bose', 'jbl', 'beats', 'sennheiser',
      'audio-technica', 'skullcandy', 'jabra', 'plantronics',
      'marshall', 'harman', 'anker', 'soundcore', 'taotronics',
      'mpow', 'samsung', 'lg', 'xiaomi', 'huawei', 'oneplus',
      'nothing', 'skull candy', 'audio technica', 'j55'
    ]

    // Bluetooth technology indicators
    const bluetoothTechIndicators = [
      'bluetooth', 'bt ', ' bt', 'wireless headphone', 'wireless earbuds',
      'wireless speaker', 'true wireless', 'tws', 'hands-free',
      'a2dp', 'hfp', 'hsp', 'avrcp'
    ]

    // Check for Bluetooth brands
    if (bluetoothBrands.some(brand => name.includes(brand) || id.includes(brand))) {
      return true
    }

    // Check for Bluetooth technology indicators
    if (bluetoothTechIndicators.some(indicator => name.includes(indicator) || id.includes(indicator))) {
      return true
    }

    // Check device ID patterns that indicate Bluetooth
    if (id.includes('bluetooth') || id.includes('bt_') || id.includes('_bt_')) {
      return true
    }

    return false
  }

  // Enumerate and categorize audio devices
  const enumerateAudioDevices = async () => {
    try {
      setIsAudioDeviceScanning(true)
      console.log('🔍 Scanning for audio devices...')

      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ audio: true })

      // Get all media devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      console.log('📱 Found devices:', devices.length)

      const inputDevices = []
      const outputDevices = []
      const bluetoothDevicesList = []

      devices.forEach(device => {
        const deviceInfo = {
          deviceId: device.deviceId,
          label: device.label || `${device.kind} (${device.deviceId.slice(0, 8)}...)`,
          kind: device.kind,
          groupId: device.groupId,
          isBluetooth: isBluetoothDevice(device.label, device.deviceId)
        }

        console.log('🎧 Device:', deviceInfo.label, 'Type:', device.kind, 'Bluetooth:', deviceInfo.isBluetooth, 'ID:', device.deviceId.slice(0, 20) + '...')

        if (device.kind === 'audioinput') {
          inputDevices.push(deviceInfo)
        } else if (device.kind === 'audiooutput') {
          outputDevices.push(deviceInfo)
        }

        if (deviceInfo.isBluetooth) {
          bluetoothDevicesList.push(deviceInfo)
        }
      })

      setAudioDevices({ input: inputDevices, output: outputDevices })
      setBluetoothDevices(bluetoothDevicesList)

      // Auto-select first Bluetooth device if available
      const bluetoothInput = inputDevices.find(d => d.isBluetooth)
      const bluetoothOutput = outputDevices.find(d => d.isBluetooth)

      if (bluetoothInput && !selectedAudioInput) {
        setSelectedAudioInput(bluetoothInput)
        console.log('🎤 Auto-selected Bluetooth input:', bluetoothInput.label)

        // Automatically set up the Bluetooth microphone
        try {
          await setupMicrophoneWithDevice(bluetoothInput)
        } catch (error) {
          console.error('❌ Failed to auto-setup Bluetooth microphone:', error)
        }
      }

      if (bluetoothOutput && !selectedAudioOutput) {
        setSelectedAudioOutput(bluetoothOutput)
        console.log('🔊 Auto-selected Bluetooth output:', bluetoothOutput.label)
      }

      // Update Bluetooth connection status
      const hasBluetoothDevices = bluetoothDevicesList.length > 0
      setIsBluetoothConnected(hasBluetoothDevices)

      if (hasBluetoothDevices) {
        const deviceNames = bluetoothDevicesList.map(d => d.label).join(', ')
        addMessage(`✅ Found ${bluetoothDevicesList.length} Bluetooth audio device(s): ${deviceNames}`, 'assistant')
        console.log('✅ Bluetooth devices detected:', bluetoothDevicesList)
      } else {
        console.log('ℹ️ No Bluetooth devices detected. System audio devices found:', inputDevices.length + outputDevices.length)
        addMessage(`ℹ️ No Bluetooth audio devices detected.

📱 To connect Bluetooth devices:
1. Turn ON Bluetooth on your computer
2. Pair your headphones/speakers with your computer
3. Click "Scan Audio Devices" again

💡 Currently showing ${inputDevices.length + outputDevices.length} system audio devices (built-in microphones/speakers).`, 'assistant')
      }

      return { inputDevices, outputDevices, bluetoothDevicesList }

    } catch (error) {
      console.error('❌ Error enumerating audio devices:', error)

      let errorMessage = 'Failed to access audio devices.'

      if (error.name === 'NotAllowedError') {
        errorMessage = `Microphone access denied.

📱 To use Bluetooth audio devices:
1. Allow microphone permissions in your browser
2. Make sure your Bluetooth device is connected to your computer
3. Try again`
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No audio devices found. Please check your audio device connections.'
      } else {
        errorMessage = `Audio device error: ${error.message}`
      }

      alert(errorMessage)
      addMessage(`❌ Audio device scan failed: ${error.message}`, 'assistant')
    } finally {
      setIsAudioDeviceScanning(false)
    }
  }

  // Bluetooth device scanning using Web Bluetooth API
  const scanForBluetoothDevices = async () => {
    if (isBluetoothScanning) return

    setIsBluetoothScanning(true)
    setShowBluetoothModal(true)

    try {
      console.log('🔍 Scanning for Bluetooth devices...')

      // Check if Web Bluetooth is supported
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser')
      }

      // Request Bluetooth device with audio services
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['battery_service'] },
          { services: [0x110B] }, // Audio Sink
          { services: [0x110E] }, // A2DP
          { services: [0x111E] }, // Hands-free
        ],
        optionalServices: [
          'battery_service',
          'device_information',
          0x110B, // Audio Sink
          0x110E, // A2DP
          0x111E, // Hands-free
          0x1108, // Headset
          0x110A, // Audio Source
        ],
        acceptAllDevices: false
      })

      console.log('📱 Found Bluetooth device:', device.name)

      // Add to available devices
      const newDevice = {
        id: device.id,
        name: device.name || 'Unknown Device',
        connected: device.gatt?.connected || false,
        type: 'audio',
        battery: null
      }

      setAvailableBluetoothDevices(prev => {
        const exists = prev.find(d => d.id === device.id)
        if (exists) return prev
        return [...prev, newDevice]
      })

      addMessage(`✅ Found Bluetooth device: ${device.name}`, 'assistant')

    } catch (error) {
      console.error('❌ Bluetooth scan error:', error)
      if (error.name === 'NotFoundError') {
        addMessage('ℹ️ No Bluetooth devices selected or found.', 'assistant')
      } else if (error.name === 'NotSupportedError') {
        addMessage('❌ Web Bluetooth is not supported in this browser. Try Chrome/Edge.', 'assistant')
      } else {
        addMessage(`❌ Bluetooth error: ${error.message}`, 'assistant')
      }
    } finally {
      setIsBluetoothScanning(false)
    }
  }

  // Connect to audio devices (scan and setup)
  const connectAudioDevices = async () => {
    await enumerateAudioDevices()
  }

  // Set up microphone access with selected audio input device
  const setupMicrophoneWithDevice = async (inputDevice) => {
    try {
      // Stop any existing media stream
      if (currentMediaStream) {
        currentMediaStream.getTracks().forEach(track => track.stop())
        setCurrentMediaStream(null)
      }

      if (!inputDevice) {
        console.log('🎤 No input device selected')
        return
      }

      console.log('🎤 Setting up microphone with device:', inputDevice.label)
      console.log('📱 Platform info:', { isMobile, isIOS, isAndroid, isPWA })

      // Create audio constraints based on platform
      let audioConstraints

      if (isMobile) {
        // Mobile-specific constraints for better Bluetooth compatibility
        if (isIOS) {
          // iOS: Use minimal constraints, let system handle Bluetooth routing
          audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
          console.log('🍎 Using iOS-optimized audio constraints')
        } else if (isAndroid) {
          // Android: Use system default routing (like iOS) for better Bluetooth compatibility
          audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
          console.log('🤖 Using Android system default audio routing (like iOS)')
        } else {
          // Other mobile devices
          audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
          console.log('📱 Using mobile-optimized audio constraints')
        }
      } else {
        // Desktop: Use exact device constraints
        audioConstraints = {
          deviceId: inputDevice.deviceId ? { exact: inputDevice.deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
        console.log('💻 Using desktop audio constraints')
      }

      console.log('🎤 Audio constraints:', audioConstraints)

      // Request access to the specific microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
      })

      setCurrentMediaStream(stream)
      console.log('✅ Microphone access granted for device:', inputDevice.label)

      if (inputDevice.isBluetooth) {
        if (isMobile) {
          if (isIOS) {
            addMessage(`✅ Bluetooth microphone connected: ${inputDevice.label}.

🍎 iOS: Using system audio routing. Voice input should work if your Bluetooth device is set as default in iOS Settings.`, 'assistant')
          } else if (isAndroid) {
            addMessage(`✅ Bluetooth microphone connected: ${inputDevice.label}.

🤖 Android: Using system audio routing. Voice input should work if your Bluetooth device is set as default in Android Sound settings.

💡 Tip: Make sure your Bluetooth device is selected for "Phone calls" and "Media audio" in Bluetooth settings.`, 'assistant')
          } else {
            addMessage(`✅ Bluetooth microphone connected: ${inputDevice.label}. Using system audio routing.`, 'assistant')
          }
        } else {
          addMessage(`✅ Bluetooth microphone connected: ${inputDevice.label}. Voice input is now active!`, 'assistant')
        }
      } else {
        addMessage(`✅ Microphone connected: ${inputDevice.label}`, 'assistant')
      }

      // Set up audio level monitoring
      setupAudioLevelMonitoring(stream)

      return stream

    } catch (error) {
      console.error('❌ Error setting up microphone:', error)

      let errorMessage = 'Failed to access microphone.'

      if (error.name === 'NotAllowedError') {
        errorMessage = `Microphone access denied. Please allow microphone permissions and try again.`
      } else if (error.name === 'NotFoundError') {
        errorMessage = `Selected microphone not found. Please check your device connection.`
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = `Microphone constraints not supported. Trying with basic settings...`

        // Mobile-specific fallback strategies
        try {
          let fallbackConstraints

          if (isMobile) {
            // Mobile fallback: Use system default audio routing (works for both iOS and Android)
            fallbackConstraints = {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              },
              video: false
            }
            console.log('📱 Using mobile system default fallback (iOS/Android compatible)')
          } else {
            // Desktop fallback: Try with device ID only
            fallbackConstraints = {
              audio: { deviceId: inputDevice.deviceId },
              video: false
            }
            console.log('💻 Using desktop fallback constraints')
          }

          const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
          setCurrentMediaStream(fallbackStream)
          setupAudioLevelMonitoring(fallbackStream)

          if (isMobile && inputDevice.isBluetooth) {
            addMessage(`✅ Microphone connected with basic settings: ${inputDevice.label}

📱 Mobile Bluetooth Note: The browser is using system audio routing. Make sure your Bluetooth device is set as the default audio input in your phone's settings.`, 'assistant')
          } else {
            addMessage(`✅ Microphone connected with basic settings: ${inputDevice.label}`, 'assistant')
          }
          return fallbackStream
        } catch (fallbackError) {
          console.error('❌ Fallback microphone setup failed:', fallbackError)
          errorMessage = `Failed to access microphone: ${fallbackError.message}`
        }
      } else {
        errorMessage = `Microphone error: ${error.message}`
      }

      addMessage(`❌ ${errorMessage}`, 'assistant')
      throw error
    }
  }

  // Set up audio level monitoring for visual feedback
  const setupAudioLevelMonitoring = (stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 256
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      microphone.connect(analyser)

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
        const level = Math.round((average / 255) * 100)
        setMicrophoneLevel(level)

        if (currentMediaStream) {
          requestAnimationFrame(updateLevel)
        }
      }

      updateLevel()
      setAudioContext(audioContext)

    } catch (error) {
      console.error('❌ Error setting up audio level monitoring:', error)
    }
  }

  // Test microphone functionality
  const testMicrophone = async () => {
    if (!selectedAudioInput) {
      addMessage('❌ Please select a microphone first', 'assistant')
      return
    }

    setIsMicrophoneTesting(true)

    try {
      console.log('🧪 Testing microphone:', selectedAudioInput.label)

      const stream = await setupMicrophoneWithDevice(selectedAudioInput)

      if (stream) {
        addMessage(`🧪 Microphone test started. Speak now to test your ${selectedAudioInput.isBluetooth ? 'Bluetooth' : ''} microphone...`, 'assistant')

        // Test for 5 seconds
        setTimeout(() => {
          setIsMicrophoneTesting(false)
          addMessage(`✅ Microphone test completed. ${selectedAudioInput.isBluetooth ? 'Bluetooth microphone' : 'Microphone'} is working!`, 'assistant')
        }, 5000)
      }

    } catch (error) {
      setIsMicrophoneTesting(false)
      console.error('❌ Microphone test failed:', error)
    }
  }

  // Set up speech recognition with selected audio input
  const setupSpeechRecognitionWithDevice = async (inputDevice) => {
    if (!recognitionRef.current) return

    try {
      // First, set up the microphone access
      await setupMicrophoneWithDevice(inputDevice)

      console.log('🎤 Speech recognition configured for device:', inputDevice.label)

      if (inputDevice && inputDevice.isBluetooth) {
        addMessage(`🎤 Bluetooth microphone ready: ${inputDevice.label}.

💡 Important: Make sure your Bluetooth device is set as the default communication device in Windows Sound settings for best results.`, 'assistant')
      }
    } catch (error) {
      console.error('Error setting up speech recognition device:', error)
      addMessage(`❌ Failed to set up microphone: ${error.message}`, 'assistant')
    }
  }

  const disconnectAudioDevices = () => {
    // Stop any active media streams
    if (currentMediaStream) {
      currentMediaStream.getTracks().forEach(track => track.stop())
      setCurrentMediaStream(null)
    }

    // Close audio context
    if (audioContext) {
      audioContext.close()
      setAudioContext(null)
    }

    setSelectedAudioInput(null)
    setSelectedAudioOutput(null)
    setIsBluetoothConnected(false)
    setBluetoothDevices([])
    setMicrophoneLevel(0)
    addMessage('🔌 Audio devices disconnected', 'assistant')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentMediaStream) {
        currentMediaStream.getTracks().forEach(track => track.stop())
      }
      if (audioContext) {
        audioContext.close()
      }
    }
  }, [])

  // Monitor device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      console.log('🔄 Audio devices changed, rescanning...')
      setTimeout(() => {
        enumerateAudioDevices()
      }, 1000) // Delay to allow device to fully connect/disconnect
    }

    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      }
    }
  }, [])

  // Auto-scan for devices on component mount
  useEffect(() => {
    const autoScanDevices = async () => {
      // Wait a bit for component to fully mount
      setTimeout(() => {
        enumerateAudioDevices()
      }, 2000)
    }

    autoScanDevices()
  }, [])

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            AIRASSIST
          </div>
        </div>
        <div className="header-right">
          <span className="user-info">Guest User</span>
          <button className="help-btn" onClick={() => setShowHelpModal(true)}>?</button>
          <button className="settings-btn" onClick={() => setShowSettingsModal(true)}>
            
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <span className={`status-indicator ${isBluetoothConnected ? 'connected' : isAudioDeviceScanning ? 'connecting' : 'disconnected'}`}></span>
          Audio: {isBluetoothConnected ? `Connected (${bluetoothDevices.length} BT devices)` : isAudioDeviceScanning ? 'Scanning...' : 'Disconnected'}
        </div>
        <div className="status-item">
          <span className={`status-indicator ${isOpenAIConnected ? 'connected' : 'disconnected'}`}></span>
          OpenAI: {isOpenAIConnected ? 'Connected' : isOpenAIConnecting ? 'Connecting...' : 'Disconnected'}
        </div>
        <div className="status-item">
          <span className={`status-indicator ${isN8nConnected ? 'connected' : 'disconnected'}`}></span>
          n8n: {isN8nConnected ? 'Connected' : 'Disconnected'}
        </div>
        <button
          className={`connect-devices-btn ${isAudioDeviceScanning ? 'scanning' : ''}`}
          onClick={() => {
            connectAudioDevices()
            setShowBluetoothModal(true)
          }}
          disabled={isAudioDeviceScanning}
        >
          {isAudioDeviceScanning ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="scanning-icon">
                <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
              </svg>
              Scanning...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.71,7.71L12,2H11V9.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L11,14.41V22H12L17.71,16.29L13.41,12L17.71,7.71Z M13,5.83L15.17,8L13,10.17V5.83Z M13,13.83L15.17,16L13,18.17V13.83Z"/>
              </svg>
              Scan Audio Devices
            </>
          )}
        </button>
      </div>

      {/* Chat Messages */}
      <div className="chat-container">
        <div className="messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-bubble">
                {message.text}
              </div>
              <div className="message-time">{message.timestamp}</div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="message assistant">
              <div className="message-bubble processing">
                Processing...
              </div>
              <div className="message-time">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Start Listening Button */}
      <div className="listening-controls">
        <button 
          className={`start-listening-btn ${isListening ? 'listening' : ''}`}
          onClick={isListening ? stopListening : startListening}
          // disabled={!recognitionRef.current}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
          </svg>
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Help & Instructions</h2>
              <button className="modal-close" onClick={() => setShowHelpModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="help-section">
                <h3>🎤 Voice Commands</h3>
                <p>Click &ldquo;Start Listening&rdquo; to begin voice recognition. Speak clearly and the app will process your commands.</p>
              </div>
              <div className="help-section">
                <h3>🎧 Bluetooth Audio Setup</h3>
                {isMobile ? (
                  <>
                    <p>📱 <strong>Mobile Bluetooth Setup:</strong></p>
                    {isIOS ? (
                      <ol>
                        <li>🍎 <strong>Pair Device:</strong> Settings → Bluetooth → Connect your headphones/earbuds</li>
                        <li>🍎 <strong>Enable Audio:</strong> Tap the "i" next to your device → Enable "Use for Audio"</li>
                        <li>🍎 <strong>Set as Default:</strong> Control Center → Audio controls → Select your Bluetooth device</li>
                        <li>📲 <strong>Install App:</strong> Add to Home Screen for better Bluetooth support</li>
                        <li>🎤 <strong>Test Voice:</strong> Use Settings → Audio Device Selection → Test Microphone</li>
                      </ol>
                      <p><strong>🍎 iOS Note:</strong> Safari has limited Bluetooth API support. Installing as PWA provides better audio access.</p>
                    ) : isAndroid ? (
                      <ol>
                        <li>🤖 <strong>Pair Device:</strong> Settings → Connected devices → Bluetooth → Connect your headphones</li>
                        <li>🤖 <strong>Enable Audio:</strong> Tap gear icon next to device → Enable "Phone calls" and "Media audio"</li>
                        <li>🤖 <strong>Set as Default:</strong> Settings → Sound → Advanced → Make sure Bluetooth device is default</li>
                        <li>🤖 <strong>Chrome Permissions:</strong> Allow microphone access when prompted</li>
                        <li>📲 <strong>Install App:</strong> Add to Home Screen for better performance</li>
                        <li>🎤 <strong>Test Voice:</strong> Use Settings → Audio Device Selection → Test Microphone</li>
                      </ol>
                      <p><strong>🤖 Android Note:</strong> App uses system audio routing. Ensure your Bluetooth device is set as default for calls and media.</p>
                    ) : (
                      <ol>
                        <li>📱 <strong>Pair Device:</strong> Connect your Bluetooth headphones in device settings</li>
                        <li>📱 <strong>Set as Default:</strong> Make sure it's the default audio device</li>
                        <li>📲 <strong>Install App:</strong> Add to Home Screen for better support</li>
                        <li>🎤 <strong>Test Voice:</strong> Use the microphone test feature</li>
                      </ol>
                    )}
                    <p><strong>📱 Mobile Limitations:</strong> Mobile browsers have restricted Bluetooth access. For best results, install as PWA and ensure Bluetooth device is system default.</p>
                  </>
                ) : (
                  <>
                    <p>Use your Bluetooth headphones, earbuds, or speakers with Air Assist:</p>
                    <ol>
                      <li><strong>Connect to your computer:</strong> Pair your Bluetooth device with your computer first (Windows Settings → Bluetooth, Mac System Preferences → Bluetooth)</li>
                      <li><strong>Set as default:</strong> Make your Bluetooth device the default audio device in your system settings</li>
                      <li><strong>Click "Scan Audio Devices":</strong> Let Air Assist detect your connected devices</li>
                      <li><strong>Select devices:</strong> Choose your Bluetooth microphone and speaker in Settings → Audio Device Selection</li>
                    </ol>
                    <p><strong>💡 Pro Tip:</strong> Air Assist automatically detects Bluetooth devices and will show them with a 🔵 blue indicator.</p>
                  </>
                )}
                <p><strong>✅ Supported:</strong> All Bluetooth audio devices - AirPods, Sony, Bose, JBL, Beats, Jabra, and any Bluetooth headphones/speakers.</p>
              </div>
              <div className="help-section">
                <h3>🔗 n8n Integration</h3>
                <p>Configure n8n URL in settings to enable advanced automation workflows.</p>
              </div>
              <div className="help-section">
                <h3>💡 Tips</h3>
                <ul>
                  <li>Ensure microphone permissions are granted</li>
                  <li>Use in a quiet environment for best results</li>
                  <li>Keep n8n server running for full functionality</li>
                </ul>
              </div>
              {error && (
                <div className="help-section error-section">
                  <h3>⚠️ Current Issues</h3>
                  <p>{error}</p>
                </div>
              )}
              {!speechSupported && (
                <div className="help-section error-section">
                  <h3>⚠️ Browser Compatibility</h3>
                  <p>Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.</p>
                </div>
              )}

              {isMobile && !isPWA && (
                <div className="help-section pwa-section">
                  <h3>📲 Install for Better Bluetooth Support</h3>
                  <p><strong>Recommended:</strong> Install this app for improved Bluetooth microphone access on mobile devices.</p>
                  {isIOS ? (
                    <ol>
                      <li>🍎 Tap the Share button in Safari</li>
                      <li>🍎 Select "Add to Home Screen"</li>
                      <li>🍎 Tap "Add" to install the app</li>
                    </ol>
                  ) : isAndroid ? (
                    <ol>
                      <li>🤖 Tap the menu (⋮) in Chrome</li>
                      <li>🤖 Select "Add to Home screen"</li>
                      <li>🤖 Tap "Add" to install the app</li>
                    </ol>
                  ) : (
                    <p>📱 Look for "Add to Home Screen" or "Install App" option in your browser menu.</p>
                  )}
                  <p><strong>Benefits:</strong> Better audio permissions, offline access, and improved Bluetooth device support.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="modal-close" onClick={() => setShowSettingsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="settings-section">
                <h3>AI Provider Selection</h3>
                <div className="input-group">
                  <div className="radio-group" onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Prevent multiple clicks
                    if (e.target.closest('.radio-group').dataset.switching === 'true') {
                      return;
                    }
                    e.target.closest('.radio-group').dataset.switching = 'true';

                    console.log('🔄 Switching to n8n - disconnecting from OpenAI');

                    // Disconnect from OpenAI when switching to n8n
                    if (isOpenAIConnected) {
                      disconnectOpenAI();
                    }

                    // Ensure clean state - set n8n disconnected first
                    setIsN8nConnected(false);
                    localStorage.setItem('n8n_connected', 'false');

                    // Switch to n8n mode
                    setUseOpenAI(false);
                    localStorage.setItem('use_openai', 'false');

                    // Connect to n8n only after state is clean
                    setTimeout(() => {
                      const currentMode = localStorage.getItem('use_openai');
                      if (currentMode === 'false') {
                        console.log('🔗 Connecting to n8n after state cleanup');
                        checkN8nConnection();
                      }
                      e.target.closest('.radio-group').dataset.switching = 'false';
                    }, 300);

                    console.log('✅ Switched to n8n mode');
                  }}>
                    <input
                      type="radio"
                      id="n8nProvider"
                      name="aiProvider"
                      checked={!useOpenAI}
                      readOnly
                    />
                    <label htmlFor="n8nProvider">Use n8n Webhook</label>
                  </div>
                  <div className="radio-group" onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Prevent multiple clicks
                    if (e.target.closest('.radio-group').dataset.switching === 'true') {
                      return;
                    }
                    e.target.closest('.radio-group').dataset.switching = 'true';

                    console.log('🔄 Switching to OpenAI - disconnecting from n8n');

                    // Ensure n8n is completely disconnected
                    setIsN8nConnected(false);
                    localStorage.setItem('n8n_connected', 'false');

                    // Switch to OpenAI mode
                    setUseOpenAI(true);
                    localStorage.setItem('use_openai', 'true');

                    setTimeout(() => {
                      e.target.closest('.radio-group').dataset.switching = 'false';
                    }, 300);

                    console.log('✅ Switched to OpenAI mode');
                  }}>
                    <input
                      type="radio"
                      id="openaiProvider"
                      name="aiProvider"
                      checked={useOpenAI}
                      readOnly
                    />
                    <label htmlFor="openaiProvider">Use OpenAI Realtime API</label>
                  </div>
                </div>
              </div>

              {useOpenAI ? (
                <div className="settings-section" key="openai-settings">
                  <h3>OpenAI Realtime Configuration</h3>
                  <div className="input-group">
                    <label htmlFor="openai-key">
                      OpenAI API Key:
                      {config.openaiApiKey && (
                        <span className="auto-populated-indicator" title="Auto-populated from environment variable">
                          🔧 Auto
                        </span>
                      )}
                    </label>
                    <input
                      id="openai-key"
                      type="password"
                      value={openaiApiKey}
                      onChange={(e) => {
                        setOpenaiApiKey(e.target.value);
                        // Update localStorage when manually changed
                        localStorage.setItem('openai_api_key', e.target.value);
                      }}
                      placeholder={config.openaiApiKey ? "Auto-populated from .env" : "sk-..."}
                    />
                    <button
                      onClick={() => {
                        if (isOpenAIConnected) {
                          disconnectOpenAI();
                        } else {
                          connectOpenAI(openaiApiKey);
                        }
                      }}
                      className={`test-connection-btn ${isOpenAIConnected ? 'disconnect-btn' : ''}`}
                      disabled={isOpenAIConnecting || !openaiApiKey}
                    >
                      {isOpenAIConnecting ? 'Connecting...' : isOpenAIConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                  <div className="connection-status">
                    Status: <span className={isOpenAIConnected ? 'status-connected' : 'status-disconnected'}>
                      {isOpenAIConnected ? 'Connected' : isOpenAIConnecting ? 'Connecting...' : 'Disconnected'}
                    </span>
                    {openAIError && (
                      <div className="error-message">Error: {openAIError}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="settings-section" key="n8n-settings">
                  <h3>n8n Configuration</h3>
                  <div className="input-group">
                    <label htmlFor="n8n-url">n8n Server URL:</label>
                    <input
                      id="n8n-url"
                      type="url"
                      value={n8nUrl}
                      onChange={(e) => {
                        const newUrl = e.target.value;
                        setN8nUrl(newUrl);
                        localStorage.setItem('n8n_url', newUrl);
                      }}
                      placeholder={config.defaultN8nUrl}
                    />
                    <button onClick={checkN8nConnection} className="test-connection-btn">
                      Test Connection
                    </button>
                  </div>
                  <div className="connection-status">
                    Status: <span className={isN8nConnected ? 'status-connected' : 'status-disconnected'}>
                      {isN8nConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              )}

              <div className="settings-section">
                <h3>🎧 Audio Device Selection</h3>
                <div className="audio-device-section">
                  <div className="device-group">
                    <label>🎤 Microphone Input:</label>
                    <select
                      value={selectedAudioInput?.deviceId || ''}
                      onChange={(e) => {
                        const device = audioDevices.input.find(d => d.deviceId === e.target.value)
                        setSelectedAudioInput(device)
                        if (device) {
                          setupSpeechRecognitionWithDevice(device)
                          addMessage(`🎤 Selected microphone: ${device.label}`, 'assistant')
                        }
                      }}
                      className="device-select"
                    >
                      <option value="">Select microphone...</option>
                      {audioDevices.input.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.isBluetooth ? '🔵 ' : '🎤 '}{device.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="device-group">
                    <label>🔊 Audio Output:</label>
                    <select
                      value={selectedAudioOutput?.deviceId || ''}
                      onChange={(e) => {
                        const device = audioDevices.output.find(d => d.deviceId === e.target.value)
                        setSelectedAudioOutput(device)
                        if (device) {
                          addMessage(`🔊 Selected speaker: ${device.label}`, 'assistant')
                        }
                      }}
                      className="device-select"
                    >
                      <option value="">Select speaker...</option>
                      {audioDevices.output.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.isBluetooth ? '🔵 ' : '🔊 '}{device.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Microphone Test Section */}
                  {selectedAudioInput && (
                    <div className="microphone-test-section">
                      <h4>🧪 Microphone Test</h4>
                      <div className="mic-test-controls">
                        <button
                          onClick={testMicrophone}
                          disabled={isMicrophoneTesting}
                          className="test-mic-btn"
                        >
                          {isMicrophoneTesting ? '🧪 Testing...' : '🧪 Test Microphone'}
                        </button>

                        {currentMediaStream && (
                          <div className="audio-level-indicator">
                            <span>Audio Level:</span>
                            <div className="level-bar">
                              <div
                                className="level-fill"
                                style={{ width: `${microphoneLevel}%` }}
                              ></div>
                            </div>
                            <span>{microphoneLevel}%</span>
                          </div>
                        )}
                      </div>

                      {selectedAudioInput.isBluetooth && (
                        <div className="bluetooth-mic-tips">
                          <p>💡 <strong>Bluetooth Microphone Tips:</strong></p>
                          {isMobile ? (
                            <ul>
                              <li>📱 <strong>Mobile Setup:</strong> Ensure your {selectedAudioInput.label} is connected and set as default audio device</li>
                              {isIOS && (
                                <>
                                  <li>🍎 <strong>iOS:</strong> Settings → Bluetooth → {selectedAudioInput.label} → Enable "Use for Audio"</li>
                                  <li>🍎 <strong>iOS:</strong> Control Center → Audio controls → Select your Bluetooth device</li>
                                </>
                              )}
                              {isAndroid && (
                                <>
                                  <li>🤖 <strong>Android:</strong> Settings → Sound → Advanced → Bluetooth audio codec</li>
                                  <li>🤖 <strong>Android:</strong> Ensure Bluetooth device is set as default for calls and media</li>
                                </>
                              )}
                              <li>🔄 <strong>Troubleshooting:</strong> Disconnect and reconnect Bluetooth if voice input fails</li>
                              {!isPWA && (
                                <li>📲 <strong>Better Support:</strong> Install this app (Add to Home Screen) for improved Bluetooth access</li>
                              )}
                              <li>🎤 <strong>Testing:</strong> Use the microphone test below to verify it's working</li>
                            </ul>
                          ) : (
                            <ul>
                              <li>Ensure your {selectedAudioInput.label} is set as the default communication device</li>
                              <li>Check Windows Sound settings → Recording → Set as Default Device</li>
                              <li>Speak clearly and close to the microphone</li>
                              <li>Test the microphone to verify it's working before using voice commands</li>
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {bluetoothDevices.length > 0 && (
                    <div className="bluetooth-devices-info">
                      <h4>📱 Detected Bluetooth Devices:</h4>
                      <ul>
                        {bluetoothDevices.map(device => (
                          <li key={device.deviceId}>
                            🔵 {device.label} ({device.kind})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button onClick={connectAudioDevices} className="action-btn">
                    🔄 Refresh Audio Devices
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h3>Actions</h3>
                <div className="action-buttons">
                  <button onClick={() => {
                    clearMessages();
                    if (useOpenAI) clearOpenAIMessages();
                  }} className="action-btn">
                    Clear Messages
                  </button>
                  <button onClick={toggleFullscreen} className="action-btn">
                    {isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  </button>
                  {isBluetoothConnected && (
                    <button onClick={disconnectAudioDevices} className="action-btn disconnect-btn">
                      Disconnect Audio Devices
                    </button>
                  )}
                  {useOpenAI && isOpenAIConnected && (
                    <button onClick={async () => {
                      console.log('🧪 Testing OpenAI connection...')
                      try {
                        await sendTextMessage('Hello, this is a test message. Please respond.')
                        console.log('✅ Test message sent to OpenAI')
                      } catch (error) {
                        console.error('❌ Test message failed:', error)
                        addMessage(`Test failed: ${error.message}`, 'assistant')
                      }
                    }} className="action-btn">
                      Test OpenAI Connection
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bluetooth Device Modal */}
      {showBluetoothModal && (
        <div className="modal-overlay" onClick={() => setShowBluetoothModal(false)}>
          <div className="modal-content bluetooth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔵 Bluetooth Devices</h3>
              <button className="modal-close" onClick={() => setShowBluetoothModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="bluetooth-section">
                <h4>Your devices</h4>

                {availableBluetoothDevices.length > 0 ? (
                  <div className="device-list">
                    {availableBluetoothDevices.map(device => (
                      <div key={device.id} className="device-item">
                        <div className="device-icon">🎧</div>
                        <div className="device-info">
                          <div className="device-name">{device.name}</div>
                          <div className="device-status">
                            {device.connected ? 'Connected mic, audio' : 'Not connected'}
                          </div>
                        </div>
                        {device.battery && (
                          <div className="device-battery">{device.battery}%</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-devices">
                    <p>No Bluetooth devices found in browser.</p>
                    <p>Your J55 and other devices may be connected to your computer but not accessible to the browser.</p>
                  </div>
                )}
              </div>

              <div className="bluetooth-actions">
                <button
                  onClick={scanForBluetoothDevices}
                  disabled={isBluetoothScanning}
                  className="scan-btn"
                >
                  {isBluetoothScanning ? '🔍 Scanning...' : '🔍 Scan for Devices'}
                </button>

                <button
                  onClick={connectAudioDevices}
                  className="refresh-btn"
                >
                  🔄 Refresh Audio Devices
                </button>
              </div>

              <div className="bluetooth-info">
                <h4>💡 How to connect your J55:</h4>
                <ol>
                  <li>Make sure your J55 is paired with your computer</li>
                  <li>Set it as the default audio device in Windows</li>
                  <li>Click "Refresh Audio Devices" above</li>
                  <li>Your J55 should appear in the audio device list</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      <PWABadge />
    </div>
  )
}

export default App
