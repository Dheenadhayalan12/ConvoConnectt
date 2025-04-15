// src/screens/ChatHistoryScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../config/navigationTypes';
import { auth, db } from '../config/firebaseConfig';
import { collection, query, onSnapshot, doc as firestoreDoc, getDoc, DocumentData } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../config/navigationTypes';

interface Chat {
  id: string;
  userId: string;
  userName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
}

interface UserData {
  name: string;
  email?: string;
}

type ChatHistoryNavigationProp = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

export default function ChatHistoryScreen() {
  const navigation = useNavigation<ChatHistoryNavigationProp>();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, 'friends', userId, 'friendList'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (docSnap) => {
        const friendId = docSnap.id;
        const userRef = firestoreDoc(db, 'users', friendId);
        const userDoc = await getDoc(userRef);

        let userData: UserData = { name: 'Unknown' };
        if (userDoc.exists()) {
          userData = userDoc.data() as UserData;
        }

        return {
          id: `${userId}_${friendId}`,
          userId: friendId,
          userName: userData.name,
          lastMessage: 'Tap to chat',
          lastMessageTime: new Date(),
        };
      });

      const chatList = await Promise.all(chatPromises);
      setChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const navigateToChat = (chatId: string, userName: string) => {
    navigation.navigate("ChatScreen", { chatId, userName });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat History</Text>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => navigateToChat(item.id, item.userName)}
          >
            <View style={styles.chatInfo}>
              <Text style={styles.chatName}>{item.userName}</Text>
              <Text style={styles.lastMessage}>{item.lastMessage}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No chats yet. Add friends to start chatting!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop:25,
    color:'#007bff'
  },
  chatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 18,
    fontWeight: 'bold',
    color:'#72bcd4'
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});
