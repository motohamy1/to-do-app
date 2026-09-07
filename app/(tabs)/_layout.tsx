import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';
import ScreenBackground from '@/components/ScreenBackground';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Colors & Dimensions matching reference
const ACTIVE_ACCENT = '#e5f19d';
const ACTIVE_INK = '#101116';
const DOCK_HEIGHT = 60;
const DOCK_CORNER = 26;
const FAB_SIZE = 48;
const ICON_SIZE = 24;
const HORIZONTAL_PADDING = 6;

type IconProps = { color: string; knockout: string; filled?: boolean };

// ─── 1. Home Icon ───
const HomeIcon = ({ color, knockout, filled }: IconProps) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    {filled ? (
      <>
        <Path
          d="M12 3.2L3.5 10.2A1.8 1.8 0 0 0 3 11.4V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7.6a1.8 1.8 0 0 0-.5-1.2L12 3.2Z"
          fill={color}
        />
        <Rect x={10.8} y={13.8} width={2.4} height={5.2} rx={1.2} fill={knockout} />
      </>
    ) : (
      <Path
        d="M12 3.2L3.5 10.2A1.8 1.8 0 0 0 3 11.4V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7.6a1.8 1.8 0 0 0-.5-1.2L12 3.2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    )}
  </Svg>
);

// ─── 2. Planner / Tasks Icon ───
const PlannerIcon = ({ color, knockout, filled }: IconProps) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    {filled ? (
      <>
        <Rect x={3.5} y={3.5} width={17} height={17} rx={5.5} fill={color} />
        <Path
          d="M7.8 9.5l1.6 1.6 2.6-2.6M14.2 9.5h2.6M7.8 14.5l1.6 1.6 2.6-2.6M14.2 14.5h2.6"
          stroke={knockout}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <>
        <Rect
          x={3.5}
          y={3.5}
          width={17}
          height={17}
          rx={5.5}
          stroke={color}
          strokeWidth={1.8}
        />
        <Path
          d="M7.8 9.5l1.6 1.6 2.6-2.6M14.2 9.5h2.6M7.8 14.5l1.6 1.6 2.6-2.6M14.2 14.5h2.6"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )}
  </Svg>
);

// ─── 3. Add Icon ───
const AddIcon = ({ color, filled }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5v14M5 12h14"
      stroke={color}
      strokeWidth={filled ? 2.4 : 1.8}
      strokeLinecap="round"
    />
  </Svg>
);

// ─── 4. Projects / Chat Icon ───
const ProjectsIcon = ({ color, knockout, filled }: IconProps) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    {filled ? (
      <>
        <Path
          d="M12 4.2C7.6 4.2 4 7.6 4 11.6c0 1.8.7 3.5 1.9 4.8L4.8 20l4-1.3c1 .5 2.1.8 3.2.8 4.4 0 8-3.4 8-7.5S16.4 4.2 12 4.2Z"
          fill={color}
        />
        <Circle cx={8.8} cy={11.6} r={1.2} fill={knockout} />
        <Circle cx={12} cy={11.6} r={1.2} fill={knockout} />
        <Circle cx={15.2} cy={11.6} r={1.2} fill={knockout} />
      </>
    ) : (
      <>
        <Path
          d="M12 4.2C7.6 4.2 4 7.6 4 11.6c0 1.8.7 3.5 1.9 4.8L4.8 20l4-1.3c1 .5 2.1.8 3.2.8 4.4 0 8-3.4 8-7.5S16.4 4.2 12 4.2Z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Circle cx={8.8} cy={11.6} r={1.1} fill={color} />
        <Circle cx={12} cy={11.6} r={1.1} fill={color} />
        <Circle cx={15.2} cy={11.6} r={1.1} fill={color} />
      </>
    )}
  </Svg>
);

// ─── 5. Profile / Settings Icon ───
const ProfileIcon = ({ color, filled }: IconProps) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Circle
      cx={12}
      cy={8.2}
      r={3.6}
      fill={filled ? color : 'none'}
      stroke={filled ? 'none' : color}
      strokeWidth={1.8}
    />
    <Path
      d="M6 19.2c0-2.8 2.7-4.7 6-4.7s6 1.9 6 4.7"
      fill={filled ? color : 'none'}
      stroke={filled ? 'none' : color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

// ─── 6. Insights / Analytics Icon ───
const InsightsIcon = ({ color, knockout, filled }: IconProps) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    {filled ? (
      <>
        <Path
          d="M12 4.2C7.6 4.2 4 7.6 4 11.6c0 1.8.7 3.5 1.9 4.8L4.8 20l4-1.3c1 .5 2.1.8 3.2.8 4.4 0 8-3.4 8-7.5S16.4 4.2 12 4.2Z"
          fill={color}
        />
        <Path
          d="M12 9v6m0 0l3-3M12 15l-3-3"
          stroke={knockout}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <>
        <Path
          d="M12 4.2C7.6 4.2 4 7.6 4 11.6c0 1.8.7 3.5 1.9 4.8L4.8 20l4-1.3c1 .5 2.1.8 3.2.8 4.4 0 8-3.4 8-7.5S16.4 4.2 12 4.2Z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Path
          d="M12 9v6m0 0l3-3M12 15l-3-3"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )}
  </Svg>
);

// ─── Exact Mathematically Smooth Cradle Scoop Path ───
function getDockPath(width: number, height: number, cx: number): string {
  'worklet';
  if (width <= 0) return '';
  const topCorner = 20;

  // If uninitialized, draw full rounded rectangle on top, flat on bottom
  if (cx <= 0) {
    return `M 0 ${height} L 0 ${topCorner} Q 0 0 ${topCorner} 0 L ${width - topCorner} 0 Q ${width} 0 ${width} ${topCorner} L ${width} ${height} L 0 ${height} Z`;
  }

  const notchHalfWidth = 38;
  const leftStart = cx - notchHalfWidth;
  const rightEnd = cx + notchHalfWidth;

  const depth = 26;
  const shoulderCpX = 27;
  const shoulderCpY = 8;
  const inflectionX = 16;
  const inflectionY = 13.5;
  const cradleCpX = 10.5;
  const cradleCpY = 21;
  const bottomCpX = 5.2;

  const pathParts: string[] = [`M 0 ${height}`];

  // 1. Left Vertical Edge & Top-Left Corner
  if (leftStart <= 0) {
    pathParts.push(`L 0 ${inflectionY}`);
  } else if (leftStart < topCorner) {
    pathParts.push(`L 0 ${topCorner}`);
    pathParts.push(`Q 0 0 ${leftStart} 0`);
  } else {
    pathParts.push(`L 0 ${topCorner}`);
    pathParts.push(`Q 0 0 ${topCorner} 0`);
    pathParts.push(`L ${leftStart} 0`);
  }

  // 2. Smooth Cradle Scoop
  pathParts.push(
    `C ${cx - shoulderCpX} 0, ${cx - (inflectionX + 4)} ${shoulderCpY}, ${cx - inflectionX} ${inflectionY}`
  );
  pathParts.push(
    `C ${cx - cradleCpX} ${cradleCpY}, ${cx - bottomCpX} ${depth}, ${cx} ${depth}`
  );
  pathParts.push(
    `C ${cx + bottomCpX} ${depth}, ${cx + cradleCpX} ${cradleCpY}, ${cx + inflectionX} ${inflectionY}`
  );
  pathParts.push(
    `C ${cx + (inflectionX + 4)} ${shoulderCpY}, ${cx + shoulderCpX} 0, ${rightEnd} 0`
  );

  // 3. Right Flat Edge & Top-Right Corner
  if (rightEnd >= width) {
    pathParts.push(`L ${width} ${inflectionY}`);
  } else if (rightEnd > width - topCorner) {
    pathParts.push(`Q ${width} 0 ${width} ${topCorner}`);
  } else {
    pathParts.push(`L ${width - topCorner} 0`);
    pathParts.push(`Q ${width} 0 ${width} ${topCorner}`);
  }

  // 4. Right Vertical Edge & Bottom Line
  pathParts.push(`L ${width} ${height}`);
  pathParts.push(`L 0 ${height}`);
  pathParts.push(`Z`);

  return pathParts.join(' ');
}

// ─── Floating Dock Background with Animated Sliding Cut Notch ───
const DockShape = ({
  width,
  height,
  fill,
  stroke,
  notchX,
}: {
  width: number;
  height: number;
  fill: string;
  stroke: string;
  notchX: SharedValue<number>;
}) => {
  const animatedProps = useAnimatedProps(() => {
    return {
      d: getDockPath(width, height, notchX.value),
    };
  });

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={styles.dockSvg}>
      <AnimatedPath
        animatedProps={animatedProps}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
    </Svg>
  );
};

const DockBackground = ({
  dockHeight,
  fill,
  stroke,
  notchX,
  setWidth,
}: {
  dockHeight: number;
  fill: string;
  stroke: string;
  notchX: SharedValue<number>;
  setWidth: (w: number) => void;
}) => {
  const [layoutWidth, setLayoutWidth] = useState(0);

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const w = event.nativeEvent.layout.width;
        setLayoutWidth(w);
        setWidth(w);
      }}
    >
      {layoutWidth > 0 && (
        <View style={[StyleSheet.absoluteFill, styles.dockAnchor]}>
          <DockShape
            width={layoutWidth}
            height={dockHeight}
            fill={fill}
            stroke={stroke}
            notchX={notchX}
          />
        </View>
      )}
    </View>
  );
};

// ─── Tab Button with Animated Elevated Active Bubble Transition ───
interface DockTabButtonProps {
  isActive: boolean;
  onPress: (e: any) => void;
  accessibilityLabel?: string;
  children: (isElevated: boolean) => React.ReactNode;
}

const DockTabButton = ({
  isActive,
  onPress,
  accessibilityLabel,
  children,
}: DockTabButtonProps) => {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isActive ? 1 : 0, {
      damping: 16,
      stiffness: 240,
      mass: 0.8,
    });
  }, [isActive]);

  const activeAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [0.4, 1], Extrapolation.CLAMP);
    const opacity = interpolate(progress.value, [0, 0.25, 1], [0, 0.5, 1], Extrapolation.CLAMP);
    const translateY = interpolate(progress.value, [0, 1], [14, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  const inactiveAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.35, 1], [1, 0.3, 0], Extrapolation.CLAMP);
    const scale = interpolate(progress.value, [0, 1], [1, 0.75], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={(event) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(event);
      }}
      style={styles.slot}
    >
      {/* Active Elevated State (Floating cream bubble nestled in the scoop) */}
      <Animated.View
        style={[styles.activeBubble, activeAnimatedStyle]}
        pointerEvents={isActive ? 'auto' : 'none'}
      >
        {children(true)}
      </Animated.View>

      {/* Flat Resting State (When Inactive) */}
      <Animated.View
        style={[styles.inactiveIconWrapper, inactiveAnimatedStyle]}
        pointerEvents={!isActive ? 'auto' : 'none'}
      >
        {children(false)}
      </Animated.View>
    </Pressable>
  );
};

const TabLayout = () => {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAuth();
  const { t } = useTranslation(language);
  const pathname = usePathname();
  const router = useRouter();

  const [containerWidth, setContainerWidth] = useState(0);
  const notchX = useSharedValue(-100);

  const activeIndex = React.useMemo(() => {
    if (!pathname || pathname === '/' || pathname === '/index' || pathname === '/(tabs)' || pathname === '/(tabs)/index') return 0;
    if (pathname.includes('planner')) return 1;
    if (pathname.includes('notes') || pathname.includes('add')) return 2;
    if (pathname.includes('spaces') || pathname.includes('projects')) return 3;
    if (pathname.includes('settings')) return 4;
    return 0;
  }, [pathname]);

  const getTabCenterX = (index: number, width: number) => {
    'worklet';
    const innerWidth = width - HORIZONTAL_PADDING * 2;
    const tabWidth = innerWidth / 5;
    return HORIZONTAL_PADDING + tabWidth * (index + 0.5);
  };

  useEffect(() => {
    if (containerWidth > 0) {
      const targetX = getTabCenterX(activeIndex, containerWidth);

      if (notchX.value < 0) {
        notchX.value = targetX;
      } else {
        notchX.value = withSpring(targetX, {
          damping: 18,
          stiffness: 220,
          mass: 0.8,
        });
      }
    }
  }, [activeIndex, containerWidth]);

  const paddingBottom = Math.max(insets.bottom, 0);
  const dockHeight = DOCK_HEIGHT + paddingBottom;
  const dockFill = isDarkMode ? '#16171B' : '#FFFFFF';
  const dockStroke = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const inactiveColor = isDarkMode ? '#8E92A0' : '#64748B';

  return (
    <ScreenBackground style={StyleSheet.absoluteFill}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarBackground: () => (
            <DockBackground
              dockHeight={dockHeight}
              fill={dockFill}
              stroke={dockStroke}
              notchX={notchX}
              setWidth={setContainerWidth}
            />
          ),
          tabBarStyle: {
            backgroundColor: 'transparent',
            position: 'absolute',
            borderTopWidth: 0,
            elevation: 0,
            height: dockHeight,
            paddingBottom: insets.bottom > 0 ? insets.bottom / 2 : 0,
            paddingTop: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: HORIZONTAL_PADDING,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.tabTodo,
            tabBarButton: () => (
              <DockTabButton
                isActive={activeIndex === 0}
                onPress={() => router.replace('/(tabs)')}
                accessibilityLabel={t.tabTodo}
              >
                {(isElevated) => (
                  <HomeIcon
                    color={isElevated ? ACTIVE_INK : inactiveColor}
                    knockout={ACTIVE_ACCENT}
                    filled={isElevated}
                  />
                )}
              </DockTabButton>
            ),
          }}
        />
        <Tabs.Screen
          name="planner"
          options={{
            title: t.tabPlanner,
            tabBarButton: () => (
              <DockTabButton
                isActive={activeIndex === 1}
                onPress={() => router.replace('/(tabs)/planner')}
                accessibilityLabel={t.tabPlanner}
              >
                {(isElevated) => (
                  <PlannerIcon
                    color={isElevated ? ACTIVE_INK : inactiveColor}
                    knockout={ACTIVE_ACCENT}
                    filled={isElevated}
                  />
                )}
              </DockTabButton>
            ),
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            title: t.tabAdd,
            tabBarButton: () => (
              <DockTabButton
                isActive={activeIndex === 2}
                onPress={() => router.replace('/(tabs)/notes')}
                accessibilityLabel={t.tabAdd}
              >
                {(isElevated) => (
                  <AddIcon
                    color={isElevated ? ACTIVE_INK : inactiveColor}
                    knockout={ACTIVE_ACCENT}
                    filled={isElevated}
                  />
                )}
              </DockTabButton>
            ),
          }}
        />
        <Tabs.Screen
          name="spaces"
          options={{
            title: t.tabProjects,
            tabBarButton: () => (
              <DockTabButton
                isActive={activeIndex === 3}
                onPress={() => router.replace('/(tabs)/spaces')}
                accessibilityLabel={t.tabProjects}
              >
                {(isElevated) => (
                  <ProjectsIcon
                    color={isElevated ? ACTIVE_INK : inactiveColor}
                    knockout={ACTIVE_ACCENT}
                    filled={isElevated}
                  />
                )}
              </DockTabButton>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t.tabSettings,
            tabBarButton: () => (
              <DockTabButton
                isActive={activeIndex === 4}
                onPress={() => router.replace('/(tabs)/settings')}
                accessibilityLabel={t.tabSettings}
              >
                {(isElevated) => (
                  <ProfileIcon
                    color={isElevated ? ACTIVE_INK : inactiveColor}
                    knockout={ACTIVE_ACCENT}
                    filled={isElevated}
                  />
                )}
              </DockTabButton>
            ),
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  dockSvg: {
    alignSelf: 'stretch',
  },
  dockAnchor: {
    justifyContent: 'flex-end',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  slot: {
    flex: 1,
    height: DOCK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  inactiveIconWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBubble: {
    position: 'absolute',
    top: -18,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: ACTIVE_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default TabLayout;


