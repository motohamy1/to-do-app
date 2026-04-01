import { createHomeStyles } from '@/assets/styles/home.styles'
import useTheme from '@/hooks/useTheme'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import React from 'react'
import { Text, View, TouchableOpacity } from 'react-native'
import { useTranslation } from '@/utils/i18n'

const Header = () => {
    const { colors } = useTheme();
    const { userId, language, isAnonymous } = useAuth();
    const { t, isArabic } = useTranslation(language);
    const userSettings = useQuery(api.auth.getUserSettings, userId ? { userId } : "skip");
    const homeStyles = createHomeStyles(colors, isArabic);

    const now = new Date();
    const formattedDate = now.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    const greeting = isArabic ? `مرحباً، ${userSettings?.name || t.guest}` : `Hi, ${userSettings?.name || 'Guest'}`;

    return (
        <View style={[homeStyles.header, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[homeStyles.headerLeft, isArabic && { alignItems: 'flex-end' }]}>
                <Text style={[homeStyles.headerDate, isArabic && { textAlign: 'right' }]}>{formattedDate}</Text>
                <Text style={[homeStyles.headerGreeting, isArabic && { textAlign: 'right' }]}>{greeting}</Text>
            </View>

            <TouchableOpacity
                activeOpacity={0.85}
                style={homeStyles.headerRight}
                onPress={() => {
                  import('@/utils/notifications').then(({ requestPermissionsAsync }) => {
                    requestPermissionsAsync().then(granted => {
                      if (granted) {
                        alert(isArabic ? 'الإشعارات مفعلة ✅' : 'Notifications enabled ✅');
                      } else {
                        alert(isArabic ? 'يرجى مراجعة إعدادات الجهاز لتفعيل الإشعارات' : 'Please check device settings to enable notifications');
                      }
                    });
                  });
                }}
            >
                <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={colors.text}
                />
            </TouchableOpacity>
        </View>
    );
};

export default Header;