import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { auth, db } from "../config/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../config/navigationTypes";
import { RadioButton } from "react-native-paper";
import { handleLogout } from '../config/auth';
import { onSnapshot } from "firebase/firestore"; // ✅ onSnapshot added


interface UserData {
  name: string;
  email: string;
  age: string;
  gender: string;
  bio?: string;
}

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, "Profile">;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updatedName, setUpdatedName] = useState("");
  const [updatedAge, setUpdatedAge] = useState("");
  const [updatedGender, setUpdatedGender] = useState("Male");
  const [updatedBio, setUpdatedBio] = useState("");

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
    
      return () => unsubscribe();
    }, [navigation, editing]);
    

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
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        name: updatedName,
        age: updatedAge,
        gender: updatedGender,
        bio: updatedBio,
      });
      
      setEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>User data not found.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileHeader}>
        <Ionicons name="person-circle" size={80} color="#007bff" />
      </View>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Name*:</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={updatedName}
              onChangeText={setUpdatedName}
              placeholder="Enter your name"
            />
          ) : (
            <Text style={styles.info}>{userData.name}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Age*:</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={updatedAge}
              onChangeText={setUpdatedAge}
              placeholder="Enter your age"
              keyboardType="numeric"
            />
          ) : (
            <Text style={styles.info}>{userData.age || "Not specified"}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Gender*:</Text>
          {editing ? (
            <View style={styles.radioGroup}>
              <View style={styles.radioOption}>
                <RadioButton
                  value="Male"
                  status={updatedGender === "Male" ? "checked" : "unchecked"}
                  onPress={() => setUpdatedGender("Male")}
                />
                <Text>Male</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton
                  value="Female"
                  status={updatedGender === "Female" ? "checked" : "unchecked"}
                  onPress={() => setUpdatedGender("Female")}
                />
                <Text>Female</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton
                  value="Other"
                  status={updatedGender === "Other" ? "checked" : "unchecked"}
                  onPress={() => setUpdatedGender("Other")}
                />
                <Text>Other</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.info}>{userData.gender || "Not specified"}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.info}>{userData.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Bio:</Text>
          {editing ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={updatedBio}
              onChangeText={setUpdatedBio}
              placeholder="Tell us about yourself"
              multiline
            />
          ) : (
            <Text style={styles.info}>{userData.bio || "No bio yet"}</Text>
          )}
        </View>

        {!editing ? (
          <TouchableOpacity 
            style={styles.button} 
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
                setUpdatedName(userData.name);
                setUpdatedAge(userData.age);
                setUpdatedGender(userData.gender);
                setUpdatedBio(userData.bio || "");
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {!editing && (
          <TouchableOpacity 
            style={[styles.button, styles.logoutButton]}
            onPress={async () => {
              await handleLogout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }}
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
    backgroundColor: "#f0f2f5", 
    padding: 20 
  },
  loaderContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  errorText: { 
    color: "red", 
    fontSize: 18,
    marginBottom: 20
  },
  profileHeader: { 
    alignItems: "center", 
    marginBottom: 20 
  },
  card: { 
    width: "100%", 
    backgroundColor: "#fff", 
    padding: 20, 
    borderRadius: 15, 
    shadowColor: "#000", 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 3 
  },
  infoRow: { 
    marginBottom: 16,
  },
  label: { 
    fontWeight: "bold", 
    fontSize: 16, 
    color: "#555",
    marginBottom: 4
  },
  info: { 
    fontSize: 16, 
    color: "#333",
  },
  input: { 
    padding: 10, 
    borderWidth: 1, 
    borderColor: "#ccc", 
    borderRadius: 8, 
    fontSize: 16,
  },
  textArea: { 
    height: 100, 
    textAlignVertical: "top",
  },
  radioGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center"
  },
  button: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    marginTop: 16, 
    backgroundColor: "#007bff", 
    padding: 12, 
    borderRadius: 8 
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  saveButton: { 
    backgroundColor: "#28a745",
    flex: 1 
  },
  cancelButton: { 
    backgroundColor: "#dc3545",
    flex: 1 
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold", 
    marginLeft: 8 
  },
  logoutButton: { 
    backgroundColor: '#dc3545',
    marginTop: 10
  },
});
