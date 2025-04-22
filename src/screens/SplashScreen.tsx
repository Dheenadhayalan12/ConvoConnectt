// src/screens/SplashScreen.tsx

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from "expo-linear-gradient";
import { auth } from '../config/auth';

export default function SplashScreen({ navigation }: any) {
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        navigation.replace('Main');
      } else {
        navigation.replace('Auth', { screen: 'Login' });
      }
    }, 1500);
  
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient colors={["#afafda", "#afafda"]} style={styles.container}>
      <View style={styles.container}>
        <Animatable.Text animation="zoomIn" duration={2000} style={styles.logoText}>
          CONVOCONNECT
        </Animatable.Text>
        
        <Animatable.Text animation="fadeInUp" delay={500} style={styles.tagline}>
          Where Ideas Align
        </Animatable.Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  logoText: { 
    fontSize: 40, 
    fontWeight: 'bold', 
    color: 'white', 
    marginBottom: 10 
  },
  tagline: { 
    fontSize: 18, 
    color: 'white', 
    opacity: 0.8, 
    marginTop: 10 
  },
});
