import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "@remix-run/react";
import { chatService } from "~/services/chat.service";
import { authService } from "~/services/auth.service";
import { socketService } from "~/services/socket.service";

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

interface ChatMessagesProps {
  conversationId: string;
  pharmacyName: string;
}

export default function ChatMessages({
  conversationId,
  pharmacyName,
}: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [remotePeerTyping, setRemotePeerTyping] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const currentUserId = authService.getUserInfo()?._id || "";

  // Fetch messages when component mounts or conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const messageData = await chatService.getMessages(conversationId);
        // Ensure we have valid data
        setMessages(Array.isArray(messageData) ? messageData : []);
        setError(null);
        
        // Mark messages as read
        if (messageData.length > 0) {
          await chatService.markMessagesAsRead(conversationId);
        }
      } catch (err) {
        setError("Failed to load messages. Please try again later.");
        console.error(err);
        // Ensure messages is set to an empty array on error
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      fetchMessages();
    } else {
      setError("No conversation ID provided");
      setLoading(false);
    }
  }, [conversationId]);

  // Setup socket connection state
  useEffect(() => {
    const unsubscribe = chatService.subscribeToConnectionState((connected) => {
      setSocketConnected(connected);
      
      // If reconnected, refresh messages
      if (connected && conversationId) {
        chatService.getMessages(conversationId).then(messageData => {
          setMessages(Array.isArray(messageData) ? messageData : []);
        });
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [conversationId]);

  // Setup socket listening for new messages
  useEffect(() => {
    const socket = socketService.getSocket();

    if (socket) {
      // Listen for new messages in this conversation
      const handleNewMessage = (message: Message) => {
        if (message.conversation === conversationId) {
          setMessages((prevMessages) => [...prevMessages, message]);
          
          // Mark message as read immediately
          chatService.markMessagesAsRead(conversationId);
        }
      };

      socket.on("new_message", handleNewMessage);

      return () => {
        socket.off("new_message", handleNewMessage);
      };
    }
  }, [conversationId]);

  // Setup typing indicator listener
  useEffect(() => {
    const setupTyping = async () => {
      const success = chatService.setupTypingStatusListener((data) => {
        if (data.conversationId === conversationId && data.userId !== currentUserId) {
          setRemotePeerTyping(data.isTyping);
        }
      });
      
      if (!success) {
        console.warn("Failed to set up typing status listener");
      }
    };
    
    setupTyping();
    
    return () => {
      chatService.removeTypingStatusListener();
    };
  }, [conversationId, currentUserId]);

  // Handle sending typing indicator
  const handleTyping = useCallback(() => {
    // Clear any existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Only send the typing event if we weren't already typing
    if (!isTyping) {
      setIsTyping(true);
      chatService.sendTypingStatus(conversationId, true);
    }
    
    // Set a timeout to clear the typing status after 2 seconds of inactivity
    const timeout = setTimeout(() => {
      setIsTyping(false);
      chatService.sendTypingStatus(conversationId, false);
    }, 2000);
    
    setTypingTimeout(timeout);
  }, [conversationId, isTyping, typingTimeout]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, remotePeerTyping]);

  // Format timestamp for messages
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Handle selecting a file
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Limit file size to 5MB
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit");
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  // Handle triggering file input click
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  // Handle removing selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!newMessage.trim() && !selectedFile) || !conversationId) return;

    try {
      setSending(true);
      const sentMessage = await chatService.sendMessage(
        conversationId,
        newMessage.trim(),
        selectedFile || undefined
      );

      // Clear the file attachment
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // If the message was sent successfully and not already added by socket, add it to the list
      if (sentMessage && !messages.some((m) => m._id === sentMessage._id)) {
        setMessages((prevMessages) => [...prevMessages, sentMessage]);
      }

      setNewMessage("");
      setError(null);
      
      // Focus the text input after sending
      textInputRef.current?.focus();
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return [];
    }

    const groups: { [key: string]: Message[] } = {};

    messages.forEach((message) => {
      if (!message || !message.createdAt) return;

      try {
        const date = new Date(message.createdAt).toLocaleDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(message);
      } catch (e) {
        console.error("Error processing message date:", e);
      }
    });

    return Object.entries(groups).map(([date, msgs]) => ({
      date,
      messages: msgs,
    }));
  };

  // Render attachment preview
  const renderAttachment = (attachment: Message['attachment']) => {
    if (!attachment) return null;
    
    // Check if it's an image
    const isImage = attachment.contentType.startsWith('image/');
    
    if (isImage) {
      return (
        <div className="mt-2 max-w-xs">
          <a href={attachment.url} target="_blank" rel="noopener noreferrer">
            <img 
              src={attachment.url} 
              alt={attachment.filename} 
              className="rounded-md max-h-40 object-contain"
            />
          </a>
        </div>
      );
    }
    
    // For other file types
    return (
      <div className="mt-2 p-2 bg-gray-100 rounded-md flex items-center max-w-xs">
        <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <a 
          href={attachment.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs text-blue-600 truncate"
        >
          {attachment.filename}
          <span className="text-gray-500 ml-1">
            ({Math.round(attachment.size / 1024)}KB)
          </span>
        </a>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate();

  return (
    <div className="flex flex-col h-full">
      {/* Conversation header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">{pharmacyName}</h2>
        <div className="flex items-center">
          {socketConnected ? (
            <span className="inline-flex items-center text-sm text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center text-sm text-red-600">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
              Disconnected
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>No messages yet</p>
            <p className="text-sm mt-1">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          messageGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-6">
              <div className="flex justify-center mb-4">
                <div className="px-3 py-1 bg-gray-200 rounded-full text-xs text-gray-600">
                  {formatMessageDate(group.messages[0].createdAt)}
                </div>
              </div>

              {group.messages.map((message) => {
                const isCurrentUser = message.sender === currentUserId;

                return (
                  <div
                    key={message._id}
                    className={`flex mb-4 ${
                      isCurrentUser ? "justify-end" : "justify-start"
                    }`}>
                    <div
                      className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                        isCurrentUser
                          ? "bg-indigo-600 text-white"
                          : "bg-white border border-gray-200 text-gray-800"
                      }`}>
                      <div className="text-sm">{message.content}</div>
                      
                      {/* Render attachment if exists */}
                      {message.attachment && renderAttachment(message.attachment)}
                      
                      <div
                        className={`text-xs mt-1 flex justify-end items-center ${
                          isCurrentUser ? "text-indigo-200" : "text-gray-500"
                        }`}>
                        <span>{formatMessageTime(message.createdAt)}</span>
                        
                        {/* Read receipt for current user's messages */}
                        {isCurrentUser && (
                          <span className="ml-1">
                            {message.readAt ? (
                              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {remotePeerTyping && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "400ms" }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Selected file preview */}
      {selectedFile && (
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex items-center">
          <div className="flex-1 truncate">
            <span className="text-sm font-medium text-gray-700">Selected file: </span>
            <span className="text-sm text-gray-500">{selectedFile.name}</span>
          </div>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="ml-2 text-red-600 hover:text-red-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Message input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={() => handleTyping()}
            ref={textInputRef}
            placeholder="Type your message..."
            className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            disabled={sending}
          />
          
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          
          {/* Attachment button */}
          <button
            type="button"
            onClick={handleAttachClick}
            disabled={sending}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          <button
            type="submit"
            disabled={sending || (!newMessage.trim() && !selectedFile)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {sending ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            ) : (
              <span>Send</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
