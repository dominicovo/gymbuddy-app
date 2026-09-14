import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  AuthEntry: undefined;
  AuthEmail: undefined;
  AuthVerify: { email: string };
  AuthCard: undefined;
  AuthPermissions: undefined;
  OnboardingApps: undefined;
  OnboardingSchedule: undefined;
  OnboardingGym: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  Settings: undefined;
  Proof: undefined;
  SharePairCard: undefined;
  ScanCode: undefined;
  EditProfile: undefined;
};

export type TabParamList = {
  Unlock: undefined;
  Buddies: undefined;
  Profile: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
