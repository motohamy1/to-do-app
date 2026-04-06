import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';

export const InlineTimerPicker = ({
  initialMs,
  initialDirection,
  onSave,
  onCancel,
  maxMs,
  colors,
  t,
  isArabic
}: {
  initialMs?: number;
  initialDirection?: string;
  onSave: (ms: number, direction: string) => void;
  onCancel: () => void;
  maxMs?: number;
  colors: any;
  t: any;
  isArabic: boolean;
}) => {
  const { isDarkMode } = useTheme();
  const init = initialMs || 0;
  const [direction, setDirection] = useState(initialDirection || 'down');
  const [hours, setHours] = useState(Math.floor(init / 3600000));
  const [minutes, setMinutes] = useState(Math.floor((init % 3600000) / 60000));

  const handleSave = () => {
    if (direction === 'up') {
      onSave(0, 'up');
      return;
    }
    const ms = (hours * 3600 + minutes * 60) * 1000;
    if (ms <= 0) {
      Alert.alert(t.invalidTimer, t.setTimerGreater);
      return;
    }
    if (maxMs !== undefined && maxMs > 0 && ms > maxMs) {
      const availH = Math.floor(maxMs / 3600000);
      const availM = Math.floor((maxMs % 3600000) / 60000);
      Alert.alert(t.timerTooLong, `${t.timerExceed} ${availH > 0 ? availH + (isArabic ? 'س ' : 'h ') : ''}${availM}${isArabic ? 'د' : 'm'} (${t.budgetAvailable}).`);
      return;
    }
    onSave(ms, 'down');
  };

  const incrementHour = () => setHours(h => Math.min(h + 1, 99));
  const decrementHour = () => setHours(h => Math.max(h - 1, 0));
  const incrementMin = () => setMinutes(m => m === 59 ? 0 : m + 1);
  const decrementMin = () => setMinutes(m => m === 0 ? 59 : m - 1);

  return (
    <View style={[{ marginTop: 4, padding: 16, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '40', gap: 16, shadowColor: colors.primary, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, isArabic && { direction: 'rtl' }]}>
      {/* Direction Toggle */}
      <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', backgroundColor: colors.bg, borderRadius: 12, padding: 4, elevation: 1 }}>
        <TouchableOpacity 
          onPress={() => setDirection('down')}
          style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: direction === 'down' ? colors.surface : 'transparent', borderRadius: 8, shadowColor: '#000', shadowOpacity: direction === 'down' ? 0.1 : 0, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}
        >
          <Text style={{ fontSize: 13, fontWeight: direction === 'down' ? '800' : '600', color: direction === 'down' ? colors.text : colors.textMuted }}>{t.countDown || "Count Down"}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setDirection('up')}
          style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: direction === 'up' ? colors.surface : 'transparent', borderRadius: 8, shadowColor: '#000', shadowOpacity: direction === 'up' ? 0.1 : 0, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}
        >
          <Text style={{ fontSize: 13, fontWeight: direction === 'up' ? '800' : '600', color: direction === 'up' ? colors.primary : colors.textMuted }}>{t.countUp || "Count Up"}</Text>
        </TouchableOpacity>
      </View>

      {maxMs !== undefined && maxMs > 0 && direction === 'down' && (
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }, isArabic && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
          <Text style={[{ color: colors.warning, fontSize: 11, fontWeight: '700' }, isArabic && { textAlign: 'right' }]}>
            {t.budget}: {Math.floor(maxMs / 3600000) > 0 ? Math.floor(maxMs / 3600000) + (isArabic ? 'س ' : 'h ') : ''}{Math.floor((maxMs % 3600000) / 60000)}{isArabic ? 'د' : 'm'} {t.available}
          </Text>
        </View>
      )}

      {/* Duration Controls */}
      {direction === 'down' ? (
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }, isArabic && { flexDirection: 'row-reverse' }]}>
          {/* Hours Vertical Picker */}
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity onPress={incrementHour} style={{ padding: 8 }}>
              <Ionicons name="chevron-up" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={{ backgroundColor: colors.surfaceText + '08', borderRadius: 16, width: 70, height: 60, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.surfaceText, fontSize: 26, fontWeight: '800' }}>{hours.toString().padStart(2, '0')}</Text>
            </View>
            <TouchableOpacity onPress={decrementHour} style={{ padding: 8 }}>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: -4 }}>{t.hours}</Text>
          </View>

          <Text style={{ color: colors.surfaceText, fontWeight: '800', fontSize: 24, paddingBottom: 16 }}>:</Text>

          {/* Minutes Vertical Picker */}
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity onPress={incrementMin} style={{ padding: 8 }}>
              <Ionicons name="chevron-up" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={{ backgroundColor: colors.surfaceText + '08', borderRadius: 16, width: 70, height: 60, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.surfaceText, fontSize: 26, fontWeight: '800' }}>{minutes.toString().padStart(2, '0')}</Text>
            </View>
            <TouchableOpacity onPress={decrementMin} style={{ padding: 8 }}>
              <Ionicons name="chevron-down" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: -4 }}>{t.minutes}</Text>
          </View>
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Ionicons name="timer-outline" size={48} color={colors.primary} style={{ marginBottom: 12, opacity: 0.8 }} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
            {isArabic ? "سيعمل المؤقت كـ ساعة إيقاف وتصاعدي" : "Timer will act as a stopwatch (Count Up)."}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={[{ flexDirection: 'row', gap: 12 }, isArabic && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity
          onPress={handleSave}
          style={[{ flex: 1, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, isArabic && { flexDirection: 'row-reverse' }]}
        >
          <Text style={{ color: isDarkMode ? '#000' : '#FFF', fontWeight: '800', fontSize: 15 }}>✓ {t.setTimer}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancel}
          style={{ paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.surfaceText + '08', alignItems: 'center' }}
        >
          <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 15 }}>{t.cancel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
