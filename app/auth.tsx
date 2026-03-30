import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Alert } from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';

const AuthScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const { userId: currentUserId, isAnonymous, linkAccount } = useAuth();
  const signUpMutation = useMutation(api.auth.signUp);
  const signInMutation = useMutation(api.auth.signIn);
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password || (!isLogin && !name.trim())) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      let userId: any;
      if (isLogin) {
        userId = await signInMutation({ email: email.trim(), password });
      } else {
        userId = await signUpMutation({
          email: email.trim(),
          password,
          name: name.trim(),
          anonymousId: (isAnonymous && currentUserId) ? currentUserId : undefined,
        });
      }

      if (!userId) {
        throw new Error("Authentication failed — no user ID returned.");
      }

      await linkAccount(userId);
      router.back();
    } catch (error: any) {
      // Make Convex error messages more readable (they often include stack traces)
      const msg = error?.message?.split('\n')[0] || "Authentication failed. Please try again.";
      Alert.alert("Auth Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBarStyle} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
             <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
                <Ionicons name="checkbox" size={40} color="#FFF" />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {isLogin ? 'Sign in to sync your tasks' : 'Start organizing your life today'}
              </Text>
            </View>

            <View style={styles.form}>
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="John Doe"
                      placeholderTextColor={colors.textMuted}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="example@gmail.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <Text style={[styles.switchText, { color: colors.textMuted }]}>
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                </Text>
                <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                  <Text style={[styles.switchAction, { color: colors.primary }]}>
                    {isLogin ? ' Sign Up' : ' Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    paddingVertical: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 15,
    fontWeight: '500',
  },
  switchAction: {
    fontSize: 15,
    fontWeight: '800',
  },
});

export default AuthScreen;
