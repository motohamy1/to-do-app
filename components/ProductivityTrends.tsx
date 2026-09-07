import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';

interface ProductivityTrendsProps {
  weekly: any;
  monthly: any;
  style?: any;
}

export const ProductivityTrends = ({ weekly, monthly, style }: ProductivityTrendsProps) => {
  const { colors } = useTheme();
  
  if (!weekly && !monthly) return null;
  
  const formatTrend = (current: number, previous: number) => {
    if (!previous) return { text: 'New', color: colors.primary, icon: 'add' };
    const diff = current - previous;
    if (diff > 5) return { text: `+${diff}%`, color: colors.success, icon: 'trending-up' };
    if (diff < -5) return { text: `${diff}%`, color: colors.danger, icon: 'trending-down' };
    return { text: 'Stable', color: colors.textMuted, icon: 'remove' };
  };

  const weeklyTrend = weekly ? formatTrend(weekly.productivityScore, monthly?.productivityScore || 0) : null;
  const monthlyTrend = monthly ? formatTrend(monthly.productivityScore, 0) : null;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="stats-chart" size={20} color={colors.primary} />
          <Text style={styles.title}>📈 Productivity Trends</Text>
        </View>
      </View>
      
      <View style={styles.trendsGrid}>
        {weekly && (
        <TrendCard
          period="This Week"
          score={weekly?.productivityScore || 0}
          trend={weeklyTrend}
          velocity={weekly?.completionVelocity || 0}
          streak={weekly?.consistencyStreak || 0}
          peakHours={weekly?.peakHours || []}
          color={colors.info}
        />
        )}
        {monthly && (
        <TrendCard
          period="This Month"
          score={monthly?.productivityScore || 0}
          trend={monthlyTrend}
          velocity={monthly?.completionVelocity || 0}
          streak={monthly?.consistencyStreak || 0}
          peakHours={monthly?.peakHours || []}
          color={colors.primary}
        />
        )}
      </View>
      
      <View style={styles.comparison}>
        <Text style={styles.comparisonTitle}>Weekly vs Monthly</Text>
        <View style={styles.comparisonBars}>
          <ComparisonBar
            label="Productivity"
            weekly={weekly?.productivityScore || 0}
            monthly={monthly?.productivityScore || 0}
            color={colors.info}
          />
          <ComparisonBar
            label="Velocity"
            weekly={weekly?.completionVelocity || 0}
            monthly={monthly?.completionVelocity || 0}
            color={colors.success}
            maxValue={Math.max(weekly?.completionVelocity || 0, monthly?.completionVelocity || 0, 10)}
          />
          <ComparisonBar
            label="Balance"
            weekly={weekly?.balanceScore || 0}
            monthly={monthly?.balanceScore || 0}
            color={colors.warning}
          />
          <ComparisonBar
            label="Stress"
            weekly={weekly?.stressLevel || 0}
            monthly={monthly?.stressLevel || 0}
            color={colors.danger}
            invert
          />
        </View>
      </View>
    </View>
  );
};

const TrendCard = ({ period, score, trend, velocity, streak, peakHours, color }: any) => {
  const { colors } = useTheme();
  const safeTrend = trend ?? { text: 'N/A', color, icon: 'remove' };
  return (
  <View style={[styles.trendCard, { borderColor: color }]}>
    <View style={styles.trendHeader}>
      <Text style={styles.periodLabel}>{period}</Text>
      <View style={[styles.trendBadge, { backgroundColor: `${safeTrend.color}20` }]}>
        <Ionicons name={safeTrend.icon as any} size={12} color={safeTrend.color} />
        <Text style={[styles.trendText, { color: safeTrend.color }]}>{safeTrend.text}</Text>
      </View>
    </View>
    <Text style={[styles.scoreValue, { color }]}>{score}%</Text>
    <Text style={styles.scoreLabel}>Productivity Score</Text>
    <View style={styles.trendMetrics}>
      <TrendMetric
        icon="speedometer"
        value={`${velocity} tasks`}
        label="Completed"
        color={colors.success}
      />
      <TrendMetric
        icon="flame"
        value={`${streak}d`}
        label="Streak"
        color={colors.warning}
      />
      <TrendMetric
        icon="time"
        value={peakHours.length > 0 ? peakHours.map((h: number) => `${h}h`).join(', ') : 'N/A'}
        label="Peak Hours"
        color={color}
      />
    </View>
  </View>
  );
};

const TrendMetric = ({ icon, value, label, color }: any) => (
  <View style={styles.trendMetric}>
    <Ionicons name={icon as any} size={14} color={color} />
    <View style={styles.trendMetricText}>
      <Text style={styles.trendMetricValue}>{value}</Text>
      <Text style={styles.trendMetricLabel}>{label}</Text>
    </View>
  </View>
);

const ComparisonBar = ({ label, weekly, monthly, color, maxValue = 100, invert }: any) => {
  const weeklyPct = maxValue > 0 ? Math.min(100, (weekly / maxValue) * 100) : 0;
  const monthlyPct = maxValue > 0 ? Math.min(100, (monthly / maxValue) * 100) : 0;
  
  return (
    <View style={styles.comparisonBar}>
      <Text style={styles.comparisonLabel}>{label}</Text>
      <View style={styles.barContainer}>
        <View style={styles.barWeekly}>
          <View
            style={[
              styles.barFill,
              { width: `${weeklyPct}%`, backgroundColor: color, opacity: 0.6 }
            ]}
          />
          <Text style={styles.barValue}>{weekly}</Text>
        </View>
        <View style={styles.barMonthly}>
          <View
            style={[
              styles.barFill,
              { width: `${monthlyPct}%`, backgroundColor: color }
            ]}
          />
          <Text style={styles.barValue}>{monthly}</Text>
        </View>
      </View>
      <View style={styles.barLabels}>
        <Text style={styles.barLabel}>Week</Text>
        <Text style={styles.barLabel}>Month</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  trendsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  trendCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#fafafa',
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  periodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 2,
  },
  scoreLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 12,
  },
  trendMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  trendMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendMetricText: {
    flex: 1,
  },
  trendMetricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  trendMetricLabel: {
    fontSize: 9,
    color: '#888',
  },
  comparison: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  comparisonTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  comparisonBars: {
    gap: 10,
  },
  comparisonBar: {
    gap: 6,
  },
  comparisonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
  },
  barWeekly: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  barMonthly: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  barValue: {
    position: 'absolute',
    right: 4,
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  barLabel: {
    fontSize: 9,
    color: '#888',
    width: '50%',
    textAlign: 'center',
  },
});

export default ProductivityTrends;