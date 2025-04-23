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
  Modal,
  Pressable,
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  deleteDoc,
  updateDoc,
  arrayUnion,
  getDoc,
  getDocs,
  where,
  writeBatch
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
  hiddenForUsers?: string[];
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    cancelable: true
  });

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setUserId(currentUser.uid);

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
          hiddenForUsers: doc.data().hiddenForUsers || [],
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
    setSelectedTopicId(topicId);
    setModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!selectedTopicId) return;
    
    try {
      setModalVisible(false);
      
      // First, get a reference to the topic to find its title
      const topicRef = doc(db, 'topics', selectedTopicId);
      const topicSnap = await getDoc(topicRef);
      
      if (topicSnap.exists()) {
        const topicData = topicSnap.data();
        const topicTitle = topicData.title;
        
        // Delete all messages related to this topic
        const messagesQuery = query(
          collection(db, 'messages'),
          where('topicTitle', '==', topicTitle)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        
        // Create a batch to perform multiple delete operations
        const batch = writeBatch(db);
        
        // Add all message deletions to the batch
        messagesSnapshot.docs.forEach((messageDoc) => {
          batch.delete(messageDoc.ref);
        });
        
        // Add the topic deletion to the batch
        batch.delete(topicRef);
        
        // Commit the batch
        await batch.commit();
        
        // Show success alert
        showCustomAlert('Success', 'Topic and all related messages have been deleted.');
      } else {
        // Delete just the topic if for some reason we can't find it
        await deleteDoc(topicRef);
      }
    } catch (error) {
      console.error('Error deleting topic:', error);
      showCustomAlert('Error', 'Failed to delete topic and its messages.');
    }
  };

  const handleLeaveTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    showCustomAlert(
      'Leave Topic',
      'Are you sure you want to leave this topic? You won\'t see it anymore.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setSelectedTopicId(null),
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!userId || !selectedTopicId) return;
            try {
              const topicRef = doc(db, 'topics', selectedTopicId);
              await updateDoc(topicRef, {
                hiddenForUsers: arrayUnion(userId)
              });
            } catch (error) {
              console.error('Error leaving topic:', error);
              showCustomAlert('Error', 'Failed to leave topic.');
            }
          },
        },
      ],
      true
    );
  };

  const showCustomAlert = (title, message, buttons = [], cancelable = true) => {
    setAlertConfig({
      title,
      message,
      buttons: buttons.length ? buttons : [{ text: 'OK', onPress: () => setAlertVisible(false) }],
      cancelable
    });
    setAlertVisible(true);
  };

  const renderTopicItem = ({ item }: { item: Topic }) => {
    if (item.hiddenForUsers?.includes(userId)) return null;

    const isUserCreator = item.createdBy === userId;

    return (
      <TouchableOpacity
        style={styles.topicButton}
        onPress={() => handleTopicPress(item.title)}
      >
        <View style={styles.topicHeader}>
          <Text style={styles.topicTitle}>{item.title}</Text>
          <View style={styles.topicActions}>
            {isUserCreator ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteTopic(item.id);
                }}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={22} color="#e53935" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleLeaveTopic(item.id);
                }}
                style={styles.actionButton}
              >
                <Ionicons name="exit-outline" size={22} color="#ff9800" />
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-forward" size={22} color="#afafda" />
          </View>
        </View>
        <Text style={styles.topicQuestion}>{item.question}</Text>
        <Text style={styles.topicDate}>
          {new Date(item.createdAt?.toDate()).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  };

  const visibleTopics = topics.filter(topic => !topic.hiddenForUsers?.includes(userId));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Ionicons name="chatbubbles" size={28} color="#fff" />
          <Text style={styles.topicsTitle}>Discussion Topics</Text>
        </View>

        {visibleTopics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbox-outline" size={60} color="#afafda" />
            <Text style={styles.emptyText}>No topics to show</Text>
            <Text style={styles.emptySubText}>Create or join a topic to start chatting</Text>
          </View>
        ) : (
          <FlatList
            data={visibleTopics}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            renderItem={renderTopicItem}
          />
        )}
      </View>

      {/* Custom Modal for Delete Confirmation */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete Topic</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this topic? All messages will be permanently removed.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={alertVisible}
        onRequestClose={() => alertConfig.cancelable && setAlertVisible(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <View style={styles.alertHeader}>
              <Ionicons 
                name={alertConfig.title.toLowerCase().includes('error') ? "alert-circle" : "information-circle"} 
                size={30} 
                color={alertConfig.title.toLowerCase().includes('error') ? "#e53935" : "#6a5acd"} 
              />
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            </View>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <View style={[
              styles.alertButtons, 
              alertConfig.buttons.length > 1 ? styles.alertButtonsMultiple : styles.alertButtonsSingle
            ]}>
              {alertConfig.buttons.map((button, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.alertButton,
                    button.style === 'destructive' ? styles.alertButtonDestructive : 
                    button.style === 'cancel' ? styles.alertButtonCancel : styles.alertButtonDefault
                  ]}
                  onPress={() => {
                    setAlertVisible(false);
                    button.onPress && button.onPress();
                  }}
                >
                  <Text style={[
                    styles.alertButtonText,
                    button.style === 'destructive' ? styles.alertButtonTextDestructive : 
                    button.style === 'cancel' ? styles.alertButtonTextCancel : styles.alertButtonTextDefault
                  ]}>
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#6a5acd',
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  headerContent: {
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#6a5acd',
    padding: 15,
    borderRadius: 15,
    shadowColor: '#6a5acd',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  topicsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#fff',
  },
  listContainer: {
    paddingBottom: 25,
  },
  topicButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 18,
    shadowColor: '#6a5acd',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#6a5acd',
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topicActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 15,
    padding: 5,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a4a6a',
    flex: 1,
  },
  topicQuestion: {
    fontSize: 15,
    color: '#6a6a89',
    marginBottom: 10,
    lineHeight: 22,
  },
  topicDate: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 20,
    color: '#6a5acd',
    marginTop: 20,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 15,
    color: '#aaa',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4a4a6a',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#6a6a89',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f5',
  },
  deleteButton: {
    backgroundColor: '#ff4d4d',
  },
  cancelButtonText: {
    color: '#6a6a89',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  // Custom Alert styles
  alertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  alertContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f5',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a4a6a',
    marginLeft: 10,
  },
  alertMessage: {
    fontSize: 16,
    color: '#6a6a89',
    marginBottom: 20,
    lineHeight: 22,
  },
  alertButtons: {
    marginTop: 5,
  },
  alertButtonsSingle: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  alertButtonsMultiple: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alertButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginHorizontal: 5,
    minWidth: 120,
    alignItems: 'center',
  },
  alertButtonDefault: {
    backgroundColor: '#6a5acd',
  },
  alertButtonCancel: {
    backgroundColor: '#f0f0f5',
  },
  alertButtonDestructive: {
    backgroundColor: '#ff4d4d',
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertButtonTextDefault: {
    color: 'white',
  },
  alertButtonTextCancel: {
    color: '#6a6a89',
  },
  alertButtonTextDestructive: {
    color: 'white',
  },
});