import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { useAuth } from '@/hooks/useAuth';
import useTheme from '@/hooks/useTheme';
import { api } from '@/convex/_generated/api';
import { FocusTopicsCard } from '@/components/FocusTopicsCard';
import { WellbeingCard } from '@/components/WellbeingCard';
import { ConcernRadar } from '@/components/ConcernRadar';
import { RoadmapView } from '@/components/RoadmapView';
import { GoalAlignmentCard } from '@/components/GoalAlignmentCard';
import { ProductivityTrends } from '@/components/ProductivityTrends';
import AnimatedWavyHeader from '@/components/AnimatedWavyHeader';

export default function InsightsScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  
  const rawDaily = useOfflineQuery('insights.daily', api.insights.getLatestInsights,
    userId ? { userId, period: "day" } : 'skip');
  const rawWeekly = useOfflineQuery('insights.weekly', api.insights.getLatestInsights,
    userId ? { userId, period: "week" } : 'skip');
  const rawMonthly = useOfflineQuery('insights.monthly', api.insights.getLatestInsights,
    userId ? { userId, period: "month" } : 'skip');

  // useOfflineQuery returns [] as an offline/empty placeholder for these queries —
  // normalize to undefined so guards and child cards treat "no data" correctly.
  const daily = Array.isArray(rawDaily) ? undefined : rawDaily;
  const weekly = Array.isArray(rawWeekly) ? undefined : rawWeekly;
  const monthly = Array.isArray(rawMonthly) ? undefined : rawMonthly;

  const onRefresh = () => {
    setRefreshing(true);
    // Trigger a refresh by re-running the queries
    setTimeout(() => setRefreshing(false), 1500);
  };

  const isDark = isDarkMode;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <AnimatedWavyHeader backgroundColor={colors.bg} waveHeight={10} contentStyle={{ paddingBottom: 2 }}>
        <View style={[styles.header, { paddingVertical: 8 }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="analytics" size={26} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Insights</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>
              Updated {daily ? formatTimeAgo(daily._creationTime) : 'never'}
            </Text>
          </View>
        </View>
      </AnimatedWavyHeader>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressViewOffset={60}
          />
        }
        contentContainerStyle={[styles.scrollContent, { paddingTop: 10 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Wellbeing Overview Card */}
        <WellbeingCard daily={daily} weekly={weekly} monthly={monthly} />

        {/* Focus Topics Card */}
        <FocusTopicsCard insights={daily} />

        {/* Concern Radar - Neglected Areas */}
        <ConcernRadar insights={daily} />

        {/* Goal Alignment */}
        {daily?.goalAlignment?.length > 0 && (
          <GoalAlignmentCard goals={daily.goalAlignment} />
        )}

        {/* AI Roadmap Suggestions */}
        <RoadmapView suggestions={daily?.suggestedFocus} />

        {/* Productivity Trends */}
        <ProductivityTrends weekly={weekly} monthly={monthly} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Insights are generated daily at midnight.{' '}
            <Text style={[styles.footerHighlight, { color: colors.primary }]}>Tap to refresh</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTimeAgo(timestamp?: number): string {
  if (!timestamp || typeof timestamp !== 'number') return 'never';
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  lastUpdated: {
    fontSize: 11,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
  footerHighlight: {
    fontWeight: '600',
  },
});