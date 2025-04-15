// screens/HomeScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../config/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainStackParamList } from "../config/navigationTypes";

const topics = [
  { id: "1", title: "Artificial Intelligence", question: "Will AI take over jobs?" },
  { id: "2", title: "Cryptocurrency & Blockchain", question: "Is Bitcoin still worth investing? 💰" },
  { id: "3", title: "Startup Ideas & Business Trends", question: "What's the next big thing in tech? 🚀" },
  { id: "4", title: "Conspiracy Theories", question: "Do aliens really exist? 👽" },
  { id: "5", title: "Space Exploration & the Universe", question: "What's beyond our galaxy? 🌌" },
  { id: "6", title: "Self-Improvement & Productivity Hacks", question: "How to wake up at 5 AM and love it? ⏰" },
  { id: "7", title: "Fitness & Healthy Living", question: "Is intermittent fasting actually good for you? 🥗" },
  { id: "8", title: "Travel & Adventure", question: "Best destinations to visit before you die! ✈️🏔" },
  { id: "9", title: "Relationships & Love", question: "What makes a relationship last? ❤️" },
  { id: "10", title: "Movies & TV Shows", question: "Marvel vs. DC – which is better? 🎬" },
  { id: "11", title: "Gaming & eSports", question: "Best video games of all time? 🎮" },
  { id: "12", title: "Music & Artists", question: "Who's the GOAT: Eminem or Drake? 🎵" },
  { id: "13", title: "Psychology & Human Behavior", question: "Why do people lie? 🧠" },
  { id: "14", title: "Weird & Unexplained Mysteries", question: "What's the creepiest unsolved mystery? 👀" },
  { id: "15", title: "Funny & Embarrassing Stories", question: "What's the most awkward thing that happened to you? 😂" },
];

type HomeScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", currentUser.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setUserName(docSnap.data().name || "User");
        } else {
          setUserName("User");
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching user data:", error);
        setUserName("User");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleTopicPress = (topicTitle: string) => {
    navigation.navigate("TopicScreen", { topic: topicTitle });
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
      ) : (
        <Text style={styles.welcomeText}>
          Welcome back, <Text style={styles.userName}>{userName}</Text>
          <Text>!</Text>
        </Text>
      )}

      <Text style={styles.topicsTitle}>Discussion Topics</Text>

      <FlatList
        data={topics}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.topicButton}
            onPress={() => handleTopicPress(item.title)}
          >
            <Text style={styles.topicTitle}>{item.title}</Text>
            <Text style={styles.topicQuestion}>{item.question}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  loader: {
    marginTop: 50,
  },
  welcomeText: {
    fontSize: 25,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
    marginTop: 25,
  },
  userName: {
    color: "#007bff",
  },
  topicsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
  },
  topicButton: {
    backgroundColor: "#f2f2f2",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  topicQuestion: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
});
