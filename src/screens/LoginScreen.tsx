// src/screens/LoginScreen.tsx

import React, { useState, useEffect, useRef } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform 
} from "react-native";
import { signIn } from "../config/auth"; // Ensure this is your sign-in function
import * as Animatable from "react-native-animatable";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../config/navigationTypes';
import Lottie from 'lottie-react-native'; // Import Lottie
import { Ionicons } from "@expo/vector-icons"; // Correct Ionicons import

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    messageTimeoutRef.current = setTimeout(() => {
      setError("");
      setSuccess("");
    }, 5000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showMessage("Please fill in all fields", "error");
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      showMessage("Login successful!", "success");
      // Navigation to main screen happens automatically via auth state listener
    } catch (error: any) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <LinearGradient colors={["#6a5acd","#afafda"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidView}
      >
        {/* App Logo with Lottie Animation */}
        <Animatable.View animation="fadeInDown" duration={2000} delay={1000}>
          <Lottie 
            source={require('../assets/animations/chat-animation.json')} // Path to your Lottie file
            autoPlay  
            loop // Looping the animation
            style={styles.logoAnimation}
          />
        </Animatable.View>
        
        <Animatable.View animation="fadeInDown" duration={1000} delay={300}>
          <Text style={styles.title}>ConvoConnect</Text>
          <Text style={styles.subtitle}>Join the conversation</Text>
        </Animatable.View>

        {/* Alert Messages */}
        <Animatable.View animation="fadeIn" duration={1000} delay={500}>
          {error ? (
            <Animatable.View animation="fadeIn" style={styles.alertContainer}>
              <Ionicons name="alert-circle" size={20} color="#fff" />
              <Text style={styles.alertText}>{error}</Text>
            </Animatable.View>
          ) : null}
          
          {success ? (
            <Animatable.View animation="fadeIn" style={[styles.alertContainer, styles.successAlert]}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.alertText}>{success}</Text>
            </Animatable.View>
          ) : null}
        </Animatable.View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          <Animatable.View animation="fadeIn" duration={1000} delay={600}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#e9dfd8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#e9dfd8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </Animatable.View>

          <Animatable.View animation="fadeIn" duration={1000} delay={700}>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#e9dfd8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#e9dfd8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeIcon}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#e9dfd8" 
                />
              </TouchableOpacity>
            </View>
          </Animatable.View>
          
          <Animatable.View animation="fadeIn" duration={1000} delay={800}>
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </Animatable.View>

          <Animatable.View animation="fadeIn" duration={1000} delay={900}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleLogin}
              disabled={loading}
            >
              <View style={styles.buttonContent}>
                {loading ? (
                  <ActivityIndicator color="#6a5acd" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </View>
            </TouchableOpacity>
          </Animatable.View>
        </View>

        {/* Signup Link */}
        <Animatable.View animation="fadeIn" duration={1000} delay={1000} style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.linkText}>Sign Up</Text>
          </TouchableOpacity>
        </Animatable.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 20,
  },
  keyboardAvoidView: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    position: "relative",
    width: 80,
    height: 80,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logoAnimation: {
    width: 100,
    height: 100,
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold",
    color: "#fff", 
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#e9dfe9",
    marginBottom: 16,
  },
  alertContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 53, 69, 0.8)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    width: "100%",
  },
  successAlert: {
    backgroundColor: "rgba(40, 167, 69, 0.8)",
  },
  alertText: {
    color: "#fff",
    marginLeft: 10,
    flex: 1,
  },
  formContainer: {
    width: "100%",
    alignItems: "center",
  },
  inputContainer: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: { 
    flex: 1,
    height: 50, 
    color: "white", 
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#e9dfe9",
    fontSize: 14,
  },
  button: { 
    backgroundColor: "#fff", 
    width: 100,
    borderRadius: 10, 
    height: 50,
    overflow: "hidden",
  },
  buttonContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { 
    color: "#6a5acd", 
    fontSize: 16, 
    fontWeight: "bold",
    textAlign: "center",
    textAlignVertical: "center",
  },
  signupContainer: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "center",
  },
  signupText: {
    color: "#e9dfe9",
    fontSize: 16,
    marginRight: 5,
  },
  linkText: { 
    color: "#fff", 
    fontSize: 16,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});