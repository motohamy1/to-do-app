import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import { createSettingsStyles } from '@/assets/styles/settings.styles';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

import { useAuth } from '@/hooks/useAuth';
import { useMutation } from 'convex/react';

import { useRouter } from 'expo-router';

const Settings = () => {
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const { userId, signOut, isAnonymous } = useAuth();
  const styles = createSettingsStyles(colors);
  const router = useRouter();
  
  const userSettings = useQuery(api.auth.getUserSettings, userId ? { userId } : "skip");
  const updateSettings = useMutation(api.auth.updateSettings);

  // Data for "Database Information"
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
      <Text style={[styles.settingLabel, userSettings?.language === 'ar' && { textAlign: 'right' }]}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {type === 'chevron' && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
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

  const isArabic = userSettings?.language === 'ar';

  return (
    <View style={[styles.container, isArabic && { direction: 'rtl' }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={[styles.headerTitle, isArabic && { textAlign: 'right' }]}>
              {isArabic ? 'الإعدادات' : 'Settings'}
            </Text>
          </View>

          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isArabic && { textAlign: 'right' }]}>
              {isArabic ? 'الملف الشخصي' : 'Profile'}
            </Text>
            <View style={styles.card}>
              <View style={[styles.profileHero, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={styles.avatarContainer}>
                  <Ionicons name="person" size={40} color={colors.primary} />
                </View>
                <View style={[styles.profileInfo, isArabic && { alignItems: 'flex-end', marginLeft: 0, marginRight: 15 }]}>
                  <Text style={styles.profileName}>
                    {isAnonymous ? (isArabic ? 'زائر' : 'Guest') : (userSettings?.name || 'Loading...')}
                  </Text>
                  <Text style={styles.profileEmail}>
                    {isAnonymous ? (isArabic ? 'سجل للمزامنة' : 'Sign in to sync progress') : (userSettings?.email || '...')}
                  </Text>
                </View>
                {isAnonymous ? (
                  <TouchableOpacity onPress={() => router.push('/auth')}>
                    <Ionicons name="log-in-outline" size={24} color={colors.primary} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity>
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isArabic && { textAlign: 'right' }]}>
              {isArabic ? 'التفضيلات' : 'Preferences'}
            </Text>
            <View style={styles.card}>
              <SettingItem 
                icon="moon-outline" 
                label={isArabic ? 'الوضع الداكن' : 'Dark Mode'} 
                type="switch" 
                color="#7C5CFF" 
                onPress={toggleDarkMode}
                status={isDarkMode}
              />
              <View style={styles.divider} />
              <SettingItem 
                icon="notifications-outline" 
                label={isArabic ? 'الإشعارات' : 'Notifications'} 
                type="switch"
                status={userSettings?.notificationsEnabled}
                onPress={handleToggleNotifications}
                color="#FF6B6B" 
              />
              <View style={styles.divider} />
              <SettingItem 
                icon="language-outline" 
                label={isArabic ? 'اللغة' : 'Language'} 
                value={isArabic ? 'العربية' : 'English'}
                onPress={handleToggleLanguage}
                color="#4ECDC4" 
              />
            </View>
          </View>

          {/* Statistics Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isArabic && { textAlign: 'right' }]}>
              {isArabic ? 'الإحصائيات' : 'Your Statistics'}
            </Text>
            <View style={[styles.card, styles.dbInfoCard]}>
              <View style={[styles.dbRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.dbLabel}>{isArabic ? 'إجمالي المهام' : 'Total Tasks'}</Text>
                <Text style={styles.dbValue}>{todos.length}</Text>
              </View>
              <View style={[styles.dbRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.dbLabel}>{isArabic ? 'المكتملة' : 'Completed'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: colors.success + '15' }]}>
                  <Text style={[styles.statusText, { color: colors.success }]}>
                    {todos.filter(t => t.status === 'done').length} {isArabic ? 'تم' : 'Done'}
                  </Text>
                </View>
              </View>
              <View style={[styles.dbRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.dbLabel}>{isArabic ? 'مساحات العمل النشطة' : 'Active Workspaces'}</Text>
                <Text style={styles.dbValue}>{projects.length}</Text>
              </View>
              <View style={[styles.dbRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.dbLabel}>{isArabic ? 'معدل الإنجاز' : 'Completion Rate'}</Text>
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
              {isArabic ? 'المشروع' : 'Project'}
            </Text>
            <View style={styles.card}>
              <SettingItem 
                icon="shield-checkmark-outline" 
                label={isArabic ? 'الخصوصية والأمان' : 'Privacy & Security'} 
                color="#00C58E" 
              />
              <View style={styles.divider} />
              <SettingItem 
                icon="help-circle-outline" 
                label={isArabic ? 'مركز المساعدة' : 'Help Center'} 
                color="#FFAB00" 
              />
              <View style={styles.divider} />
              <SettingItem 
                icon="information-circle-outline" 
                label={isArabic ? 'حول التطبيق' : 'About DeepMind Todo'} 
                color={colors.primary} 
              />
            </View>
            
            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={styles.logoutText}>{isArabic ? 'تسجيل الخروج' : 'Log Out'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>VERSION 1.0.4 (BETA)</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Settings;