import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';

interface GoalAlignmentCardProps {
  goals: any[];
  style?: any;
}

export const GoalAlignmentCard = ({ goals, style }: GoalAlignmentCardProps) => {
  const { colors } = useTheme();
  
  if (!goals?.length) return null;
  
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return colors.success;
    if (progress >= 50) return colors.warning;
    if (progress >= 20) return colors.info;
    return colors.textMuted;
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="flag" size={20} color={colors.primary} />
          <Text style={styles.title}>🎯 Goal Alignment</Text>
        </View>
      </View>
      
      <View style={styles.listContent}>
        {goals.map((item, index) => {
          const progressColor = getProgressColor(item.progressPercent);
          return (
            <React.Fragment key={item.goalId}>
              {index > 0 && <View style={styles.separator} />}
              <View style={styles.goalRow}>
              <View style={[styles.goalContent, { flex: 1 }]}>
                <Text style={styles.goalText}>{item.goalText}</Text>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${item.progressPercent}%`, backgroundColor: progressColor }
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: progressColor }]}>
                    {Math.round(item.progressPercent)}% aligned
                  </Text>
                </View>
              </View>
              {item.alignedTopicIds?.length > 0 && (
                <View style={styles.alignedTopics}>
                  <Text style={styles.alignedLabel}>
                    {item.alignedTopicIds.length} topic{item.alignedTopicIds.length > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              </View>
            </React.Fragment>
          );
        })}
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
    marginBottom: 12,
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
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  goalContent: {
    flex: 1,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  alignedTopics: {
    alignItems: 'flex-end',
  },
  alignedLabel: {
    fontSize: 11,
    color: '#888',
  },
  listContent: {
    paddingBottom: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 12,
  },
});

export default GoalAlignmentCard;