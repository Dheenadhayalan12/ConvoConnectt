// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebaseConfig';
// Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SplashScreen from '../screens/SplashScreen';
import TopicScreen from '../screens/TopicScreen';
import ChatScreen from '../screens/ChatScreen';
import AddTopicsScreen from '../screens/AddTopicsScreen';
import { AuthStackParamList } from '../config/navigationTypes';
import UserProfileScreen from '../screens/UserProfileScreen';
// Navigation Types
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Profile: undefined;
  Signup: undefined;
  TopicScreen: { topic: string };
  ChatScreen: { chatId: string; userName: string };
};
export type MainTabParamList = {
  Home: undefined;
  AddTopics: undefined;
  Profile: undefined;
};
// Auth Stack
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
function AuthStackNavigator() {
  return (
    <AuthStack.Navigator 
      {...({ id: undefined, screenOptions: { headerShown: false } } as any)}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}


// Main Tab Navigator
const Tab = createBottomTabNavigator<MainTabParamList>();
function MainTabNavigator() {
  const getIconName = (routeName: keyof MainTabParamList, focused: boolean) => {
    switch (routeName) {
      case 'Home':
        return focused ? 'home' : 'home-outline';
      case 'AddTopics':
        return focused ? 'add-circle' : 'add-circle-outline';
      case 'Profile':
        return focused ? 'person' : 'person-outline';
      default:
        return 'home';
    }
  };

    return (
    <Tab.Navigator
      {...({ id: undefined, screenOptions: ({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={getIconName(route.name, focused)} size={size} color={color} />
        ),
        tabBarActiveTintColor: '#6a5acd',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }) } as any)}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="AddTopics" component={AddTopicsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Root Navigator
const RootStack = createNativeStackNavigator<RootStackParamList>();
export default function AppNavigator() {
  const [user, loading] = useAuthState(auth);
  if (loading) return <SplashScreen />;
  return (
    <NavigationContainer>
      <RootStack.Navigator 
        {...({ id: undefined, screenOptions: { headerShown: false } } as any)}
      >
        {!user ? (
          <>
            <RootStack.Screen name="Splash" component={SplashScreen} />
            <RootStack.Screen name="Auth" component={AuthStackNavigator} />
          </>
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabNavigator} />
            <RootStack.Screen name="TopicScreen" component={TopicScreen} />
            <RootStack.Screen name="ChatScreen" component={ChatScreen} />
            <RootStack.Screen name="UserProfileScreen" component={UserProfileScreen} />

          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}