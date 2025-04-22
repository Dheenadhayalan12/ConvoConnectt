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
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
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
    ]).start(() => setMessage(null));
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
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      await signOut(auth);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    } catch (error) {
      console.error("Logout Error:", error);
      showMessage("Logout failed. Please try again.", 'error');
    }
  };

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      showMessage("User not authenticated", 'error');
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
        showMessage("Failed to load profile data", 'error');
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
      showMessage("User not authenticated", 'error');
      return;
    }

    if (!updatedName.trim() || !updatedAge.trim() || !updatedGender.trim()) {
      showMessage("Please fill all required fields", 'error');
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
      showMessage("Profile updated successfully!", 'success');
    } catch (error) {
      console.error("Error updating profile:", error);
      showMessage("Failed to update profile. Please try again.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#afafda" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>User data not found.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Message Notification */}
      {message && (
        <Animated.View
          style={[
            styles.messageContainer,
            {
              backgroundColor: message.type === 'success' ? '#4CAF50' : '#F44336',
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
            name={message.type === 'success' ? 'checkmark-circle' : 'warning'}
            size={20}
            color="#fff"
          />
          <Text style={styles.messageText}>{message.text}</Text>
        </Animated.View>
      )}

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
          <Text style={styles.label}>Name</Text>
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
          <Text style={styles.label}>Age</Text>
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
          <Text style={styles.label}>Gender</Text>
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
          <Text style={styles.label}>Bio</Text>
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
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f5f5f9",
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f9",
  },
  loadingText: {
    marginTop: 16,
    color: "#afafda",
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f9",
    padding: 24,
  },
  errorText: {
    color: "#d9534f",
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
  },
  header: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: "#afafda",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarContainer: {
    width: 85,
    height: 85,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#e9dfe9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 20,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#afafda",
  },
  userName: {
    fontSize: 30,
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
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#afafda",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(175, 175, 218, 0.1)",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#afafda",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  fieldValue: {
    fontSize: 16,
    color: "#8f8fda",
    lineHeight: 22,
    marginLeft: 10,
  },
  emptyBio: {
    color: "#999",
    fontStyle: "italic",
  },
  input: {
    fontSize: 15,
    color: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginTop: 4,
  },
  bioInput: {
    height: 72,
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
  },
  radioLabel: {
    marginLeft: 6,
    color: "#555",
    fontSize: 15,
  },
  radioOptionSelected: {
    backgroundColor: "rgba(175, 175, 218, 0.1)",
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
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: "#afafda",
  },
  saveButton: {
    backgroundColor: "#7cb342",
    flex: 1,
  },
  cancelButton: {
    backgroundColor: "#e53935",
    flex: 1,
  },
  logoutButton: {
    backgroundColor: "#e0e0e0",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#afafda",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#afafda",
  },
  // Message notification styles
  messageContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginTop: 40 ,
  },
  messageText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
});