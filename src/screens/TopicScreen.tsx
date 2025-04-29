import React, { useEffect, useState, useCallback, useRef } from "react";
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
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useRoute, useFocusEffect, useNavigation } from "@react-navigation/native"; 
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
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import * as Animatable from "react-native-animatable";
import { LinearGradient } from "expo-linear-gradient";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: any; // It's a Firestore timestamp
  replyTo?: {
    id: string;
    message: string;
    senderId: string;
    senderName: string;
  } | null;
}

interface Participant {
  userId: string;
  userName: string;
  docId: string;
  lastActive: any; // Adjust this if you know the specific type (e.g. Firestore Timestamp)
}

const ONLINE_THRESHOLD = 30000; // 30 seconds in milliseconds
const { width } = Dimensions.get('window');

const TopicScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { topic } = route.params as { topic: string };
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipantDocId, setCurrentParticipantDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  const topicKey = topic.toLowerCase().trim();

  const calculateOnlineStatus = useCallback((participant: Participant) => {
    const lastActiveTime = participant?.lastActive?.toDate ? participant.lastActive.toDate().getTime() : null;
    const currentTime = Date.now();
    return lastActiveTime && (currentTime - lastActiveTime < ONLINE_THRESHOLD);
  }, []);

  const onlineCount = participants.filter(calculateOnlineStatus).length;

  const addCurrentUser = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("User not authenticated");
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      let displayName = userDoc.exists() ? userDoc.data().name : null;
      displayName = displayName || user.displayName || user.email?.split("@")[0] || `User_${user.uid.substring(0, 5)}`;

      const participantsRef = collection(db, "topics", topicKey, "participants");
      const participantQuery = query(participantsRef, where("userId", "==", user.uid));
      const existingParticipant = await getDocs(participantQuery);

      if (existingParticipant.empty) {
        const docRef = await addDoc(participantsRef, {
          userId: user.uid,
          userName: displayName,
          joinedAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        });
        setCurrentParticipantDocId(docRef.id);
      } else {
        const docId = existingParticipant.docs[0].id;
        await updateDoc(doc(db, "topics", topicKey, "participants", docId), {
          lastActive: serverTimestamp(),
          userName: displayName,
        });
        setCurrentParticipantDocId(docId);
      }
    } catch (err) {
      console.error("Error managing participant:", err);
      setError("Failed to join topic");
    }
  }, [topicKey]);

  const removeCurrentUser = useCallback(async () => {
    if (!currentParticipantDocId) return;

    try {
      const participantRef = doc(db, "topics", topicKey, "participants", currentParticipantDocId);
      await deleteDoc(participantRef);
    } catch (err) {
      console.error("Error removing participant:", err);
    }
  }, [currentParticipantDocId, topicKey]);

  useEffect(() => {
    const participantsRef = collection(db, "topics", topicKey, "participants");
    
    const unsubscribe = onSnapshot(participantsRef, (snapshot) => {
      const participantData: Participant[] = []; // Correctly typed
  
      snapshot.forEach((doc) => {
        const data = doc.data();
        const participant: Participant = {
          userId: data.userId,
          userName: data.userName || `User ${doc.id.substring(0, 4)}`,
          docId: doc.id,
          lastActive: data.lastActive || null,
        };
  
        participantData.push(participant);
      });
  
      setParticipants(participantData); 
    });

    return unsubscribe; // Cleanup function
  }, [topicKey]);

  useEffect(() => {
    const messagesRef = collection(db, "topics", topicKey, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          msgs.push({
            id: doc.id,
            senderId: data.senderId,
            senderName: data.senderName || "Anonymous",
            message: data.message,
            timestamp: data.timestamp, // Can be null or Firestore timestamp
            replyTo: data.replyTo || null
          });
        });
        setMessages(msgs);
        setLoading(false);

        // Scroll to bottom when new messages arrive
        if (flatListRef.current && msgs.length > 0) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      },
      (err) => {
        console.error("Error listening to messages:", err);
        setError("Failed to load messages");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [topicKey]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      let activityInterval: NodeJS.Timeout;

      const setup = async () => {
        try {
          await addCurrentUser();

          activityInterval = setInterval(() => {
            if (currentParticipantDocId && isMounted) {
              updateDoc(doc(db, "topics", topicKey, "participants", currentParticipantDocId), {
                lastActive: serverTimestamp()
              }).catch(console.warn);
            }
          }, 15000);
        } catch (err) {
          console.error("Error in participant setup:", err);
        }
      };

      if (isMounted) setup();

      return () => {
        isMounted = false;
        clearInterval(activityInterval);
        removeCurrentUser().catch(console.warn);
      };
    }, [addCurrentUser, removeCurrentUser, currentParticipantDocId, topicKey])
  );

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You need to be logged in to send messages");
      return;
    }

    const userParticipant = participants.find(p => p.userId === user.uid);
    const displayName = userParticipant?.userName || 
                       user.displayName || 
                       user.email?.split("@")[0] || 
                       `User_${user.uid.substring(0, 5)}`;

    try {
      await addDoc(collection(db, "topics", topicKey, "messages"), {
        senderId: user.uid,
        senderName: displayName,
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
        replyTo: replyToMessage ? { 
          id: replyToMessage.id, 
          message: replyToMessage.message, 
          senderId: replyToMessage.senderId, 
          senderName: replyToMessage.senderName 
        } : null
      });
      setNewMessage("");
      setReplyToMessage(null);
    } catch (err) {
      console.error("Error sending message:", err);
      Alert.alert("Error", "Failed to send message");
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    return format(timestamp.toDate ? timestamp.toDate() : timestamp, "h:mm a");
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ").filter(p => p.length > 0);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getAvatarColor = (userId: string): [string, string] => {
    const colors: [string, string][] = [
      ["#FF6B6B", "#FF8E8E"],
      ["#4ECDC4", "#88D8C0"],
      ["#FFBE0B", "#FFD166"],
      ["#8338EC", "#9D4EDD"],
      ["#3A86FF", "#6A8EFF"],
      ["#FF006E", "#FF5C8A"],
      ["#FB5607", "#FF7B3D"],
    ];
    
    const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const navigateToProfile = (userId: string) => {
    navigation.navigate('UserProfileScreen', { userId });
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === auth.currentUser?.uid;
    const sender = participants.find(p => p.userId === item.senderId);
    const senderName = sender?.userName || item.senderName;
    const initials = getInitials(senderName);
    const avatarColors = getAvatarColor(item.senderId);
    
    const replyMessage = item.replyTo ? 
      `${item.replyTo.senderName}: ${item.replyTo.message}` : 
      null;

    return (
      <View style={[
        styles.messageRow,
        isCurrentUser ? styles.currentUserRow : styles.otherUserRow
      ]}>
        {replyMessage && (
          <Text style={isCurrentUser ? styles.currentUserReply : styles.otherUserReply}>
            {replyMessage}
          </Text>
        )}

        {!isCurrentUser && (
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={() => navigateToProfile(item.senderId)}
          >
            <LinearGradient
              colors={avatarColors}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={[
          styles.messageBubbleContainer,
          isCurrentUser && styles.currentUserBubbleContainer
        ]}>
          {!isCurrentUser && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}
          <Animatable.View
            animation="fadeInUp"
            duration={300}
            style={[
              styles.messageBubble,
              isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
            ]}
          >
            <Text style={isCurrentUser ? styles.currentUserText : styles.otherUserText}>
              {item.message}
            </Text>
          </Animatable.View>
          <Text style={[
            styles.timestamp,
            isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp
          ]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
        
        {isCurrentUser && (
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              onPress={() => navigateToProfile(item.senderId)}
            >
              <LinearGradient
                colors={avatarColors}
                style={styles.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Animatable.View animation="shake" duration={600}>
          <Ionicons name="warning" size={48} color="#FF6B6B" />
        </Animatable.View>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setError(null)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a5acd" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <StatusBar barStyle="light-content" backgroundColor="#6a5acd" />
      <LinearGradient 
        colors={["#6a5acd", "#8a8aad"]} 
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.header}>
          <Animatable.View 
            animation="pulse" 
            iterationCount="infinite" 
            duration={2000}
            style={styles.topicIconContainer}
          >
            <Ionicons name="chatbubbles" size={22} color="#fff" />
          </Animatable.View>
          
          <View style={styles.topicInfo}>
            <Text style={styles.topicTitle} numberOfLines={1}>
              {topic}
            </Text>
            <Text style={styles.topicStatus}>
              {onlineCount} {onlineCount === 1 ? 'person' : 'people'} online
            </Text>
          </View>
          
          <View style={styles.participantContainer}>
            <Ionicons name="people" size={18} color="#fff" />
            <Text style={styles.participantCount}>{participants.length}</Text>
          </View>
        </View>
      </LinearGradient>
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          {replyToMessage && (
            <View style={styles.replyContainer}>
              <Text style={styles.replyText}>Replying to {replyToMessage.senderName}:</Text>
              <Text style={styles.replyMessage}>{replyToMessage.message}</Text>
              <TouchableOpacity onPress={() => setReplyToMessage(null)} style={styles.cancelReplyButton}>
                <Text style={styles.cancelReplyButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
    
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.chatContainer}
            inverted={false}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbox-outline" size={48} color="#D3D3D3" />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Be the first to say something!</Text>
              </View>
            }
          />
    
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#9DA3B4"
              multiline
              maxLength={500}
              enablesReturnKeyAutomatically
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={styles.sendButton}
              disabled={!newMessage.trim()}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={newMessage.trim() ? ["#6a5acd", "#8a8aad"] : ["#D3D3D3", "#C0C0C0"]}
                style={styles.sendButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );  
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    marginTop: -1,
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6a5acd',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#6a5acd',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: '#A0A0A0',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C0C0C0',
    marginTop: 4,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 60,
  },
  topicIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  topicStatus: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  participantContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  participantCount: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    width: '100%',
  },
  currentUserRow: {
    justifyContent: 'flex-end',
  },
  otherUserRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginLeft: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageBubbleContainer: {
    maxWidth: '70%',
  },
  currentUserBubbleContainer: {
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7A8194',
    marginBottom: 4,
  },
  messageBubble: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 4,
  },
  currentUserBubble: {
    backgroundColor: '#6a5acd',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 12,
  },
  otherUserBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEEF2',
  },
  currentUserText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
  },
  otherUserText: {
    color: '#333333',
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  currentUserTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
    paddingRight: 8,
  },
  otherUserTimestamp: {
    color: '#9DA3B4',
    textAlign: 'left',
    paddingLeft: 8,
  },
  replyContainer: {
    backgroundColor: '#E6E6FA',
    padding: 8,
    borderRadius: 5,
    marginBottom: 8,
  },
  replyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#444',
  },
  replyMessage: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  cancelReplyButton: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  cancelReplyButtonText: {
    color: '#6a5acd',
    fontSize: 12,
  },
  currentUserReply: {
    color: '#6a5acd',
    fontSize: 12,
    fontStyle: 'italic',
  },
  otherUserReply: {
    color: '#333',
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EAEEF2",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333333",
    borderWidth: 1,
    borderColor: "#E1E5EB",
    maxHeight: 120,
    lineHeight: 20,
  },
  sendButton: {
    marginLeft: 12,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6a5acd',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
});

export default TopicScreen;