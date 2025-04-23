// src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { auth, db } from "../config/firebaseConfig";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../config/navigationTypes";
import { CommonActions, useNavigation } from "@react-navigation/native";

interface UserData {
  name: string;
  email: string;
  age: string;
  gender: string;
  bio?: string;
}

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const GENDER_OPTIONS = ["Male", "Female", "Other"];

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updatedName, setUpdatedName] = useState("");
  const [updatedAge, setUpdatedAge] = useState("");
  const [updatedGender, setUpdatedGender] = useState("Male");
  const [updatedBio, setUpdatedBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    text: "",
    type: "success" as "success" | "error"
  });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const showAlert = (text: string, type: "success" | "error") => {
    setAlertConfig({ text, type });
    setAlertVisible(true);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setAlertVisible(false));
  };

  const renderGenderOption = useCallback(
    (gender: string) => (
      <TouchableOpacity
        key={gender}
        style={[
          styles.radioOption,
          updatedGender === gender && styles.radioOptionSelected,
        ]}
        onPress={() => setUpdatedGender(gender)}
        activeOpacity={0.7}
      >
        <View style={styles.radioCircle}>
          {updatedGender === gender && <View style={styles.radioInnerCircle} />}
        </View>
        <Text style={styles.radioLabel}>{gender}</Text>
      </TouchableOpacity>
    ),
    [updatedGender]
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Use navigation.reset instead of CommonActions.reset
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    } catch (error) {
      console.error("Error signing out: ", error);
      showAlert("Failed to logout. Please try again.", "error");
    }
  };

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      showAlert("User not authenticated", "error");
      navigation.goBack();
      return;
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          setUserData(data);
          if (!editing) {
            setUpdatedName(data.name);
            setUpdatedAge(data.age || "");
            setUpdatedGender(data.gender || "Male");
            setUpdatedBio(data.bio || "");
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching live profile:", error);
        showAlert("Failed to load profile data", "error");
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [navigation, editing]);

  const handleSave = async () => {
    if (isSubmitting) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser || !userData) {
      showAlert("User not authenticated", "error");
      return;
    }

    if (!updatedName.trim() || !updatedAge.trim() || !updatedGender.trim()) {
      showAlert("Please fill all required fields", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        name: updatedName,
        age: updatedAge,
        gender: updatedGender,
        bio: updatedBio,
      });
      setEditing(false);
      showAlert("Profile updated successfully!", "success");
    } catch (error) {
      console.error("Error updating profile:", error);
      showAlert("Failed to update profile. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6a5acd" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#e53935" />
        <Text style={styles.errorText}>User data not found.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Auth")}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <StatusBar barStyle="light-content" backgroundColor="#6a5acd" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        {/* Custom Alert */}
        {alertVisible && (
          <Animated.View
            style={[
              styles.alertContainer,
              {
                backgroundColor: alertConfig.type === "success" ? "#4CAF50" : "#F44336",
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons
              name={alertConfig.type === "success" ? "checkmark-circle" : "alert-circle"}
              size={24}
              color="#fff"
            />
            <Text style={styles.alertText}>{alertConfig.text}</Text>
          </Animated.View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {userData.name?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            <Text style={styles.userName}>{userData.name}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
          </View>

          <View style={styles.content}>
            {/* Name */}
            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <Ionicons name="person" size={20} color="#6a5acd" />
                <Text style={styles.label}>Name</Text>
              </View>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={updatedName}
                  onChangeText={setUpdatedName}
                  placeholder="Your full name"
                  placeholderTextColor="#aaa"
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.name}</Text>
              )}
            </View>

            {/* Age */}
            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <Ionicons name="calendar" size={20} color="#6a5acd" />
                <Text style={styles.label}>Age</Text>
              </View>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={updatedAge}
                  onChangeText={setUpdatedAge}
                  keyboardType="numeric"
                  placeholder="Your age"
                  placeholderTextColor="#aaa"
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.age}</Text>
              )}
            </View>

            {/* Gender */}
            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <Ionicons name="people" size={20} color="#6a5acd" />
                <Text style={styles.label}>Gender</Text>
              </View>
              {editing ? (
                <View style={styles.radioGroup}>
                  {GENDER_OPTIONS.map(renderGenderOption)}
                </View>
              ) : (
                <Text style={styles.fieldValue}>{userData.gender}</Text>
              )}
            </View>

            {/* Bio */}
            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <Ionicons name="information-circle" size={20} color="#6a5acd" />
                <Text style={styles.label}>Bio</Text>
              </View>
              {editing ? (
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={updatedBio}
                  onChangeText={setUpdatedBio}
                  multiline
                  placeholder="Tell us about yourself..."
                  placeholderTextColor="#aaa"
                  numberOfLines={4}
                />
              ) : (
                <Text style={[styles.fieldValue, !userData.bio && styles.emptyBio]}>
                  {userData.bio || "No bio yet"}
                </Text>
              )}
            </View>

            {/* Action Buttons */}
            {!editing ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.editButton]}
                  onPress={() => setEditing(true)}
                >
                  <Ionicons name="create-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.logoutButton]}
                  onPress={handleLogout}
                >
                  <Ionicons name="log-out-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setEditing(false)}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    color: "#6a5acd",
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 24,
  },
  errorText: {
    color: "#e53935",
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
    fontWeight: "500",
  },
  header: {
    alignItems: "center",
    paddingVertical: 25,
    paddingHorizontal: 20,
    backgroundColor: "#6a5acd",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#6a5acd",
  },
  userName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
    textAlign: "center",
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 20,
  },
  fieldContainer: {
    marginBottom: 15,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    shadowColor: "#6a5acd",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#6a5acd",
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4a4a6a",
    marginLeft: 10,
    textTransform: "capitalize",
  },
  fieldValue: {
    fontSize: 16,
    color: "#6a6a89",
    lineHeight: 22,
    marginLeft: 10,
  },
  emptyBio: {
    color: "#aaa",
    fontStyle: "italic",
  },
  input: {
    fontSize: 16,
    color: "#4a4a6a",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 4,
    borderRadius: 4,
    backgroundColor: "#f9f9f9",
  },
  bioInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 8,
  },
  radioGroup: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 8,
    flexWrap: "wrap",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
    marginVertical: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  radioLabel: {
    marginLeft: 6,
    color: "#4a4a6a",
    fontSize: 15,
  },
  radioOptionSelected: {
    backgroundColor: "rgba(106, 90, 205, 0.1)",
  },
  actionButtons: {
    marginTop: 8,
  },
  editButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: "#6a5acd",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    flex: 1,
  },
  cancelButton: {
    backgroundColor: "#e53935",
    flex: 1,
  },
  logoutButton: {
    backgroundColor: "#afafda",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#6a5acd",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#6a5acd",
  },
  alertContainer: {
    position: "absolute",
    top: 10,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  alertText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 10,
    flex: 1,
  },
});