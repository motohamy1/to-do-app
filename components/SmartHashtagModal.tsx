import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';

export interface MatchedEntity {
  type: 'space' | 'project' | 'goal';
  id: string;
  name: string;
  color?: string;
  icon?: string;
  tag?: string;
  categoryId?: string;
}

interface SmartHashtagModalProps {
  visible: boolean;
  tag: string;
  matchedEntity: MatchedEntity | null;
  onLinkDirectly: (entity: MatchedEntity, tag: string) => void;
  onKeepSeparate: (tag: string) => void;
  onClose: () => void;
}

export const SmartHashtagModal: React.FC<SmartHashtagModalProps> = ({
  visible,
  tag,
  matchedEntity,
  onLinkDirectly,
  onKeepSeparate,
  onClose,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { language } = useAuth();
  const { isArabic } = useTranslation(language);

  if (!visible || !matchedEntity) return null;

  const entityColor = matchedEntity.color || colors.primary;
  const entityTypeLabel =
    matchedEntity.type === 'space'
      ? (isArabic ? 'مساحة' : 'Space')
      : matchedEntity.type === 'project'
      ? (isArabic ? 'مشروع' : 'Project')
      : (isArabic ? 'هدف' : 'Goal');

  const entityIcon =
    matchedEntity.icon ||
    (matchedEntity.type === 'space'
      ? 'folder-open-outline'
      : matchedEntity.type === 'project'
      ? 'rocket-outline'
      : 'flag-outline');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border + '40' }]}>
          {/* Header Icon */}
          <View style={[styles.iconCircle, { backgroundColor: entityColor + '20' }]}>
            <Ionicons name="link" size={28} color={entityColor} />
          </View>

          {/* Title & Tag */}
          <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center' }]}>
            {isArabic ? 'تم العثور على ارتباط ذكي!' : 'Smart Tag Match Found!'}
          </Text>

          <View style={[styles.tagBadge, { backgroundColor: entityColor + '15', borderColor: entityColor + '30' }]}>
            <Text style={[styles.tagText, { color: entityColor }]}>#{tag}</Text>
          </View>

          {/* Matched Entity Box */}
          <View style={[styles.matchedBox, { backgroundColor: isDarkMode ? '#1E1E28' : '#F8FAFC', borderColor: colors.border + '40' }]}>
            <View style={[styles.entityIconCircle, { backgroundColor: entityColor + '25' }]}>
              <Ionicons name={entityIcon as any} size={20} color={entityColor} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.entityTypeLabel, { color: entityColor }]}>
                {entityTypeLabel}
              </Text>
              <Text style={[styles.entityName, { color: colors.text }]} numberOfLines={1}>
                {matchedEntity.name}
              </Text>
            </View>
          </View>

          <Text style={[styles.description, { color: colors.textMuted, textAlign: 'center' }]}>
            {isArabic
              ? `هذا الهاشتاج مطابق لـ "${matchedEntity.name}" في قسم ${entityTypeLabel}. هل ترغب في ربط المهمة مباشرة به؟`
              : `This hashtag matches your ${entityTypeLabel} "${matchedEntity.name}". Would you like to link this task directly to it?`}
          </Text>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {/* Option (a): Link Directly */}
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: entityColor }]}
              onPress={() => {
                onLinkDirectly(matchedEntity, tag);
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="link-outline" size={18} color="#FFF" />
              <Text style={styles.primaryActionText}>
                {isArabic ? `ربط مباشرة بـ ${matchedEntity.name}` : `Link directly to ${matchedEntity.name}`}
              </Text>
            </TouchableOpacity>

            {/* Option (b): Keep as separate tag */}
            <TouchableOpacity
              style={[styles.secondaryActionBtn, { borderColor: colors.border, backgroundColor: isDarkMode ? '#232332' : '#F1F5F9' }]}
              onPress={() => {
                onKeepSeparate(tag);
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="pricetag-outline" size={16} color={colors.text} />
              <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                {isArabic ? 'إبقاء كعلامة منفصلة غير مرتبطة' : 'Keep as separate, unlinked tag'}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>
                {isArabic ? 'إلغاء' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  tagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '700',
  },
  matchedBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  entityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityTypeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entityName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 2,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SmartHashtagModal;
