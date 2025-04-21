// src/config/navigationTypes.ts

export type RootStackParamList = {
  Splash: undefined;
  Auth: { screen: string } | undefined;
  Main: undefined;
  Login: undefined;
  Signup: undefined;
  TopicScreen: { topic: string };
  ChatScreen: { chatId: string; userName: string };
};

export type MainTabParamList = {
  Home: undefined;
  ChatHistory: undefined;
  Friends: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};