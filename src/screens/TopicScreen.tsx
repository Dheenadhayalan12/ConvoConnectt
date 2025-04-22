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
  const [isChatCleared, setIsChatCleared] = useState(false);

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
          senderName: data.senderName || "User",
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

    const displayName = user.displayName || user.email?.split("@")[0] || "User";

    const messageRef = collection(db, "topics", topicKey, "messages");
    await addDoc(messageRef, {
      senderId: user.uid,
      senderName: displayName,
      message: newMessage,
      timestamp: serverTimestamp(),
    });

    setNewMessage("");
  };

  const clearChat = () => {
    setIsChatCleared(true);
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
        {/* Header with topic and delete icon */}
        <View style={styles.header}>
          <View style={styles.topicContainer}>
            <Text style={styles.topicLabel}>Topic:</Text>
            <Text style={styles.topicTitle} numberOfLines={1} ellipsizeMode="tail">
              {topic}
            </Text>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
  
        {/* Messages */}
        <View style={styles.chatBackground}>
          <FlatList
            data={isChatCleared ? [] : messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.chatContainer}
            inverted={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
  
        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#afafda"
            multiline
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={[
              styles.sendButton,
              { backgroundColor: newMessage.trim() ? "#afafda" : "#d0d0e8" }
            ]}
            disabled={!newMessage.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={newMessage.trim() ? "#fff" : "#f0f0f0"}
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
    backgroundColor: "#f9f5fa",
  },
  container: {
    flex: 1,
    backgroundColor: "#f9f5fa",
  },
  header: {
    padding: 20,
    backgroundColor: "#afafda",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  topicContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chatBackground: {
    flex: 1,
    backgroundColor: "#f9f5fa",
  },
  chatContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  messageContainer: {
    marginBottom: 16,
  },
  currentUserContainer: {
    alignItems: "flex-end",
  },
  otherUserContainer: {
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 13,
    color: "#7a7a9d",
    marginBottom: 4,
    marginLeft: 12,
    fontWeight: "600",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginVertical: 4,
  },
  currentUserBubble: {
    backgroundColor: "#afafda",
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: "#e9dfe9",
    borderBottomLeftRadius: 4,
  },
  currentUserText: {
    color: "#fff",
    fontSize: 16,
  },
  otherUserText: {
    color: "#5a5a78",
    fontSize: 16,
  },
  timestamp: {
    fontSize: 11,
    color: "#9a9ac0",
    marginTop: 4,
    marginHorizontal: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e9dfe9",
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f5ff",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxHeight: 120,
    fontSize: 16,
    color: "#5a5a78",
    borderWidth: 1,
    borderColor: "#e9dfe9",
  },
  sendButton: {
    marginLeft: 10,
    padding: 12,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  clearButton: {
    backgroundColor: "#d0a0b9",
    padding: 8,
    borderRadius: 10,
    marginLeft: 10,
    marginTop: 20,
  },
  topicLabel: {
    marginTop: 20,
    fontSize: 15,
    color: "#f0f0ff",
    marginRight: 8,
    fontWeight: "500",
  },
  topicTitle: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    flexShrink: 1,
  },
});

export default TopicScreen;