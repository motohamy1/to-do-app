import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';

interface WellbeingCardProps {
  daily: any;
  weekly?: any;
  monthly?: any;
  compact?: boolean;
  style?: any;
}

export const WellbeingCard = ({ daily, weekly, monthly, compact = false, style }: WellbeingCardProps) => {
  const { colors } = useTheme();
  
  if (!daily || Array.isArray(daily)) return null;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.danger;
  };
  
  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };
  
  if (compact) {
    return (
      <View style={[styles.compactCard, style]}>
        <View style={styles.compactRow}>
          <WellbeingMetric 
            label="Productivity" 
            value={`${daily.productivityScore}%`} 
            icon="speedometer"
            color={getScoreColor(daily.productivityScore)}
          />
          <WellbeingMetric 
            label="Balance" 
            value={`${daily.balanceScore}%`} 
            icon="balance"
            color={getScoreColor(daily.balanceScore)}
          />
          <WellbeingMetric 
            label="Stress" 
            value={`${daily.stressLevel}%`} 
            icon="pulse"
            color={getScoreColor(100 - daily.stressLevel)}
            invert
          />
          <WellbeingMetric 
            label="Streak" 
            value={`${daily.consistencyStreak}d`} 
            icon="flame"
            color={colors.primary}
          />
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>💚 Wellbeing Overview</Text>
      </View>
      
      <View style={styles.metricsGrid}>
        <WellbeingMetricDetail
          label="Productivity"
          value={`${daily.productivityScore}%`}
          subtitle={getScoreLabel(daily.productivityScore)}
          icon="speedometer"
          color={getScoreColor(daily.productivityScore)}
          trend={weekly && daily.productivityScore > weekly.productivityScore ? 'up' : 'stable'}
        />
        <WellbeingMetricDetail
          label="Life Balance"
          value={`${daily.balanceScore}%`}
          subtitle={getScoreLabel(daily.balanceScore)}
          icon="scale-outline"
          color={getScoreColor(daily.balanceScore)}
          trend={weekly && daily.balanceScore > weekly.balanceScore ? 'up' : 'stable'}
        />
        <WellbeingMetricDetail
          label="Stress Level"
          value={`${daily.stressLevel}%`}
          subtitle={getScoreLabel(100 - daily.stressLevel)}
          icon="pulse"
          color={getScoreColor(100 - daily.stressLevel)}
          invert
          trend={weekly && daily.stressLevel < weekly.stressLevel ? 'up' : 'stable'}
        />
        <WellbeingMetricDetail
          label="Satisfaction"
          value={`${daily.satisfactionScore}%`}
          subtitle={getScoreLabel(daily.satisfactionScore)}
          icon="heart"
          color={getScoreColor(daily.satisfactionScore)}
          trend={weekly && daily.satisfactionScore > weekly.satisfactionScore ? 'up' : 'stable'}
        />
      </View>
      
      <View style={styles.secondaryMetrics}>
        <SecondaryMetric
          label="Streak"
          value={`${daily.consistencyStreak} days`}
          icon="flame"
          color={colors.warning}
        />
        <SecondaryMetric
          label="Completed Today"
          value={`${daily.completionVelocity} tasks`}
          icon="checkmark-circle"
          color={colors.success}
        />
        <SecondaryMetric
          label="Overdue"
          value={`${daily.overdueCount} tasks`}
          icon="alert-circle"
          color={daily.overdueCount > 0 ? colors.danger : colors.success}
        />
        <SecondaryMetric
          label="Peak Hours"
          value={daily.peakHours?.length > 0 
            ? daily.peakHours.map((h: number) => `${h}:00`).join(', ')
            : 'N/A'}
          icon="time"
          color={colors.info}
        />
      </View>
    </View>
  );
};

const WellbeingMetric = ({ label, value, icon, color, invert }: any) => (
  <View style={styles.metric}>
    <Ionicons name={icon as any} size={20} color={color} />
    <Text style={[styles.metricValue, invert && styles.metricValueInvert]}>{value}</Text>
    <Text style={styles.compactMetricLabel}>{label}</Text>
  </View>
);

const WellbeingMetricDetail = ({ label, value, subtitle, icon, color, trend, invert }: any) => {
  const { colors } = useTheme();
  return (
  <View style={styles.metricDetail}>
    <View style={[styles.metricIconWrapper, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon as any} size={22} color={color} />
    </View>
    <View style={styles.metricText}>
      <Text style={[styles.metricValueLarge, invert && styles.metricValueInvert]}>{value}</Text>
      <Text style={styles.metricSubtitle}>{subtitle}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {trend === 'up' && (
        <View style={styles.trendUp}>
          <Ionicons name="trending-up" size={10} color={colors.success} />
          <Text style={styles.trendText}>Improving</Text>
        </View>
      )}
    </View>
  </View>
  );
};

const SecondaryMetric = ({ label, value, icon, color }: any) => (
  <View style={styles.secondaryMetric}>
    <Ionicons name={icon as any} size={16} color={color} />
    <View style={styles.secondaryMetricText}>
      <Text style={styles.secondaryMetricValue}>{value}</Text>
      <Text style={styles.secondaryMetricLabel}>{label}</Text>
    </View>
  </View>
);

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
  compactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricDetail: {
    width: '48%',
    marginBottom: 12,
  },
  metricIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricText: {
    flex: 1,
  },
  metricValueLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  metricValueInvert: {
    color: '#1a1a2e',
  },
  metricSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  trendUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#22c55e',
  },
  secondaryMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  secondaryMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: '45%',
  },
  secondaryMetricText: {
    flex: 1,
  },
  secondaryMetricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  secondaryMetricLabel: {
    fontSize: 10,
    color: '#888',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  compactMetricLabel: {
    fontSize: 10,
    color: '#888',
  },
});

export default WellbeingCard;