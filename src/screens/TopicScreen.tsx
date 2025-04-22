import React, { useEffect, useState, useCallback } from "react";
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
import { useRoute, useFocusEffect } from "@react-navigation/native";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
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

interface Participant {
  userId: string;
  userName: string;
  docId: string;
  lastActive: any;
  isOnline?: boolean;
}

const ONLINE_THRESHOLD = 30000; // 30 seconds in milliseconds

const TopicScreen = () => {
  const route = useRoute();
  const { topic } = route.params as { topic: string };

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipantDocId, setCurrentParticipantDocId] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const topicKey = topic.toLowerCase().trim();

  // Calculate online status based on lastActive timestamp
  const calculateOnlineStatus = (participant: Participant) => {
    if (!participant.lastActive) return false;
    
    try {
      const lastActiveTime = participant.lastActive.toDate().getTime();
      const currentTime = new Date().getTime();
      return currentTime - lastActiveTime < ONLINE_THRESHOLD;
    } catch (error) {
      console.error("Error calculating online status:", error);
      return false;
    }
  };

  // Update online count whenever participants change
  useEffect(() => {
    const onlineParticipants = participants.filter(p => calculateOnlineStatus(p));
    setOnlineCount(onlineParticipants.length);
  }, [participants]);

  const addCurrentUser = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
  
    const displayName = user.displayName || user.email?.split("@")[0] || `User_${user.uid.substring(0, 5)}`;
    const participantsRef = collection(db, "topics", topicKey, "participants");
    
    try {
      // Check if user already exists in participants
      const participantQuery = query(
        participantsRef,
        where("userId", "==", user.uid)
      );
      const existingParticipant = await getDocs(participantQuery);
  
      if (existingParticipant.empty) {
        // Add new participant
        const docRef = await addDoc(participantsRef, {
          userId: user.uid,
          userName: displayName,
          joinedAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        });
        setCurrentParticipantDocId(docRef.id);
      } else {
        // Update existing participant's lastActive timestamp
        const docId = existingParticipant.docs[0].id;
        const participantRef = doc(db, "topics", topicKey, "participants", docId);
        await updateDoc(participantRef, {
          lastActive: serverTimestamp()
        });
        setCurrentParticipantDocId(docId);
      }
    } catch (error) {
      console.error("Error adding participant:", error);
      // You might want to show an error message to the user here
    }
  }, [topicKey]);

  // Remove current user from participants
  const removeCurrentUser = useCallback(async () => {
    if (!currentParticipantDocId) return;
    
    try {
      const participantRef = doc(db, "topics", topicKey, "participants", currentParticipantDocId);
      await deleteDoc(participantRef);
    } catch (error) {
      console.error("Error removing participant:", error);
    }
  }, [currentParticipantDocId, topicKey]);

  // Track participants in real-time
  useEffect(() => {
    const participantsRef = collection(db, "topics", topicKey, "participants");
    const unsubscribe = onSnapshot(participantsRef, (snapshot) => {
      const participantData: Participant[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        participantData.push({
          userId: data.userId,
          userName: data.userName || `User ${doc.id.substring(0, 4)}`,
          docId: doc.id,
          lastActive: data.lastActive
        });
      });
      setParticipants(participantData);
    });

    return unsubscribe;
  }, [topicKey]);

  // Track messages
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

    return unsubscribe;
  }, [topicKey]);

  // Handle screen focus/unfocus to add/remove participants
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      let activityInterval: NodeJS.Timeout;
      
      const setup = async () => {
        try {
          await addCurrentUser();
          
          // Set up interval to update lastActive timestamp every 15 seconds
          activityInterval = setInterval(() => {
            if (currentParticipantDocId && isMounted) {
              updateDoc(doc(db, "topics", topicKey, "participants", currentParticipantDocId), {
                lastActive: serverTimestamp()
              });
            }
          }, 15000);
        } catch (error) {
          console.error("Error in participant setup:", error);
        }
      };
      
      if (isMounted) setup();
      
      return () => {
        isMounted = false;
        clearInterval(activityInterval);
        removeCurrentUser();
      };
    }, [addCurrentUser, removeCurrentUser, currentParticipantDocId, topicKey])
  );

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const user = auth.currentUser;
    if (!user) return;

    // Get user's display name
    const userParticipant = participants.find(p => p.userId === user.uid);
    const displayName = userParticipant?.userName || 
                       user.displayName || 
                       user.email?.split("@")[0] || 
                       `User_${user.uid.substring(0, 5)}`;

    try {
      await addDoc(collection(db, "topics", topicKey, "messages"), {
        senderId: user.uid,
        senderName: displayName,
        message: newMessage,
        timestamp: serverTimestamp(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
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
    const sender = participants.find(p => p.userId === item.senderId);
    const isSenderOnline = sender ? calculateOnlineStatus(sender) : false;

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
        ]}
      >
        {!isCurrentUser && (
          <View style={styles.senderInfo}>
            <Text style={styles.senderName}>{sender?.userName || item.senderName}</Text>
            {isSenderOnline && <View style={styles.onlineIndicator} />}
          </View>
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
        {/* Header with topic and participant count */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <View style={styles.topicContainer}>
              <Text style={styles.topicLabel}>Topic:</Text>
              <Text style={styles.topicTitle} numberOfLines={1} ellipsizeMode="tail">
                {topic}
              </Text>
            </View>
            <View style={styles.participantContainer}>
              <Ionicons name="people" size={16} color="#fff" />
              <Text style={styles.participantCount}>
                {onlineCount}
              </Text>
            </View>
          </View>
        </View>
  
        {/* Messages */}
        <View style={styles.chatBackground}>
          <FlatList
            data={messages}
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
    padding: 15,
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
  headerInfo: {
    marginTop: 23,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topicContainer: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "70%",
  },
  participantContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginLeft: 10,
  },
  participantCount: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 5,
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
  senderInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginLeft: 12,
  },
  senderName: {
    fontSize: 13,
    color: "#7a7a9d",
    fontWeight: "600",
    marginRight: 6,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
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
  topicLabel: {
    fontSize: 18,
    color: "#f0f0ff",
    marginRight: 8,
    fontWeight: "500",
  },
  topicTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
});

export default TopicScreen;