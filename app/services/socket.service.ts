import { io, Socket } from "socket.io-client";
import { authService } from "./auth.service";

const SOCKET_URL = "http://localhost:3000";

export interface MedicationReminderNotification {
  id: string;
  medicationId: string;
  medicationName: string;
  genericName?: string;
  dosage: string;
  time: string;
  instructions?: string;
  notes?: string;
  isTestReminder?: boolean;
}

// Track socket connection state
let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 2000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let connectionStateListeners: ((connected: boolean) => void)[] = [];

/**
 * Notify connection state change to listeners
 */
const notifyConnectionStateChange = (connected: boolean) => {
  connectionStateListeners.forEach(listener => listener(connected));
};

/**
 * Subscribe to connection state changes
 */
const subscribeToConnectionState = (listener: (connected: boolean) => void) => {
  connectionStateListeners.push(listener);
  
  // Immediately notify of current state
  if (listener && socket) {
    listener(socket.connected);
  }
  
  return () => {
    connectionStateListeners = connectionStateListeners.filter(l => l !== listener);
  };
};

/**
 * Attempt to reconnect the socket
 */
const attemptReconnect = () => {
  if (socket && socket.connected) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Maximum reconnection attempts reached');
    notifyConnectionStateChange(false);
    return;
  }

  reconnectAttempts++;
  console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
  
  // Clear any existing socket
  if (socket) {
    socket.off();
    socket.close();
    socket = null;
  }
  
  // Initialize a new socket
  initializeSocket();
  
  // Schedule next attempt if this one fails
  reconnectTimer = setTimeout(() => {
    if (!socket || !socket.connected) {
      attemptReconnect();
    }
  }, RECONNECT_DELAY_MS * Math.min(reconnectAttempts, 5));
};

// Initialize the socket connection
const initializeSocket = () => {
  if (socket && socket.connected) return socket;

  const token = authService.getToken();
  if (!token) return null;

  // Connect to the Socket.IO server with authentication
  socket = io(SOCKET_URL, {
    auth: { token },
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: RECONNECT_DELAY_MS,
    timeout: 10000,
  });

  // Connection event handlers
  socket.on("connect", () => {
    console.log("Socket.IO connected");
    reconnectAttempts = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    notifyConnectionStateChange(true);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket.IO connection error:", err.message);
    notifyConnectionStateChange(false);
    // Don't attempt to reconnect here, as Socket.IO will handle initial reconnection
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket.IO disconnected:", reason);
    notifyConnectionStateChange(false);
    
    // Handle disconnections that won't automatically reconnect
    if (reason === 'io server disconnect' || reason === 'io client disconnect') {
      // Server/client explicitly closed the connection, don't reconnect automatically
      console.log("Socket was manually disconnected, not attempting to reconnect");
    } else {
      // For transport errors and timeouts, try our custom reconnection logic
      // if Socket.IO's built-in reconnection fails
      setTimeout(() => {
        if (!socket || !socket.connected) {
          attemptReconnect();
        }
      }, 5000); // Wait 5 seconds to see if Socket.IO reconnects first
    }
  });

  // Setup ping/pong for connection health check
  setInterval(() => {
    if (socket && socket.connected) {
      socket.emit('ping');
    }
  }, 30000); // Send ping every 30 seconds

  socket.on('pong', () => {
    // Connection is still alive
  });

  return socket;
};

// Disconnect the socket
const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  reconnectAttempts = 0;
  notifyConnectionStateChange(false);
};

// Setup medication reminder listener
const setupMedicationReminderListener = (
  callback: (reminder: MedicationReminderNotification) => void
) => {
  const currentSocket = socket || initializeSocket();
  if (!currentSocket) return false;

  currentSocket.on("medication_reminder", callback);
  return true;
};

// Remove medication reminder listener
const removeMedicationReminderListener = () => {
  if (!socket) return;
  socket.off("medication_reminder");
};

// Send reminder response
const sendReminderResponse = (
  medicationId: string,
  reminderId: string,
  action: "taken" | "snooze" | "missed",
  snoozeMinutes?: number
) => {
  const currentSocket = socket || initializeSocket();
  if (!currentSocket) return false;

  currentSocket.emit("reminder_response", {
    medicationId,
    reminderId,
    action,
    snoozeMinutes: action === "snooze" ? snoozeMinutes || 15 : undefined,
  });

  return true;
};

// Listen for reminder updates
const setupReminderUpdateListener = (
  callback: (update: {
    medicationId: string;
    reminderId: string;
    status: string;
  }) => void
) => {
  const currentSocket = socket || initializeSocket();
  if (!currentSocket) return false;

  currentSocket.on("reminder_update", callback);
  return true;
};

// Remove reminder update listener
const removeReminderUpdateListener = () => {
  if (!socket) return;
  socket.off("reminder_update");
};

// Handle errors
const setupErrorListener = (callback: (error: any) => void) => {
  const currentSocket = socket || initializeSocket();
  if (!currentSocket) return false;

  currentSocket.on("reminder_error", callback);
  return true;
};

// Remove error listener
const removeErrorListener = () => {
  if (!socket) return;
  socket.off("reminder_error");
};

// Send typing indicator to a conversation
const sendTypingStatus = (
  conversationId: string,
  isTyping: boolean
) => {
  const currentSocket = socket || initializeSocket();
  if (!currentSocket || !currentSocket.connected) return false;

  currentSocket.emit("typing_status", {
    conversationId,
    isTyping
  });
  return true;
};

// Setup typing indicator listener
const setupTypingStatusListener = (
  callback: (data: { conversationId: string, userId: string, isTyping: boolean }) => void
) => {
  const currentSocket = socket || initializeSocket();
  if (!currentSocket) return false;

  currentSocket.on("typing_status", callback);
  return true;
};

// Remove typing indicator listener
const removeTypingStatusListener = () => {
  if (!socket) return;
  socket.off("typing_status");
};

export const socketService = {
  initializeSocket,
  disconnectSocket,
  setupMedicationReminderListener,
  removeMedicationReminderListener,
  sendReminderResponse,
  setupReminderUpdateListener,
  removeReminderUpdateListener,
  setupErrorListener,
  removeErrorListener,
  subscribeToConnectionState,
  sendTypingStatus,
  setupTypingStatusListener,
  removeTypingStatusListener,
  getSocket: () => socket,
  isConnected: () => socket?.connected || false,
};
