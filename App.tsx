import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  useFonts,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import { IntroScreen } from './src/screens/auth/IntroScreen';
import { AuthEntryScreen } from './src/screens/auth/AuthEntryScreen';
import { AuthCardScreen } from './src/screens/auth/AuthCardScreen';
import { AuthPermissionsScreen } from './src/screens/auth/AuthPermissionsScreen';
import { OnboardingAppsScreen } from './src/screens/OnboardingAppsScreen';
import { OnboardingScheduleScreen } from './src/screens/OnboardingScheduleScreen';
import { OnboardingGymScreen } from './src/screens/OnboardingGymScreen';
import { UnlockScreen } from './src/screens/UnlockScreen';
import { BuddiesScreen } from './src/screens/BuddiesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ProofScreen } from './src/screens/ProofScreen';
import { SharePairCardScreen } from './src/screens/SharePairCardScreen';
import { ScanCodeScreen } from './src/screens/ScanCodeScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { RootStackParamList, TabParamList } from './src/navigation/types';
import { IoniconName } from './src/types';
import { useAppStore } from './src/store/useAppStore';
import { useAuthStore } from './src/store/useAuthStore';
import { colors } from './src/theme/colors';
import { parsePairCode, usePairLinkStore } from './src/lib/pairLinks';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from './src/lib/push';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Unlock: { active: 'today', inactive: 'today-outline' },
  Buddies: { active: 'people', inactive: 'people-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Unlock"
        component={UnlockScreen}
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? TAB_ICONS.Unlock.active : TAB_ICONS.Unlock.inactive} color={color} size={25} />
          ),
        }}
      />
      <Tab.Screen
        name="Buddies"
        component={BuddiesScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? TAB_ICONS.Buddies.active : TAB_ICONS.Buddies.inactive} color={color} size={25} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? TAB_ICONS.Profile.active : TAB_ICONS.Profile.inactive} color={color} size={25} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const introSeen = useAppStore((s) => s.introSeen);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.loading);
  const init = useAuthStore((s) => s.init);
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
  });

  useEffect(() => {
    init();
  }, [init]);

  // Pair links (https://www.gymbuddy.live/b/1234, gymbuddy://b/1234): remember
  // the code, then open "Enter their code" once there's an account to pair.
  const pendingCode = usePairLinkStore((s) => s.pendingCode);
  const setPending = usePairLinkStore((s) => s.setPending);
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      const code = parsePairCode(url);
      if (code) setPending(code);
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      const code = parsePairCode(url);
      if (code) setPending(code);
    });
    return () => sub.remove();
  }, [setPending]);

  useEffect(() => {
    if (!pendingCode || !navReady || !isAuthenticated || !onboardingComplete) return;
    navigationRef.navigate('ScanCode', { code: pendingCode });
    setPending(null);
  }, [pendingCode, navReady, isAuthenticated, onboardingComplete, setPending]);

  // Push: link this phone to the account whenever someone is signed in, and
  // again if iOS ever hands out a new token.
  useEffect(() => {
    if (!isAuthenticated) return;
    void registerPushToken();
    const sub = Notifications.addPushTokenListener(() => void registerPushToken());
    return () => sub.remove();
  }, [isAuthenticated]);

  // Tapping a nudge, cheer or buddy request opens the Buddies tab — including
  // when the tap is what launched the app.
  const [openBuddies, setOpenBuddies] = useState(false);
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) setOpenBuddies(true);
    });
    const sub = Notifications.addNotificationResponseReceivedListener(() => setOpenBuddies(true));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!openBuddies || !navReady || !isAuthenticated || !onboardingComplete) return;
    navigationRef.navigate('Main', { screen: 'Buddies' });
    setOpenBuddies(false);
    void Notifications.clearLastNotificationResponseAsync();
  }, [openBuddies, navReady, isAuthenticated, onboardingComplete]);

  // A font that fails to load falls back to the system face — never block on it.
  if (authLoading || (!fontsLoaded && !fontError)) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  // Permissions are per-device (Screen Time can't carry over), so a signed-in
  // user on a fresh install still starts there before the rest of onboarding.
  // The welcome tour runs once, before the very first sign-in. Anyone who has
  // set GymBuddy up on this phone before already knows the deal.
  const signedOutStart = introSeen || onboardingComplete ? 'AuthEntry' : 'Intro';
  const initialRouteName = !isAuthenticated ? signedOutStart : !onboardingComplete ? 'AuthPermissions' : 'Main';

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef} onReady={() => setNavReady(true)}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="AuthEntry" component={AuthEntryScreen} />
        <Stack.Screen name="AuthCard" component={AuthCardScreen} />
        <Stack.Screen name="AuthPermissions" component={AuthPermissionsScreen} />
        <Stack.Screen name="OnboardingApps" component={OnboardingAppsScreen} />
        <Stack.Screen name="OnboardingSchedule" component={OnboardingScheduleScreen} />
        <Stack.Screen name="OnboardingGym" component={OnboardingGymScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Proof" component={ProofScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="SharePairCard" component={SharePairCardScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="ScanCode" component={ScanCodeScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
