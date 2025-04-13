import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../config/navigationTypes";
import { signUp } from "../config/auth";
import { RadioButton } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";

type SignupScreenNavigationProp = StackNavigationProp<AuthStackParamList, "Signup">;

export default function SignupScreen() {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !age || !email || !password) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await signUp(name, age, gender, bio, email, password);
      navigation.navigate("Login");
      Alert.alert("Success", "Account created successfully! Please login.");
    } catch (error: any) {
      Alert.alert("Signup Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
        <LinearGradient colors={["#afafda", "#afafda"]} style={styles.container}>
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>

          <TextInput 
            style={styles.input} 
            placeholder="Full Name*" 
            value={name} 
            onChangeText={setName} 
          />
          <TextInput 
            style={styles.input} 
            placeholder="Age*" 
            value={age} 
            onChangeText={setAge} 
            keyboardType="numeric" 
          />

          <Text style={styles.label}>Gender*:</Text>
          <RadioButton.Group onValueChange={setGender} value={gender}>
            <View style={styles.radioContainer}>
              <View style={styles.radioOption}>
                <RadioButton value="Male" />
                <Text>Male</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="Female" />
                <Text>Female</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="Other" />
                <Text>Other</Text>
              </View>
            </View>
          </RadioButton.Group>

          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Short Bio (Optional)" 
            value={bio} 
            onChangeText={setBio} 
            multiline
          />
          <TextInput 
            style={styles.input} 
            placeholder="Email Address*" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput 
            style={styles.input} 
            placeholder="Password*" 
            secureTextEntry 
            value={password} 
            onChangeText={setPassword} 
          />

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
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
    justifyContent: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 15, 
    textAlign: "center",
    color: "#afafda",
  },
  input: { 
    height: 50, 
    borderColor: "#ddd", 
    borderWidth: 1, 
    marginBottom: 15, 
    padding: 10, 
    borderRadius: 10,
    backgroundColor: "#f8f9fa",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  label: { 
    fontSize: 16, 
    marginBottom: 10,
    fontWeight: "bold",
    color: "#afafda",
  },
  radioContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  radioOption: { 
    flexDirection: "row", 
    alignItems: "center",
  },
  button: { 
    backgroundColor: "#afafda", 
    padding: 15, 
    borderRadius: 10, 
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    marginTop: 10,
  },
  buttonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16,
  },
  linkText: { 
    marginTop: 15, 
    color: "#6c757d", 
    textAlign: "center",
    fontSize: 14,
  },
  linkBold: {
    color: "#afafda",
    fontWeight: "bold",
  }
});
