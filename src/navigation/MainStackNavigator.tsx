// navigation/MainStackNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './MainNavigator';
import ChatScreen from '../screens/ChatScreen';
import TopicScreen from '../screens/TopicScreen';
import { MainStackParamList } from '../config/navigationTypes';

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="TopicScreen" component={TopicScreen} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
    </Stack.Navigator>
  );
}