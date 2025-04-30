import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { auth, db } from "../config/firebaseConfig";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  getDoc,
  getDocs,
  where,
  writeBatch,
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../config/navigationTypes";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Topic {
  id: string;
  title: string;
  question: string;
  createdAt: any;
  createdBy?: string;
  hiddenForUsers?: string[];
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [userName, setUserName] = useState<string>(
    auth.currentUser?.displayName ||
      auth.currentUser?.email?.split("@")[0] ||
      "User"
  );
  const [userId, setUserId] = useState<string>(auth.currentUser?.uid || "");
  const [userLoading, setUserLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    buttons: [],
    cancelable: true,
  });
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Guessing Game States
  const [gameLevelUpVisible, setGameLevelUpVisible] = useState(false);
  const [randomNumber, setRandomNumber] = useState<number>(0);
  const [guess, setGuess] = useState<string>("");
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const maxAttempts = 10;

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      setUserLoading(false);
      setTopicsLoading(false);
      return;
    }

    setUserId(currentUser.uid);

    const unsubscribeUser = onSnapshot(
      doc(db, "users", currentUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (userData.name) {
            setUserName(userData.name);
          }
        }
        setUserLoading(false);
      },
      (error) => {
        console.error("Error fetching user data:", error);
        setUserLoading(false);
      }
    );

    const topicsCollection = collection(db, "topics");
    const topicsQuery = query(topicsCollection, orderBy("createdAt", "desc"));

    const unsubscribeTopics = onSnapshot(topicsQuery, (snapshot) => {
      try {
        const topicsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          question: doc.data().question,
          createdAt: doc.data().createdAt,
          createdBy: doc.data().createdBy,
          hiddenForUsers: doc.data().hiddenForUsers || [],
        }));
        setTopics(topicsData);
        setTopicsLoading(false);
      } catch (error) {
        console.error("Error fetching topics:", error);
        setTopicsLoading(false);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeTopics();
    };
  }, []);

  const startNewGame = () => {
    const number = Math.floor(Math.random() * 100) + 1; // random number between 1 and 100
    setRandomNumber(number);
    setGuess("");
    setAttemptCount(0);
    setMessage("");
    setGameLevelUpVisible(true);
  };

  const checkGuess = () => {
    const numGuess = parseInt(guess, 10);
    if (isNaN(numGuess)) {
      setMessage("Please enter a valid number.");
      return;
    }

    setAttemptCount((prev) => prev + 1);

    // Check the guess
    if (numGuess < randomNumber) {
      setMessage(`Attempt ${attemptCount + 1}: Too low! Try again.`);
    } else if (numGuess > randomNumber) {
      setMessage(`Attempt ${attemptCount + 1}: Too high! Try again.`);
    } else {
      // Correct guess
      setMessage(
        `Congratulations! You got it right! The number was ${randomNumber}. You took ${
          attemptCount + 1
        } attempts.`
      );
      setCorrectCount((prev) => prev + 1); // Increase count of correct guesses
      return; // Exit function to prevent incrementing the attempt count further
    }

    // Check if attempts reached maximum allowed
    if (attemptCount + 1 === maxAttempts) {
      setMessage(
        `Game over! You've used all ${maxAttempts} attempts. The number was ${randomNumber}.`
      );
      setGameLevelUpVisible(false); // Close the game modal after exhausting attempts
    }

    setGuess(""); // Reset input after each guess
  };

  const handleTopicPress = (topicTitle: string) => {
    navigation.navigate("TopicScreen", { topic: topicTitle });
  };

  const handleDeleteTopic = async (topicId: string) => {
    setSelectedTopicId(topicId);
    setModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!selectedTopicId) return;

    try {
      setModalVisible(false);
      const topicRef = doc(db, "topics", selectedTopicId);
      const topicSnap = await getDoc(topicRef);

      if (topicSnap.exists()) {
        const topicData = topicSnap.data();
        const topicTitle = topicData.title;

        const messagesQuery = query(
          collection(db, "messages"),
          where("topicTitle", "==", topicTitle)
        );

        const messagesSnapshot = await getDocs(messagesQuery);
        const batch = writeBatch(db);

        messagesSnapshot.docs.forEach((messageDoc) => {
          batch.delete(messageDoc.ref);
        });

        batch.delete(topicRef);
        await batch.commit();
        showCustomAlert(
          "Success",
          "Topic and all related messages have been deleted."
        );
      } else {
        await deleteDoc(topicRef);
      }
    } catch (error) {
      console.error("Error deleting topic:", error);
      showCustomAlert("Error", "Failed to delete topic and its messages.");
    }
  };

  const handleLeaveTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    showCustomAlert(
      "Leave Topic",
      "Are you sure you want to leave this topic? You won't see it anymore.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setSelectedTopicId(null),
        },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            if (!userId || !selectedTopicId) return;
            try {
              const topicRef = doc(db, "topics", selectedTopicId);
              await updateDoc(topicRef, {
                hiddenForUsers: arrayUnion(userId),
              });
            } catch (error) {
              console.error("Error leaving topic:", error);
              showCustomAlert("Error", "Failed to leave topic.");
            }
          },
        },
      ],
      true
    );
  };

  const showCustomAlert = (
    title: string,
    message: string,
    buttons: any[] = [],
    cancelable = true
  ) => {
    setAlertConfig({
      title,
      message,
      buttons: buttons.length
        ? buttons
        : [{ text: "OK", onPress: () => setAlertVisible(false) }],
      cancelable,
    });
    setAlertVisible(true);
  };

  const renderTopicItem = ({ item }: { item: Topic }) => {
    if (item.hiddenForUsers?.includes(userId)) return null;

    const isUserCreator = item.createdBy === userId;

    return (
      <TouchableOpacity
        style={styles.topicButton}
        onPress={() => handleTopicPress(item.title)}
      >
        <View style={styles.topicHeader}>
          <Text style={styles.topicTitle}>{item.title}</Text>
          <View style={styles.topicActions}>
            {isUserCreator ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteTopic(item.id);
                }}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={22} color="#e53935" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleLeaveTopic(item.id);
                }}
                style={styles.actionButton}
              >
                <Ionicons name="exit-outline" size={22} color="#ff9800" />
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-forward" size={22} color="#afafda" />
          </View>
        </View>
        <Text style={styles.topicQuestion}>{item.question}</Text>
        <View style={styles.topicFooter}>
          <Text style={styles.topicDate}>
            {item.createdAt?.toDate()?.toLocaleDateString() || ""}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const visibleTopics = topics.filter(
    (topic) =>
      !topic.hiddenForUsers?.includes(userId) &&
      (topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.question.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        {userLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        )}
        <View style={styles.iconContainer}>
          <TouchableOpacity onPress={startNewGame}>
            <Ionicons name="game-controller-outline" size={30} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Location.requestForegroundPermissionsAsync().then(
                async (status) => {
                  if (status.granted) {
                    const location = await Location.getCurrentPositionAsync({});
                    const { latitude, longitude } = location.coords;
                    const url = `https://www.google.com/maps/@${latitude},${longitude},15z`;
                    Linking.openURL(url);
                  } else {
                    alert("Location permission denied.");
                  }
                }
              );
            }}
            style={styles.locationButton}
          >
            <Ionicons name="location-outline" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search topics..."
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.sectionHeader}>
          <Ionicons name="chatbubbles" size={22} color="#fff" />
          <Text style={styles.topicsTitle}>Discussion Topics</Text>
        </View>

        {topicsLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#6a5acd" />
            <Text style={styles.loadingText}>Loading topics...</Text>
          </View>
        ) : visibleTopics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbox-outline" size={60} color="#afafda" />
            <Text style={styles.emptyText}>No topics to show</Text>
            <Text style={styles.emptySubText}>
              Create or join a topic to start chatting
            </Text>
          </View>
        ) : (
          <FlatList
            data={visibleTopics}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            renderItem={renderTopicItem}
          />
        )}
      </View>

      {/* Guessing Game Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={gameLevelUpVisible}
        onRequestClose={() => setGameLevelUpVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Guess the Number</Text>
            <Text style={styles.modalText}>
              Guess a number between 1 and 100 :
            </Text>
            <TextInput
              style={styles.guessInput}
              placeholder="Enter your guess"
              placeholderTextColor="#aaa"
              value={guess}
              onChangeText={setGuess}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setGameLevelUpVisible(false);
                  setMessage(""); // Reset message when closing modal
                  setCorrectCount(0); // Reset correct guesses for next game
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButton} onPress={checkGuess}>
                <Text style={styles.deleteButtonText}>Check Guess</Text>
              </Pressable>
            </View>
            <Text style={styles.modalText}>{message}</Text>
            <Text style={styles.modalText}>
              You have {maxAttempts - attemptCount} attempts remaining.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Modal for delete confirmation */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete Topic</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this topic? All messages will be
              permanently removed.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={alertVisible}
        onRequestClose={() => alertConfig.cancelable && setAlertVisible(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <View style={styles.alertHeader}>
              <Ionicons
                name={
                  alertConfig.title.toLowerCase().includes("error")
                    ? "alert-circle"
                    : "information-circle"
                }
                size={30}
                color={
                  alertConfig.title.toLowerCase().includes("error")
                    ? "#e53935"
                    : "#6a5acd"
                }
              />
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            </View>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <View
              style={[
                styles.alertButtons,
                alertConfig.buttons.length > 1
                  ? styles.alertButtonsMultiple
                  : styles.alertButtonsSingle,
              ]}
            >
              {alertConfig.buttons.map((button, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.alertButton,
                    button.style === "destructive"
                      ? styles.alertButtonDestructive
                      : button.style === "cancel"
                      ? styles.alertButtonCancel
                      : styles.alertButtonDefault,
                  ]}
                  onPress={() => {
                    setAlertVisible(false);
                    button.onPress && button.onPress();
                  }}
                >
                  <Text
                    style={[
                      styles.alertButtonText,
                      button.style === "destructive"
                        ? styles.alertButtonTextDestructive
                        : button.style === "cancel"
                        ? styles.alertButtonTextCancel
                        : styles.alertButtonTextDefault,
                    ]}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#6a5acd",
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerContent: {
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
  },
  userName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginTop: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  searchBar: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#6a5acd",
    padding: 10,
    borderRadius: 15,
  },
  topicsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 12,
    color: "#fff",
  },
  listContainer: {
    paddingBottom: 25,
  },
  topicButton: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 15,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: "#6a5acd",
  },
  topicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  topicFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  topicActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4a4a6a",
    flex: 1,
  },
  topicQuestion: {
    fontSize: 15,
    color: "#6a6a89",
    marginBottom: 10,
  },
  topicDate: {
    fontSize: 12,
    color: "#aaa",
    textAlign: "right",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 20,
    color: "#6a5acd",
    marginTop: 20,
    fontWeight: "600",
  },
  emptySubText: {
    fontSize: 15,
    color: "#aaa",
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 16,
    color: "#6a5acd",
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    alignItems: "center", // Center elements
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4a4a6a",
    marginBottom: 15,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    color: "#6a6a89",
    marginBottom: 15,
    textAlign: "center",
  },
  guessInput: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
    width: "100%", // Full width
    backgroundColor: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
    backgroundColor: "#6a5acd",
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: "#6a6a89",
  },
  deleteButton: {
    backgroundColor: "#ff4d4d",
  },
  cancelButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  alertOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  alertContainer: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f5",
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4a4a6a",
    marginLeft: 10,
  },
  alertMessage: {
    fontSize: 16,
    color: "#6a6a89",
    marginBottom: 20,
  },
  alertButtons: {
    marginTop: 5,
  },
  alertButtonsSingle: {
    flexDirection: "row",
    justifyContent: "center",
  },
  alertButtonsMultiple: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  alertButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginHorizontal: 5,
    minWidth: 120,
    alignItems: "center",
  },
  alertButtonDefault: {
    backgroundColor: "#6a5acd",
  },
  alertButtonCancel: {
    backgroundColor: "#f0f0f5",
  },
  alertButtonDestructive: {
    backgroundColor: "#ff4d4d",
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  alertButtonTextDefault: {
    color: "white",
  },
  alertButtonTextCancel: {
    color: "#6a6a89",
  },
  alertButtonTextDestructive: {
    color: "white",
  },
  actionButton: {
    marginRight: 15,
    padding: 5,
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationButton: {
    marginLeft: 15,
  },
});
