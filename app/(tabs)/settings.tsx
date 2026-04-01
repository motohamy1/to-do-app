import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Switch, Platform, Modal, TextInput, Alert, Image, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import { createSettingsStyles } from '@/assets/styles/settings.styles';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

import { useAuth } from '@/hooks/useAuth';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/utils/i18n';
import * as ImagePicker from 'expo-image-picker';

const Settings = () => {
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const { userId, signOut, isAnonymous, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const styles = createSettingsStyles(colors, isArabic);
  const router = useRouter();
  
  const userSettings = useQuery(api.auth.getUserSettings, userId ? { userId } : "skip");
  const updateSettings = useMutation(api.auth.updateSettings);
  const generateUploadUrl = useMutation(api.auth.generateUploadUrl);
  const updateProfilePicture = useMutation(api.auth.updateProfilePicture);

  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    if (userSettings) {
      setEditName(userSettings.name || '');
      setEditEmail(userSettings.email || '');
    }
  }, [userSettings]);

  const handleUpdateProfile = async () => {
    if (!userId || isAnonymous) return;
    try {
      await updateSettings({
        userId,
        name: editName,
        email: editEmail
      });
      setIsEditModalVisible(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (e) {
      Alert.alert("Error", "Failed to update profile");
    }
  };

  const handlePickImage = async () => {
    if (!userId || isAnonymous) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      const { storageId } = await result.json();
      
      await updateProfilePicture({ userId: userId!, storageId });
      Alert.alert("Success", "Profile picture updated");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const todos = useQuery(api.todos.get, userId ? { userId } : "skip") || [];
  const projects = useQuery(api.projects.getCategories, userId ? { userId } : "skip") || [];

  const handleToggleNotifications = async () => {
    if (!userId || !userSettings) return;
    await updateSettings({
      userId,
      notificationsEnabled: !userSettings.notificationsEnabled
    });
  };

  const handleToggleLanguage = async () => {
    if (!userId || !userSettings) return;
    const newLang = userSettings.language === 'en' ? 'ar' : 'en';
    await updateSettings({
      userId,
      language: newLang
    });
  };

  const SettingItem = ({ icon, label, value, type = 'chevron', color, onPress, status }: any) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress} 
      activeOpacity={0.7}
      disabled={type === 'switch' && status === undefined}
    >
      <View style={[styles.iconWrapper, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.settingLabel, isArabic && { textAlign: 'right' }]}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {type === 'chevron' && <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={18} color={colors.textMuted} />}
      {type === 'switch' && (
        <Switch 
          value={status ?? isDarkMode} 
          onValueChange={onPress || toggleDarkMode}
          trackColor={{ false: colors.border, true: colors.primary + '50' }}
          thumbColor={(status ?? isDarkMode) ? colors.primary : '#f4f3f4'}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isArabic && { direction: 'rtl' }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={[styles.headerTitle, isArabic && { textAlign: 'right' }]}>
              {t.settings}
            </Text>
          </View>

          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isArabic && { textAlign: 'right' }]}>
              {t.profile}
            </Text>
            <View style={[styles.card, styles.profileHero]}>
                <TouchableOpacity 
                  style={[styles.avatarContainer, isArabic && { marginLeft: 0, marginRight: 0 }]}
                  onPress={handlePickImage}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : userSettings?.profilePictureUrl ? (
                    <Image source={{ uri: userSettings.profilePictureUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} />
                  ) : (
                    <Ionicons name="person" size={40} color={colors.primary} />
                  )}
                  <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.surface, borderRadius: 10, padding: 2, borderWidth: 1, borderColor: colors.border }}>
                    <Ionicons name="camera" size={14} color={colors.primary} />
                  </View>
                </TouchableOpacity>
                <View style={[styles.profileInfo, isArabic && { alignItems: 'flex-end', marginLeft: 0, marginRight: 20 }]}>
                  <Text style={styles.profileName}>
                    {isAnonymous ? t.guest : (userSettings?.name || '...')}
                  </Text>
                  <Text style={styles.profileEmail}>
                    {isAnonymous ? t.signInToSync : (userSettings?.email || '...')}
                  </Text>
                </View>
                {isAnonymous ? (
                  <TouchableOpacity onPress={() => router.push('/auth')}>
                    <Ionicons name={isArabic ? "log-in" : "log-in-outline"} size={24} color={colors.primary} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setIsEditModalVisible(true)}>
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

          {/* Profile Edit Modal */}
          <Modal visible={isEditModalVisible} transparent animationType="slide" onRequestClose={() => setIsEditModalVisible(false)}>
            <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                  <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalBody}>
                  <Text style={styles.inputLabel}>Display Name</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={editName} 
                    onChangeText={setEditName}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textMuted}
                  />
                  
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={editEmail} 
                    onChangeText={setEditEmail}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  
                  <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isArabic && { textAlign: 'right' }]}>
              {t.preferences}
            </Text>
            <View style={styles.card}>
              <SettingItem 
                icon="moon-outline" 
                label={t.darkMode} 
                type="switch" 
                color="#7C5CFF" 
                onPress={toggleDarkMode}
                status={isDarkMode}
              />
              <View style={styles.divider} />
              <SettingItem 
                icon="notifications-outline" 
                label={t.notifications} 
                type="switch"
                status={userSettings?.notificationsEnabled}
                onPress={handleToggleNotifications}
                color="#FF6B6B" 
              />
              <View style={styles.divider} />
              <SettingItem 
                icon="language-outline" 
                label={t.language} 
                value={isArabic ? 'العربية' : 'English'}
                onPress={handleToggleLanguage}
                color="#4ECDC4" 
              />
            </View>
          </View>

          {/* Statistics Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isArabic && { textAlign: 'right' }]}>
              {t.statistics}
            </Text>
            <View style={[styles.card, styles.dbInfoCard]}>
              <View style={[styles.dbRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.dbLabel}>{t.totalTasks}</Text>
                <Text style={styles.dbValue}>{todos.length}</Text>
              </View>
              <View style={[styles.dbRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.dbLabel}>{t.completed}</Text>
                <View style={[styles.statusBadge, { backgroundColor: colors.success + '15' }]}>
                  <Text style={[styles.statusText, { color: colors.success }]}>
                    {todos.filter(t => t.status === 'done').length} {t.done}
                  </Text>
                </View>
              </View>
              <View style={[styles.dbRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.dbLabel}>{t.activeWorkspaces}</Text>
                <Text style={styles.dbValue}>{projects.length}</Text>
              </View>
              <View style={[styles.dbRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.dbLabel}>{t.completionRate}</Text>
                <Text style={[styles.dbValue, { color: colors.primary }]}>
                  {todos.length > 0 
                    ? Math.round((todos.filter(t => t.status === 'done').length / todos.length) * 100) 
                    : 0}%
                </Text>
              </View>
            </View>
          </View>

          {/* Utility / Other */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isArabic && { textAlign: 'right' }]}>
              {t.project}
            </Text>
            <View style={styles.card}>
              <SettingItem 
                icon="shield-checkmark-outline" 
                label={t.privacy} 
                color="#00C58E" 
              />
              <View style={styles.divider} />
              <SettingItem 
                icon="help-circle-outline" 
                label={t.help} 
                color="#FFAB00" 
              />
              <View style={styles.divider} />
              <SettingItem 
                icon="information-circle-outline" 
                label={t.about} 
                color={colors.primary} 
              />
            </View>
            
            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={styles.logoutText}>{t.logout}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>VERSION 1.0.4 (BETA)</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Settings;