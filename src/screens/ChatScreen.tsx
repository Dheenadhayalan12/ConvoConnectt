import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { auth, db } from "../config/firebaseConfig";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  getDocs,
  limit,
  startAfter,
  arrayUnion,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../config/navigationTypes";

interface Message {
  id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  timestamp: Timestamp;
  status?: "sent" | "seen";
  readBy?: string[];
}

const MESSAGES_LIMIT = 20;

type ChatScreenRouteProp = RouteProp<RootStackParamList, "ChatScreen">;

export default function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { chatId, userName } = route.params;

  const userId = auth.currentUser?.uid || "";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [friendTyping, setFriendTyping] = useState(false);
  const [friendOnline, setFriendOnline] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const [user1, user2] = chatId.split("_");
  const friendId = userId === user1 ? user2 : user1;

  // Check friendship status
  const checkFriendStatus = useCallback(async () => {
    try {
      const friendDoc = await getDoc(doc(db, "friends", userId, "friendList", friendId));
      if (!friendDoc.exists()) {
        Alert.alert("Not Friends", "You can only chat with friends");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error checking friend status:", error);
      Alert.alert("Error", "Failed to verify friendship status");
      navigation.goBack();
    }
  }, [userId, friendId, navigation]);

  // Load messages
  const loadMessages = useCallback(() => {
    if (!chatId) return;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"), limit(MESSAGES_LIMIT));

    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Message, "id">),
      }));
      setMessages(msgs.reverse());
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
  }, [chatId]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(messagesRef, where("senderId", "==", friendId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (!(data.readBy || []).includes(userId)) {
          batch.update(docSnap.ref, {
            readBy: arrayUnion(userId),
            status: "seen",
          });
        }
      });

      await batch.commit();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [chatId, friendId, userId]);

  // Handle typing indicator
  const handleTypingIndicator = useCallback(async () => {
    if (!chatId || !userId) return;

    const typingRef = doc(db, "chats", chatId, "typing", userId);
    try {
      if (input.trim()) {
        await setDoc(typingRef, { typing: true }, { merge: true });
      } else {
        await setDoc(typingRef, { typing: false }, { merge: true });
      }
    } catch (error) {
      console.error("Error updating typing indicator:", error);
    }
  }, [chatId, userId, input]);

  // Listen to friend typing
  useEffect(() => {
    if (!chatId || !friendId) return;

    const typingRef = doc(db, "chats", chatId, "typing", friendId);
    const unsubscribe = onSnapshot(typingRef, (docSnap) => {
      setFriendTyping(docSnap.data()?.typing || false);
    });
    return () => unsubscribe();
  }, [chatId, friendId]);

  // Online presence tracking
  useEffect(() => {
    if (!userId || !friendId) return;

    const onlineRef = doc(db, "status", userId);
    const friendRef = doc(db, "status", friendId);

    const updateOnlineStatus = async () => {
      try {
        await setDoc(onlineRef, { online: true, lastSeen: serverTimestamp() }, { merge: true });
      } catch (error) {
        console.error("Error updating online status:", error);
      }
    };

    updateOnlineStatus();

    const unsubscribe = onSnapshot(friendRef, (docSnap) => {
      setFriendOnline(docSnap.data()?.online || false);
    });

    const interval = setInterval(() => {
      updateOnlineStatus();
    }, 30000);

    return () => {
      clearInterval(interval);
      setDoc(onlineRef, { online: false, lastSeen: serverTimestamp() }, { merge: true });
      unsubscribe();
    };
  }, [userId, friendId]);

  // Initial setup
  useEffect(() => {
    if (!userId || !chatId) return;

    const unsubscribeMessages = loadMessages();
    checkFriendStatus();

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
    };
  }, [userId, chatId, loadMessages, checkFriendStatus]);

  // Mark messages as read when they appear
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages, markMessagesAsRead]);

  // Typing indicator
  useEffect(() => {
    const timer = setTimeout(() => {
      handleTypingIndicator();
    }, 500);

    return () => clearTimeout(timer);
  }, [input, handleTypingIndicator]);

  const sendMessage = async () => {
    if (!input.trim() || !userId || !chatId) return;

    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      
      await addDoc(messagesRef, {
        senderId: userId,
        text: input.trim(),
        timestamp: serverTimestamp(),
        status: "sent",
        readBy: [userId],
      });

      setInput("");
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  };

  const loadMoreMessages = async () => {
    if (!lastVisible || loadingMore || !chatId) return;

    setLoadingMore(true);
    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(
        messagesRef,
        orderBy("timestamp", "desc"),
        startAfter(lastVisible),
        limit(MESSAGES_LIMIT)
      );

      const snapshot = await getDocs(q);
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Message, "id">),
      }));

      setMessages((prev) => [...newMessages.reverse(), ...prev]);
      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === userId;
    const messageTime = item.timestamp?.toDate()?.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <View
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUser : styles.otherUser,
        ]}
      >
        {item.text && <Text style={styles.messageText}>{item.text}</Text>}
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        )}
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>{messageTime}</Text>
          {isCurrentUser && item.status && (
            <Text style={[
              styles.statusText, 
              item.status === "seen" ? styles.seenStatus : styles.sentStatus
            ]}>
              {item.status === "seen" ? "✔✔" : "✔"}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Text style={styles.chatWith}>
          Chat with {userName} 
          {friendOnline && <Text style={styles.onlineIndicator}> • Online</Text>}
        </Text>
        {friendTyping && <Text style={styles.typingText}>{userName} is typing...</Text>}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.1}
        ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
        inverted={false}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          style={styles.textInput}
          multiline
          placeholderTextColor="#999"
        />
        <TouchableOpacity 
          onPress={sendMessage} 
          style={styles.sendButton}
          disabled={!input.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  chatWith: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  onlineIndicator: {
    color: "green",
    fontWeight: "normal",
  },
  typingText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  messageList: {
    padding: 10,
    flexGrow: 1,
  },
  messageBubble: {
    padding: 12,
    marginVertical: 6,
    borderRadius: 12,
    maxWidth: "80%",
  },
  currentUser: {
    backgroundColor: "#007bff",
    alignSelf: "flex-end",
    marginLeft: "20%",
  },
  otherUser: {
    backgroundColor: "#e9ecef",
    alignSelf: "flex-start",
    marginRight: "20%",
  },
  messageText: {
    color: "#fff",
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
  },
  seenStatus: {
    color: "#4CAF50",
  },
  sentStatus: {
    color: "#9E9E9E",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: "#fff",
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#007bff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    opacity: 1,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
  },
});