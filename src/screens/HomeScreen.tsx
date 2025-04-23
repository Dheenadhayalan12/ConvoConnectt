//HomeScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  deleteDoc
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../config/navigationTypes';
import { Ionicons } from '@expo/vector-icons';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Topic {
  id: string;
  title: string;
  question: string;
  createdAt: any;
  createdBy?: string;
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setUserId(currentUser.uid);

    // User data listener
    const unsubscribeUser = onSnapshot(doc(db, 'users', currentUser.uid), 
      (docSnap) => {
        setUserName(docSnap.exists() ? docSnap.data().name || 'User' : 'User');
        setLoading(false);
      }, 
      (error) => {
        console.error('Error fetching user data:', error);
        setUserName('User');
        setLoading(false);
      }
    );

    // Topics listener
    const topicsCollection = collection(db, 'topics');
    const topicsQuery = query(topicsCollection, orderBy('createdAt', 'desc'));
    
    const unsubscribeTopics = onSnapshot(topicsQuery, (snapshot) => {
      try {
        const topicsData = snapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          question: doc.data().question,
          createdAt: doc.data().createdAt,
          createdBy: doc.data().createdBy,
        }));
        
        setTopics(topicsData);
      } catch (error) {
        console.error("Error fetching topics:", error);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeTopics();
    };
  }, []);

  const handleTopicPress = (topicTitle: string) => {
    navigation.navigate('TopicScreen', { topic: topicTitle });
  };

  const handleDeleteTopic = async (topicId: string) => {
    Alert.alert(
      'Delete Topic',
      'Are you sure you want to delete this topic?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'topics', topicId));
            } catch (error) {
              console.error('Error deleting topic:', error);
              Alert.alert('Error', 'Failed to delete topic.');
            }
          },
        },
      ]
    );
  };

  const renderTopicItem = ({ item }: { item: Topic }) => (
    <TouchableOpacity
      style={styles.topicButton}
      onPress={() => handleTopicPress(item.title)}
    >
      <View style={styles.topicHeader}>
        <Text style={styles.topicTitle}>{item.title}</Text>
        <View style={styles.topicActions}>
          {item.createdBy === userId && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteTopic(item.id);
              }}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color="#e53935" />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-forward" size={20} color="#afafda" />
        </View>
      </View>
      <Text style={styles.topicQuestion}>{item.question}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" style={styles.loader} />
        ) : (
          <Text style={styles.welcomeText}>
            Welcome, <Text style={styles.userName}>{userName} !</Text>
          </Text>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Ionicons name="chatbubbles" size={24} color="#afafda" />
          <Text style={styles.topicsTitle}>Discussion Topics</Text>
        </View>

        {topics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sad-outline" size={48} color="#afafda" />
            <Text style={styles.emptyText}>No topics yet</Text>
          </View>
        ) : (
          <FlatList
            data={topics}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            renderItem={renderTopicItem}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f5fa',
  },
  header: {
    backgroundColor: '#afafda',
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loader: {
    marginTop: 10,
  },
  welcomeText: {
    marginTop: 15,
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  userName: {
    fontWeight: '700',
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  topicsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#5a5a78',
  },
  listContainer: {
    paddingBottom: 20,
  },
  topicButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#afafda',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e9dfe9',
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  topicActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginRight: 15,
  },
  topicTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#5a5a78',
    flex: 1,
  },
  topicQuestion: {
    fontSize: 14,
    color: '#7a7a9d',
    marginBottom: 12,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#afafda',
    marginTop: 15,
    fontWeight: '500',
  },
});