import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, Alert, ActivityIndicator 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../config/navigationTypes";
import { signIn } from "../config/auth";
import * as Animatable from "react-native-animatable";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from '../config/auth';
console.log("Firebase Auth initialized:", auth);

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, "Login">;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#afafda","#afafda"]} style={styles.container}>
      
      {/* Animated Title */}
      <Animatable.Text 
        animation="fadeInDown" 
        duration={1500} 
        style={styles.title}
      >
        ConvoConnect
      </Animatable.Text>

      {/* Animated Input Fields */}
      <Animatable.View animation="fadeInUp" delay={500} style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#e9dfd8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={700} style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#e9dfd8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </Animatable.View>

      {/* Animated Button */}
      <Animatable.View animation="fadeInUp" delay={900}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#e9dfd8" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </Animatable.View>

      {/* Signup Link */}
      <Animatable.View animation="fadeInUp" delay={1100}>
        <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
          <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </Animatable.View>

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
  title: { 
    fontSize: 32, 
    fontWeight: "bold",
    color: "#e9dfe9", 
    marginBottom: 40 
  },
  inputContainer: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  input: { 
    height: 50, 
    color: "white", 
    fontSize: 16 ,
  },
  button: { 
    backgroundColor: "#e9dfe9", 
    padding: 15, 
    width: 120,
    borderRadius: 10, 
    alignItems: "center",
    justifyContent: "center",
    height: 50,
  },
  buttonText: { 
    color: "#afafda", 
    fontSize: 18, 
    fontWeight: "bold" 
  },
  linkText: { 
    marginTop: 15, 
    color: "#e9dfe9", 
    fontSize: 16 
  },
});
