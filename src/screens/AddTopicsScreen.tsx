// src/screens/AddTopicsScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { db } from '../config/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AddTopicsScreen() {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');

  const handleAddTopic = async () => {
    if (!title.trim() || !question.trim()) {
      Alert.alert('Error', 'Both title and question are required!');
      return;
    }

    try {
      // Add the topic to Firestore
      await addDoc(collection(db, 'topics'), {
        title,
        question,
        createdAt: serverTimestamp(),
      });

      // Clear inputs after success
      setTitle('');
      setQuestion('');
      Alert.alert('Success', 'Topic added successfully!');
    } catch (error) {
      console.error('Error adding topic: ', error);
      Alert.alert('Error', 'Failed to add topic. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Topic Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Topic Question"
        value={question}
        onChangeText={setQuestion}
      />
      <Button title="Add Topic" onPress={handleAddTopic} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 20,
    padding: 10,
  },
});
