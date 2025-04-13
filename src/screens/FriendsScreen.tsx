// screens/FriendsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { collection, query, where, onSnapshot, doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../config/navigationTypes';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../config/navigationTypes';

type FriendsNavigationProp = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

interface Friend {
  id: string;
  name: string;
  since: Date;
}

export default function FriendsScreen() {
  const navigation = useNavigation<FriendsNavigationProp>();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'friends', userId, 'friendList')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendsData = await Promise.all(
        snapshot.docs.map(async (friendDoc) => {
          const friendId = friendDoc.id;
          const friendUserDoc = await getDoc(firestoreDoc(db, 'users', friendId));
          const friendName = friendUserDoc.exists() ? friendUserDoc.data().name : 'Unknown';

          return {
            id: friendId,
            name: friendName,
            since: friendDoc.data().since?.toDate?.() || new Date()
          };
        })
      );
      setFriends(friendsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const startChat = (friendId: string, friendName: string) => {
    const chatId = [userId, friendId].sort().join('_');
    navigation.navigate('ChatScreen', { chatId, userName: friendName });
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
      <Text style={styles.title}>Friends</Text>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.friendItem}>
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>{item.name}</Text>
              <Text style={styles.friendSince}>
                Friends since: {item.since.toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => startChat(item.id, item.name)}
            >
              <Ionicons name="chatbubble" size={24} color="#007bff" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No friends yet. Add some friends to start chatting!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  friendInfo: {
    flex: 1
  },
  friendName: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  friendSince: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  chatButton: {
    padding: 8
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666'
  }
});