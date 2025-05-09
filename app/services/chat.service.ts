import { API_BASE_URL } from "./constants";
import { authService } from "./auth.service";
import { socketService } from "./socket.service";

interface Pharmacy {
  _id: string;
  pharmacyName: string;
  email: string;
  isVerified: boolean;
  isOnline?: boolean;
}

interface Conversation {
  _id: string;
  participants: string[];
  participantDetails: {
    _id: string;
    username: string;
    pharmacyName?: string;
    userType: string;
  }[];
  lastMessage?: {
    content: string;
    sender: string;
    createdAt: string;
    readAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Message {
  _id: string;
  conversation: string;
  sender: string;
  senderName: string;
  content: string;
  createdAt: string;
  readAt?: string;
  attachment?: {
    url: string;
    filename: string;
    contentType: string;
    size: number;
  };
}

export const chatService = {
  // Get all verified pharmacies for the patient to choose from
  async getPharmacies(): Promise<Pharmacy[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/pharmacies`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authService.getToken()}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pharmacies: ${response.statusText}`);
      }

      const data = await response.json();
      // Ensure we return an array even if the API response is unexpected
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error fetching pharmacies:", error);
      // Return an empty array instead of rethrowing the error
      return [];
    }
  },

  // Get all conversations for the current user
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authService.getToken()}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch conversations: ${response.statusText}`
        );
      }

      const data = await response.json();
      // Ensure we return an array even if the API response is unexpected
      return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
      console.error("Error fetching conversations:", error);
      // Return an empty array instead of rethrowing the error
      return [];
    }
  },

  // Create a new conversation with a pharmacy
  async createConversation(pharmacyId: string): Promise<Conversation> {
    try {
      // Log the request for debugging
      console.log("Creating conversation with pharmacy ID:", pharmacyId);

      const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authService.getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ participantId: pharmacyId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          `Failed to create conversation: ${response.status} ${response.statusText}` +
            (errorData ? ` - ${JSON.stringify(errorData)}` : "")
        );
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  },

  // Get messages for a specific conversation
  async getMessages(conversationId: string): Promise<Message[]> {
    if (!conversationId) {
      console.error("getMessages called with no conversationId");
      return [];
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authService.getToken()}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }

      const data = await response.json();
      // Ensure we return an array even if the API response is unexpected
      return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
      console.error("Error fetching messages:", error);
      // Return an empty array instead of rethrowing the error
      return [];
    }
  },

  // Send a message in a conversation
  async sendMessage(
    conversationId: string,
    content: string,
    file?: File
  ): Promise<Message | null> {
    if (!conversationId) {
      console.error("sendMessage called with no conversationId");
      return null;
    }

    try {
      // Clear typing indicator when sending a message
      this.sendTypingStatus(conversationId, false);
      
      // If there's a file, use FormData to send both text and file
      if (file) {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('attachment', file);
        
        const response = await fetch(
          `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authService.getToken()}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.statusText}`);
        }

        const data = await response.json();
        return data?.data || null;
      } else {
        // Regular text message without attachment
        const response = await fetch(
          `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authService.getToken()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ content }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.statusText}`);
        }

        const data = await response.json();
        return data?.data || null;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  // Mark messages as read
  async markMessagesAsRead(conversationId: string): Promise<boolean> {
    if (!conversationId) {
      console.error("markMessagesAsRead called with no conversationId");
      return false;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/chat/conversations/${conversationId}/read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authService.getToken()}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error("Error marking messages as read:", error);
      return false;
    }
  },

  // Send typing indicator
  sendTypingStatus(conversationId: string, isTyping: boolean): boolean {
    return socketService.sendTypingStatus(conversationId, isTyping);
  },

  // Setup typing indicator listener
  setupTypingStatusListener(
    callback: (data: { conversationId: string, userId: string, isTyping: boolean }) => void
  ): boolean {
    return socketService.setupTypingStatusListener(callback);
  },

  // Remove typing indicator listener
  removeTypingStatusListener(): void {
    socketService.removeTypingStatusListener();
  },

  // Check if a user is online
  async checkUserOnlineStatus(userId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chat/status/${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authService.getToken()}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to check user status: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.isOnline;
    } catch (error) {
      console.error("Error checking user status:", error);
      return false;
    }
  },

  // Subscribe to socket connection state changes
  subscribeToConnectionState(listener: (connected: boolean) => void) {
    return socketService.subscribeToConnectionState(listener);
  },
};
