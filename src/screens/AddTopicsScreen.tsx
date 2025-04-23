//AddTopicsScreen.tsx

import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function AddTopicsScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAddTopic = async () => {
    if (!title.trim() || !question.trim()) {
      setError('Both title and question are required!');
      return;
    }
  
    try {
      await addDoc(collection(db, 'topics'), {
        title,
        question,
        createdAt: serverTimestamp(),
        participants: 0,
        createdBy: auth.currentUser?.uid,
      });
  
      setTitle('');
      setQuestion('');
      setSuccess('Topic added successfully!');
      setTimeout(() => setSuccess(''), 3000);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home'); 
      }
    } catch (error) {
      console.error('Error adding topic: ', error);
      setError('Failed to add topic. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Home');
              }
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Create New Topic</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
  
        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={18} color="#fff" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
  
          {/* Success Message */}
          {success ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}
  
          {/* Input Fields */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Topic Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter topic title..."
              placeholderTextColor="#9a9ac0"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                setError('');
              }}
              autoCapitalize="words"
            />
          </View>
  
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Discussion Question</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="What would you like to discuss?"
              placeholderTextColor="#9a9ac0"
              value={question}
              onChangeText={(text) => {
                setQuestion(text);
                setError('');
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
  
          {/* Submit Button */}
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              (!title.trim() || !question.trim()) && styles.submitButtonDisabled
            ]}
            onPress={handleAddTopic}
            disabled={!title.trim() || !question.trim()}
          >
            <Text style={styles.submitButtonText}>Create Topic</Text>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f0fa',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#8f8fc2',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    padding: 5,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 28,
  },
  formContainer: {
    flex: 1,
    padding: 25,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5a5a78',
    marginBottom: 10,
    marginLeft: 5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 18,
    fontSize: 16,
    color: '#5a5a78',
    borderWidth: 1,
    borderColor: '#e9dfe9',
    shadowColor: '#afafda',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#8f8fc2',
    borderRadius: 25,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7a7aad',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 20,
    opacity: 1,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  errorContainer: {
    backgroundColor: '#ff6b6b',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 15,
  },
  successContainer: {
    backgroundColor: '#51cf66',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  successText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 15,
  },
});