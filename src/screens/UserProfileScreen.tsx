import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, StyleSheet, Platform, StatusBar, SafeAreaView } from "react-native";
import { useRoute } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

const UserProfileScreen = () => {
  const route = useRoute();
  const { userId } = route.params;

  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else {
          console.error("No such user!");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor="#6a5acd" barStyle="light-content" />
        <ActivityIndicator size="large" color="#6a5acd" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar backgroundColor="#f8f9fa" barStyle="dark-content" />
        <Ionicons name="alert-circle" size={70} color="#e53935" />
        <Text style={styles.errorText}>User not found</Text>
        <Text style={styles.errorSubtext}>This profile may have been deleted or is unavailable</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#6a5acd" barStyle="light-content" />
      
      {/* Background Header */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {userProfile.name?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.contentContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Basic Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.userName}>{userProfile.name}</Text>
          <Text style={styles.userEmail}>{userProfile.email}</Text>
          
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Ionicons name="calendar-outline" size={18} color="#6a5acd" />
              <Text style={styles.badgeText}>{userProfile.age} years</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="people-outline" size={18} color="#6a5acd" />
              <Text style={styles.badgeText}>{userProfile.gender}</Text>
            </View>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={24} color="#6a5acd" />
            <Text style={styles.sectionTitle}>About Me</Text>
          </View>
          <Text style={[styles.bioText, !userProfile.bio && styles.emptyBio]}>
            {userProfile.bio || "No bio information added yet."}
          </Text>
        </View>

        {/* Additional Info Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={24} color="#6a5acd" />
            <Text style={styles.sectionTitle}>Profile Details</Text>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Ionicons name="person-outline" size={20} color="#6a5acd" />
              <Text style={styles.detailLabel}>Full Name</Text>
            </View>
            <Text style={styles.detailValue}>{userProfile.name}</Text>
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Ionicons name="mail-outline" size={20} color="#6a5acd" />
              <Text style={styles.detailLabel}>Email</Text>
            </View>
            <Text style={styles.detailValue}>{userProfile.email}</Text>
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Ionicons name="calendar-outline" size={20} color="#6a5acd" />
              <Text style={styles.detailLabel}>Age</Text>
            </View>
            <Text style={styles.detailValue}>{userProfile.age} years</Text>
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Ionicons name="people-outline" size={20} color="#6a5acd" />
              <Text style={styles.detailLabel}>Gender</Text>
            </View>
            <Text style={styles.detailValue}>{userProfile.gender}</Text>
          </View>
          
          {userProfile.location && (
            <>
              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <Ionicons name="location-outline" size={20} color="#6a5acd" />
                  <Text style={styles.detailLabel}>Location</Text>
                </View>
                <Text style={styles.detailValue}>{userProfile.location}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerBackground: {
    height: 200,
    backgroundColor: "#6a5acd",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    position: "absolute",
    bottom: 60,
  },
  avatarText: {
    fontSize: 50,
    fontWeight: "bold",
    color: "#6a5acd",
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 70,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#6a5acd",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 20,
  },
  userName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
  },
  userEmail: {
    fontSize: 16,
    color: "#777",
    marginTop: 5,
  },
  badgeContainer: {
    flexDirection: "row",
    marginTop: 18,
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0eeff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 8,
    shadowColor: "#6a5acd",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeText: {
    color: "#6a5acd",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#6a5acd",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
  },
  bioText: {
    fontSize: 16,
    color: "#444",
    lineHeight: 26,
  },
  emptyBio: {
    color: "#aaa",
    fontStyle: "italic",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  detailLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 16,
    color: "#555",
    marginLeft: 12,
  },
  detailValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 17,
    color: "#6a5acd",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 24,
  },
  errorText: {
    fontSize: 24,
    color: "#e53935",
    fontWeight: "bold",
    marginTop: 18,
  },
  errorSubtext: {
    fontSize: 17,
    color: "#888",
    textAlign: "center",
    marginTop: 10,
    maxWidth: 300,
  },
});

export default UserProfileScreen;