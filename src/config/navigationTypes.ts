// src/config/navigationTypes.ts

export type RootStackParamList = {
  Profile: undefined;
  Login: undefined;
  Splash: undefined;
  AuthStack:undefined;
  Auth: undefined;
  Main: undefined;
  Home: undefined;
  ChatScreen: { chatId: string; userName: string };
  TopicScreen: { topic: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  TopicScreen: { topic: string };

};

export type MainTabParamList = {
  Home: undefined;
  ChatHistory: undefined;
  Friends: undefined;
  Profile: undefined;
};


export type MainStackParamList = {
  MainTabs: undefined;
  TopicScreen: { topic: string };
  ChatScreen: { chatId: string; userName: string };
  Friends: undefined;
};