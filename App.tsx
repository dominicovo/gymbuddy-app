import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthEntryScreen } from './src/screens/auth/AuthEntryScreen';
import { AuthEmailScreen } from './src/screens/auth/AuthEmailScreen';
import { AuthVerifyScreen } from './src/screens/auth/AuthVerifyScreen';
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

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Unlock: { active: 'lock-closed', inactive: 'lock-closed-outline' },
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
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="Unlock"
        component={UnlockScreen}
        options={{
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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.loading);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const initialRouteName = !isAuthenticated ? 'AuthEntry' : !onboardingComplete ? 'OnboardingApps' : 'Main';

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="AuthEntry" component={AuthEntryScreen} />
        <Stack.Screen name="AuthEmail" component={AuthEmailScreen} />
        <Stack.Screen name="AuthVerify" component={AuthVerifyScreen} />
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
