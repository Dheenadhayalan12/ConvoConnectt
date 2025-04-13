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

export default function TopicScreen() {
  const route = useRoute<TopicScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { topic } = route.params;

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid || "";

  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, "topics", topic, "onlineUsers", userId);
    const userTopicRef = doc(db, "userTopics", userId, topic);

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
        });

        const interval = setInterval(() => {
          setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
        }, 30000);

        return () => {
          clearInterval(interval);
          deleteDoc(userRef).catch((e) => console.log("Error removing from topic:", e));
          deleteDoc(userTopicRef).catch((e) => console.log("Error removing userTopic:", e));
        };
      } catch (error) {
        console.error("Error in setupPresence:", error);
      }
    };

    const cleanup = setupPresence();

    return () => {
      cleanup?.then((fn) => fn?.()).catch((e) => console.error("Cleanup error:", e));
    };
  }, [topic, userId]);

  useEffect(() => {
    if (!userId) return;

    const usersRef = collection(db, "topics", topic, "onlineUsers");
    const q = query(usersRef, where("lastSeen", ">", Timestamp.fromDate(new Date(Date.now() - 60000))));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
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
    });

    return () => unsubscribe();
  }, [topic, userId]);

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
        topic: topic,
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

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "chatRequests"),
      where("to", "==", userId),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      snapshot.forEach(async (docSnap) => {
        const request = docSnap.data();
        const fromUserDoc = await getDoc(doc(db, "users", request.from));
        const fromUserName = fromUserDoc.exists() ? fromUserDoc.data().name : "Unknown";

        Alert.alert(
          "Chat Request",
          `You have a chat request from ${fromUserName}`,
          [
            {
              text: "Decline",
              onPress: async () => {
                await setDoc(doc(db, "chatRequests", docSnap.id), { status: "declined" }, { merge: true });
              },
              style: "cancel",
            },
            {
              text: "Accept",
              onPress: async () => {
                await setDoc(doc(db, "chatRequests", docSnap.id), { status: "accepted" }, { merge: true });
                const chatId = [request.from, request.to].sort().join("_");
                navigation.navigate("ChatScreen", { chatId, userName: fromUserName });
              },
            },
          ]
        );
      });
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "chatRequests"),
      where("from", "==", userId),
      where("status", "==", "accepted")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.forEach((docSnap) => {
        const request = docSnap.data();
        const chatId = [request.from, request.to].sort().join("_");
        navigation.navigate("ChatScreen", { chatId, userName: "Friend" });
      });
    });

    return () => unsubscribe();
  }, [userId]);

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
        ListEmptyComponent={<Text style={styles.emptyText}>No other users online</Text>}
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
