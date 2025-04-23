// src/screens/SignupScreen.tsx

import React, { useState, useEffect, useRef } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { signUp } from "../config/auth";
import { RadioButton } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { RootStackParamList } from "../config/navigationTypes";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Animatable from "react-native-animatable";
import { Ionicons } from "@expo/vector-icons";

type SignupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

export default function SignupScreen() {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  const showMessage = (message: string, type: 'error' | 'success') => {
    if (type === 'error') {
      setError(message);
      setSuccess("");
    } else {
      setSuccess(message);
      setError("");
    }

    // Clear message after 5 seconds if it's an error
    if (type === 'error' && messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = setTimeout(() => {
        setError("");
      }, 5000);
    }
  };

  const handleSignup = async () => {
    if (!name || !age || !email || !password) {
      showMessage("Please fill in all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      await signUp(name, age, gender, bio, email, password);
      showMessage("Account created successfully!", "success");
      
      // Wait a moment for the user to see success message, then navigate
      setTimeout(() => {
        navigation.navigate("Main");
      }, 1500);
    } catch (error: any) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#6a5acd", "#afafda"]} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined} 
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* App Logo with Rotating Background */}
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Animatable.View 
                animation="rotate"
                iterationCount="infinite"
                duration={8000}
                style={styles.logoBackground}
              />
              <View style={styles.logoIconContainer}>
                <Ionicons name="person-add" size={34} color="#fff" />
              </View>
            </View>
            
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join ConvoConnect today</Text>
          </View>

          {/* Alert Messages */}
          {error ? (
            <Animatable.View animation="fadeIn" style={styles.alertContainer}>
              <Ionicons name="alert-circle" size={20} color="#fff" />
              <Text style={styles.alertText}>{error}</Text>
            </Animatable.View>
          ) : null}
          
          {success ? (
            <Animatable.View animation="bounceIn" style={[styles.alertContainer, styles.successAlert]}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.alertText}>{success}</Text>
            </Animatable.View>
          ) : null}

          <View style={styles.formContainer}>
            {/* Name Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#fff" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Full Name*" 
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={name} 
                onChangeText={setName} 
              />
            </View>

            {/* Age Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={20} color="#fff" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Age*" 
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={age} 
                onChangeText={setAge} 
                keyboardType="numeric" 
              />
            </View>

            {/* Gender Selection */}
            <Text style={styles.label}>Gender*</Text>
            <View style={styles.radioContainer}>
              <View style={styles.radioOption}>
                <RadioButton value="Male" status={gender === 'Male' ? 'checked' : 'unchecked'} onPress={() => setGender('Male')} color="#fff" />
                <Text style={styles.radioText}>Male</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="Female" status={gender === 'Female' ? 'checked' : 'unchecked'} onPress={() => setGender('Female')} color="#fff" />
                <Text style={styles.radioText}>Female</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="Other" status={gender === 'Other' ? 'checked' : 'unchecked'} onPress={() => setGender('Other')} color="#fff" />
                <Text style={styles.radioText}>Other</Text>
              </View>
            </View>

            {/* Bio Input */}
            <View style={styles.textAreaContainer}>
              <View style={styles.textAreaIconContainer}>
                <Ionicons name="document-text-outline" size={20} color="#fff" />
              </View>
              <TextInput 
                style={styles.textArea} 
                placeholder="Short Bio (Optional)" 
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={bio} 
                onChangeText={setBio} 
                multiline
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#fff" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Email Address*" 
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#fff" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Password*" 
                placeholderTextColor="rgba(255,255,255,0.7)"
                secureTextEntry 
                value={password} 
                onChangeText={setPassword} 
              />
            </View>

            {/* Signup Button */}
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                {loading ? (
                  <ActivityIndicator color="#6a5acd" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity 
              style={styles.loginContainer}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginText}>Already have an account? </Text>
              <Text style={styles.linkText}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoContainer: {
    position: "relative",
    width: 70,
    height: 70,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBackground: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  logoIconContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
    textAlign: "center",
  },
  // Alert styles
  alertContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 53, 69, 0.8)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: "100%",
  },
  successAlert: {
    backgroundColor: "rgba(40, 167, 69, 0.8)",
  },
  alertText: {
    color: "#fff",
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: { 
    flex: 1,
    height: 50, 
    color: "#fff",
    fontSize: 16,
  },
  textAreaContainer: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    minHeight: 80,
    flexDirection: "row",
  },
  textAreaIconContainer: {
    paddingTop: 14,
    marginRight: 12,
  },
  textArea: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  label: { 
    fontSize: 16, 
    fontWeight: "500",
    color: "#fff",
    marginBottom: 8,
  },
  radioContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  radioOption: { 
    flexDirection: "row", 
    alignItems: "center",
  },
  radioText: {
    color: "#fff",
    fontSize: 15,
  },
  button: { 
    backgroundColor: "#fff", 
    width: "100%",
    borderRadius: 8, 
    height: 50,
    marginTop: 8,
    overflow: "hidden",
  },
  buttonContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { 
    color: "#6a5acd", 
    fontWeight: "600", 
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "center",
  },
  loginText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 15,
  },
  linkText: { 
    color: "#fff", 
    fontSize: 15,
    fontWeight: "bold",
  }
});