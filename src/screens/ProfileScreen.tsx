// src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth, db, storage } from "../config/firebaseConfig";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../config/navigationTypes";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { RadioButton } from "react-native-paper";
import * as ImageManipulator from 'expo-image-manipulator';

interface UserData {
  name: string;
  email: string;
  age: string;
  gender: string;
  bio?: string;
  profilePic?: string;
}

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [updatedName, setUpdatedName] = useState("");
  const [updatedAge, setUpdatedAge] = useState("");
  const [updatedGender, setUpdatedGender] = useState("Male");
  const [updatedBio, setUpdatedBio] = useState("");
  const [profilePic, setProfilePic] = useState<string | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'We need camera roll permissions to upload profile pictures');
        }
      }
    })();
  }, []);

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
          routes: [{ name: "Auth" }],
        })
      );
    } catch (error) {
      console.error("Logout Error:", error);
      Alert.alert("Error", "Logout failed. Please try again.");
    }
  };

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      Alert.alert("Error", "User not authenticated");
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
          setProfilePic(data.profilePic || null);
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
        Alert.alert("Error", "Failed to load profile data");
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

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);
      
      // Compress and resize the image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800, height: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const response = await fetch(manipulatedImage.uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profilePics/${auth.currentUser?.uid}_${Date.now()}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Keep using MediaTypeOptions
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
  
      if (!result.canceled && result.assets[0].uri) {
        const uploadUrl = await uploadImage(result.assets[0].uri);
        setProfilePic(uploadUrl);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
    }
  };

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !userData) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    if (!updatedName.trim() || !updatedAge.trim() || !updatedGender.trim()) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        name: updatedName,
        age: updatedAge,
        gender: updatedGender,
        bio: updatedBio,
        ...(profilePic && { profilePic }),
      });
      setEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.container}>
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
    <ScrollView 
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <TouchableOpacity 
          onPress={pickImage} 
          disabled={uploading || !editing}
          style={styles.profileImageContainer}
        >
          {uploading ? (
            <View style={styles.profileImageUploading}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : profilePic ? (
            <Image 
              source={{ uri: profilePic }} 
              style={styles.profileImage} 
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={60} color="#fff" />
            </View>
          )}
          {editing && (
            <View style={styles.editPhotoButton}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        
        <Text style={styles.userName}>{userData.name}</Text>
        <Text style={styles.userEmail}>{userData.email}</Text>
      </View>

      <View style={styles.card}>
        {/* Name */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Name*</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={updatedName}
              onChangeText={setUpdatedName}
              placeholder="Your full name"
            />
          ) : (
            <Text style={styles.info}>{userData.name}</Text>
          )}
        </View>

        {/* Age */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Age*</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={updatedAge}
              onChangeText={setUpdatedAge}
              keyboardType="numeric"
              placeholder="Your age"
            />
          ) : (
            <Text style={styles.info}>{userData.age}</Text>
          )}
        </View>

        {/* Gender */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Gender*</Text>
          {editing ? (
            <View style={styles.radioGroup}>
              {["Male", "Female", "Other"].map((gender) => (
                <TouchableOpacity 
                  style={[
                    styles.radioOption, 
                    updatedGender === gender && styles.radioOptionSelected
                  ]} 
                  key={gender}
                  onPress={() => setUpdatedGender(gender)}
                >
                  <RadioButton
                    value={gender}
                    status={updatedGender === gender ? "checked" : "unchecked"}
                    color="#6C63FF"
                  />
                  <Text style={styles.radioLabel}>{gender}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.info}>{userData.gender}</Text>
          )}
        </View>

        {/* Bio */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Bio</Text>
          {editing ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={updatedBio}
              onChangeText={setUpdatedBio}
              multiline
              placeholder="Tell us about yourself..."
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.info}>{userData.bio || "No bio yet"}</Text>
          )}
        </View>

        {/* Buttons */}
        {!editing ? (
          <TouchableOpacity 
            style={[styles.button, styles.editButton]} 
            onPress={() => setEditing(true)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={() => {
                setEditing(false);
                setProfilePic(userData.profilePic || null);
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.saveButton]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
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

        {!editing && (
          <TouchableOpacity 
            style={[styles.button, styles.logoutButton]} 
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 20,
    color: "#6C63FF",
    fontSize: 16,
  },
  errorText: {
    color: "#dc3545",
    fontSize: 18,
    marginTop: 30,
    marginBottom: 20,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 30,
    width: '100%',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#6C63FF',
  },
  profileImagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6C63FF',
  },
  profileImageUploading: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 1,
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#6C63FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#6c757d',
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  infoRow: {
    marginBottom: 20,
  },
  label: {
    fontWeight: "600",
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  info: {
    fontSize: 16,
    color: "#495057",
    lineHeight: 24,
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#495057',
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  radioGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  radioOptionSelected: {
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
  },
  radioLabel: {
    marginLeft: 8,
    color: '#495057',
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 15,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  editButton: {
    backgroundColor: "#6C63FF",
  },
  saveButton: {
    backgroundColor: "#28a745",
    flex: 1,
  },
  cancelButton: {
    backgroundColor: "#dc3545",
    flex: 1,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  logoutButton: {
    backgroundColor: "#dc3545",
    marginTop: 20,
  },
});