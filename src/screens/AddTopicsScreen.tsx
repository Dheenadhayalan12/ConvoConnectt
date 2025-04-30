import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { auth, db } from "../config/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

export default function AddTopicsScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [range, setRange] = useState(""); // New state for range
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAddTopic = async () => {
    if (!title.trim() || !question.trim() || !range.trim()) {
      setError("Title, question, and range are required!");
      return;
    }

    const rangeValue = parseFloat(range);
    if (isNaN(rangeValue) || rangeValue <= 0) {
      setError("Please enter a valid number for the range in kilometers.");
      return;
    }

    try {
      await addDoc(collection(db, "topics"), {
        title,
        question,
        range: rangeValue, // Include range in Firestore document
        createdAt: serverTimestamp(),
        participants: 0,
        createdBy: auth.currentUser?.uid,
      });

      setTitle("");
      setQuestion("");
      setRange(""); // Reset range input
      setSuccess("Topic added successfully!");
      setTimeout(() => setSuccess(""), 3000);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("Home");
      }
    } catch (error) {
      console.error("Error adding topic: ", error);
      setError("Failed to add topic. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("Home");
              }
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Topic</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={18} color="#fff" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Success Message */}
          {success ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Ionicons name="create" size={22} color="#fff" />
            <Text style={styles.sectionTitle}>New Discussion</Text>
          </View>

          {/* Input Fields */}
          <View style={styles.formContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Topic Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter topic title..."
                placeholderTextColor="#9a9ac0"
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  setError("");
                }}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Discussion Question</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="What would you like to discuss?"
                placeholderTextColor="#9a9ac0"
                value={question}
                onChangeText={(text) => {
                  setQuestion(text);
                  setError("");
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Visible to in range of (km)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter distance in km..."
                placeholderTextColor="#9a9ac0"
                value={range}
                onChangeText={(text) => {
                  setRange(text);
                  setError("");
                }}
                keyboardType="numeric" // Ensure users only enter numbers
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!title.trim() || !question.trim() || !range.trim()) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleAddTopic}
              disabled={!title.trim() || !question.trim() || !range.trim()}
            >
              <Text style={styles.submitButtonText}>Create Topic</Text>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: "#6a5acd",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  headerSpacer: {
    width: 28,
  },
  formContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#6a5acd",
    padding: 10,
    borderRadius: 15,
    shadowColor: "#6a5acd",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 12,
    color: "#fff",
  },
  formContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    shadowColor: "#6a5acd",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#6a5acd",
    marginTop: 15,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4a4a6a",
    marginBottom: 10,
    marginLeft: 5,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#4a4a6a",
    borderWidth: 1,
    borderColor: "#e9e9f5",
    shadowColor: "#afafda",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#6a5acd",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6a5acd",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 10,
    opacity: 1,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 10,
  },
  errorContainer: {
    backgroundColor: "#e53935",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  errorText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 15,
  },
  successContainer: {
    backgroundColor: "#4caf50",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  successText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 15,
  },
});
