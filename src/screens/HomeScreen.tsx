// src/screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { collection, query, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../config/navigationTypes';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<any[]>([]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', currentUser.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setUserName(docSnap.data().name || 'User');
        } else {
          setUserName('User');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user data:', error);
        setUserName('User');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const topicsCollection = collection(db, 'topics');
    const q = query(topicsCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const topicsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTopics(topicsData);
    });

    return () => unsubscribe();
  }, []);

  const handleTopicPress = (topicTitle: string) => {
    navigation.navigate('TopicScreen', { topic: topicTitle });
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
      ) : (
        <Text style={styles.welcomeText}>
          Welcome back, <Text style={styles.userName}>{userName}</Text>!
        </Text>
      )}

      <Text style={styles.topicsTitle}>Discussion Topics</Text>

      <FlatList
        data={topics}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.topicButton}
            onPress={() => handleTopicPress(item.title)}
          >
            <Text style={styles.topicTitle}>{item.title}</Text>
            <Text style={styles.topicQuestion}>{item.question}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  loader: {
    marginTop: 50,
  },
  welcomeText: {
    fontSize: 25,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    marginTop: 25,
  },
  userName: {
    color: '#007bff',
  },
  topicsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  topicButton: {
    backgroundColor: '#f2f2f2',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  topicQuestion: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
});
