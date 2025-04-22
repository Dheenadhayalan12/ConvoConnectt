import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: any;
}

const TopicScreen = () => {
  const route = useRoute();
  const { topic } = route.params as { topic: string };

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const topicKey = topic.toLowerCase().trim();

  useEffect(() => {
    const messagesRef = collection(db, "topics", topicKey, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName || "User", // Fallback to "User" instead of "Anonymous"
          message: data.message,
          timestamp: data.timestamp,
        });
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [topicKey]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const user = auth.currentUser;
    if (!user) return;

    // Ensure we have a display name
    const displayName = user.displayName || user.email?.split('@')[0] || "User";

    const messageRef = collection(db, "topics", topicKey, "messages");
    await addDoc(messageRef, {
      senderId: user.uid,
      senderName: displayName, // Use the determined display name
      message: newMessage,
      timestamp: serverTimestamp(),
    });

    setNewMessage("");
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      return format(timestamp.toDate(), "h:mm a");
    } catch (error) {
      return "";
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === auth.currentUser?.uid;

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
        ]}
      >
        {!isCurrentUser && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          ]}
        >
          <Text style={isCurrentUser ? styles.currentUserText : styles.otherUserText}>
            {item.message}
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.topicTitle}>{topic}</Text>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.chatContainer}
          inverted={false}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity 
            onPress={sendMessage} 
            style={styles.sendButton}
            disabled={!newMessage.trim()}
          >
            <Ionicons 
              name="send" 
              size={24} 
              color={newMessage.trim() ? "#007AFF" : "#ccc"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  topicTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  chatContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  messageContainer: {
    marginBottom: 15,
  },
  currentUserContainer: {
    alignItems: "flex-end",
  },
  otherUserContainer: {
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 18,
  },
  currentUserBubble: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  currentUserText: {
    color: "#fff",
    fontSize: 16,
  },
  otherUserText: {
    color: "#333",
    fontSize: 16,
  },
  timestamp: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
    marginHorizontal: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: "#333",
  },
  sendButton: {
    marginLeft: 10,
    padding: 10,
  },
});

export default TopicScreen;