// const topics = [
//   { id: "1", title: "Artificial Intelligence", question: "Will AI take over jobs?" },
//   { id: "2", title: "Cryptocurrency & Blockchain", question: "Is Bitcoin still worth investing? 💰" },
//   { id: "3", title: "Startup Ideas & Business Trends", question: "What's the next big thing in tech? 🚀" },
//   { id: "4", title: "Conspiracy Theories", question: "Do aliens really exist? 👽" },
//   { id: "5", title: "Space Exploration & the Universe", question: "What's beyond our galaxy? 🌌" },
//   { id: "6", title: "Self-Improvement & Productivity Hacks", question: "How to wake up at 5 AM and love it? ⏰" },
//   { id: "7", title: "Fitness & Healthy Living", question: "Is intermittent fasting actually good for you? 🥗" },
//   { id: "8", title: "Travel & Adventure", question: "Best destinations to visit before you die! ✈️🏔" },
//   { id: "9", title: "Relationships & Love", question: "What makes a relationship last? ❤️" },
//   { id: "10", title: "Movies & TV Shows", question: "Marvel vs. DC – which is better? 🎬" },
//   { id: "11", title: "Gaming & eSports", question: "Best video games of all time? 🎮" },
//   { id: "12", title: "Music & Artists", question: "Who's the GOAT: Eminem or Drake? 🎵" },
//   { id: "13", title: "Psychology & Human Behavior", question: "Why do people lie? 🧠" },
//   { id: "14", title: "Weird & Unexplained Mysteries", question: "What's the creepiest unsolved mystery? 👀" },
//   { id: "15", title: "Funny & Embarrassing Stories", question: "What's the most awkward thing that happened to you? 😂" },
// ];

// screens/HomeScreen.tsx
import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../config/navigationTypes";
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

type HomeScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, "MainTabs">;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser?.uid) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", auth.currentUser.uid);
    
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          setUserName(doc.data()?.name || "User");
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to user data:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <Text style={styles.welcomeText}>Welcome back, {userName}!</Text>
      )}

      <Text style={styles.topicsTitle}>Discussion Topics</Text>
      
      <FlatList
        data={topics}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.topicButton}
            onPress={() => navigation.navigate("TopicScreen", { topic: item.title })}
          >
            <Text style={styles.topicTitle}>{item.title}</Text>
            <Text style={styles.topicQuestion}>{item.question}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff", 
    padding: 20 
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333"
  },
  topicsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333"
  },
  topicButton: { 
    backgroundColor: "#f5f5f5", 
    padding: 15, 
    marginVertical: 5, 
    borderRadius: 8 
  },
  topicTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#333" 
  },
  topicQuestion: { 
    fontSize: 14, 
    color: "#666", 
    marginTop: 5 
  },
});