// src/config/navigationTypes.ts

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Profile: undefined;
  Signup: undefined;
  TopicScreen: { topic: string };
  ChatScreen: { chatId: string; userName: string };
  UserProfileScreen: { userId: string }; 
};
  

export type MainTabParamList = {
  Home: undefined;
  AddTopics: undefined;
  Profile: undefined;
};
  

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type Participant = [string, { userId: string }];