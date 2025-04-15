// screens/TopicScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainStackParamList } from "../config/navigationTypes";
import { auth, db } from "../config/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

interface OnlineUser {
  id: string;
  name: string;
  isFriend: boolean;
}

type TopicScreenRouteProp = RouteProp<MainStackParamList, "TopicScreen">;
type NavigationProp = NativeStackNavigationProp<MainStackParamList, "TopicScreen">;

// Improved sanitize function that handles more edge cases
const sanitizeTopicName = (topic: string): string => {
  // First trim whitespace, then replace special chars with underscore
  // and ensure we don't end up with multiple underscores
  return topic.trim()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
};

export default function TopicScreen() {
  const route = useRoute<TopicScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { topic } = route.params;
  const sanitizedTopic = sanitizeTopicName(topic);

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid || "";

  useEffect(() => {
    if (!userId) return;

    // Validate the sanitized topic name
    if (!sanitizedTopic || sanitizedTopic.length === 0) {
      console.error("Invalid topic name after sanitization");
      return;
    }

    const userRef = doc(db, "topics", sanitizedTopic, "onlineUsers", userId);
    const userTopicRef = doc(db, "userTopics", userId, sanitizedTopic);

    const setupPresence = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        const userName = userDoc.exists() ? userDoc.data()?.name || "Anonymous" : "Anonymous";

        await setDoc(
          userRef,
          {
            name: userName,
            joinedAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        );

        await setDoc(userTopicRef, {
          joinedAt: serverTimestamp(),
          originalTopicName: topic,
        });

        const interval = setInterval(() => {
          setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true })
            .catch(e => console.error("Error updating lastSeen:", e));
        }, 30000);

        return () => {
          clearInterval(interval);
          deleteDoc(userRef).catch((e) => console.log("Error removing from topic:", e));
          deleteDoc(userTopicRef).catch((e) => console.log("Error removing userTopic:", e));
        };
      } catch (error) {
        console.error("Error in setupPresence:", error);
        Alert.alert("Error", "Could not establish presence in topic");
      }
    };

    const cleanup = setupPresence();

    return () => {
      cleanup?.then((fn) => fn?.()).catch((e) => console.error("Cleanup error:", e));
    };
  }, [topic, userId, sanitizedTopic]);

  useEffect(() => {
    if (!userId || !sanitizedTopic) return;

    const usersRef = collection(db, "topics", sanitizedTopic, "onlineUsers");
    const q = query(usersRef, where("lastSeen", ">", Timestamp.fromDate(new Date(Date.now() - 60000))));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const users = await Promise.all(
          snapshot.docs
            .filter((doc) => doc.id !== userId)
            .map(async (doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                name: data?.name || "Anonymous",
                isFriend: false,
              };
            })
        );
        setOnlineUsers(users);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching online users:", error);
        setLoading(false);
      }
    }, (error) => {
      console.error("Error in online users snapshot:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [topic, userId, sanitizedTopic]);


  const handleChatRequest = async (targetUser: OnlineUser) => {
    try {
      const friendDoc = await getDoc(doc(db, "friends", userId, "friendList", targetUser.id));

      if (friendDoc.exists()) {
        const chatId = [userId, targetUser.id].sort().join("_");
        navigation.navigate("ChatScreen", { chatId, userName: targetUser.name });
        return;
      }

      const requestId = `${userId}_${targetUser.id}`;
      await setDoc(doc(db, "friendRequests", requestId), {
        from: userId,
        to: targetUser.id,
        status: "pending",
        createdAt: serverTimestamp(),
        topic: topic, // Using original topic name here
      });

      Alert.alert(
        "Friend Request Sent",
        `We've sent a friend request to ${targetUser.name}. You can chat once they accept.`,
        [{ text: "OK", onPress: () => navigation.navigate("Friends") }]
      );
    } catch (error) {
      console.error("Error sending chat request:", error);
      Alert.alert("Error", "Failed to send chat request.");
    }
  };

  // ... (keep the existing useEffect hooks for chat requests)

  const renderUserItem = ({ item }: { item: OnlineUser }) => (
    <View style={styles.userItem}>
      <Text style={styles.userName}>{item.name}</Text>
      <TouchableOpacity style={styles.chatButton} onPress={() => handleChatRequest(item)}>
        <Text style={styles.chatButtonText}>Request Chat</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

 return (
    <View style={styles.container}>
      <Text style={styles.topicTitle}>{topic}</Text>
      <Text style={styles.onlineTitle}>Online Users ({onlineUsers.length})</Text>

      <FlatList
        data={onlineUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? "Loading..." : "No other users online"}
          </Text>
        }
        contentContainerStyle={onlineUsers.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
  },
  topicTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  onlineTitle: {
    fontSize: 18,
    marginBottom: 15,
  },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f5f5f5",
    marginBottom: 10,
    borderRadius: 8,
  },
  userName: {
    fontSize: 16,
  },
  chatButton: {
    backgroundColor: "#007bff",
    padding: 8,
    borderRadius: 5,
  },
  chatButtonText: {
    color: "white",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
  },
});
