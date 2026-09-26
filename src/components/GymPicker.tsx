import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../theme/colors';
import { Coordinates } from '../lib/geo';
import { ResolvedLocation, getCurrentLocation } from '../lib/location';
import {
  GymOption,
  currentPositionIfAllowed,
  formatDistance,
  gymsNearby,
  searchGyms,
  toResolvedLocation,
} from '../lib/gymSearch';

const SEARCH_DELAY_MS = 350;

type Nearby = { state: 'loading' } | { state: 'ready'; gyms: GymOption[] } | { state: 'needsLocation' };

interface GymPickerProps {
  value: ResolvedLocation | null;
  onChange: (gym: ResolvedLocation) => void;
  /**
   * The search box got focus. `searchY` is its offset within the picker, so the
   * parent can scroll it to the top and leave room for results above the keyboard.
   */
  onSearchFocus?: (searchY: number) => void;
}

/**
 * Find a gym by name, brand, address or postcode — or pick from the gyms
 * around you. Results come from Apple Maps, gyms first, with distances.
 */
export function GymPicker({ value, onChange, onSearchFocus }: GymPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GymOption[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [near, setNear] = useState<Coordinates | null>(null);
  const [nearby, setNearby] = useState<Nearby>({ state: 'loading' });
  const [locating, setLocating] = useState(false);
  const latestSearch = useRef(0);
  const searchY = useRef(0);

  async function loadNearby(position: Coordinates) {
    setNearby({ state: 'loading' });
    const gyms = await gymsNearby(position).catch(() => []);
    setNearby({ state: 'ready', gyms });
  }

  // Context first: if location is already allowed, show the gyms around them
  // before they type anything — and bias searches towards where they are.
  useEffect(() => {
    let cancelled = false;
    currentPositionIfAllowed().then((position) => {
      if (cancelled) return;
      if (!position) return setNearby({ state: 'needsLocation' });
      setNear(position);
      void loadNearby(position);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++latestSearch.current;
    const timer = setTimeout(async () => {
      try {
        const found = await searchGyms(trimmed, near);
        if (id !== latestSearch.current) return; // a newer query is already on its way
        setSearchFailed(false);
        setResults(found);
      } catch (error) {
        if (id !== latestSearch.current) return;
        console.warn('gym search failed', error);
        setSearchFailed(true);
        setResults([]);
      } finally {
        if (id === latestSearch.current) setSearching(false);
      }
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, near]);

  function choose(option: GymOption) {
    Keyboard.dismiss();
    onChange(toResolvedLocation(option));
    setQuery('');
  }

  function locationDenied() {
    Alert.alert('Location access needed', 'Allow location for GymBuddy to find gyms near you and check you’re there.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
  }

  async function findNearMe() {
    setLocating(true);
    const here = await getCurrentLocation().catch(() => null);
    setLocating(false);
    if (!here) return locationDenied();
    const position = { latitude: here.latitude, longitude: here.longitude };
    setNear(position);
    await loadNearby(position);
  }

  // For gyms Apple Maps doesn't know: pin wherever they're standing.
  async function useExactLocation() {
    Keyboard.dismiss();
    setLocating(true);
    const here = await getCurrentLocation().catch(() => null);
    setLocating(false);
    if (!here) return locationDenied();
    onChange(here);
  }

  const typing = query.trim().length >= 2;

  return (
    <View style={styles.wrap}>
      {value && (
        <View style={styles.selected}>
          <View style={styles.pin}>
            <Ionicons name="location" size={20} color={colors.success} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.selectedEyebrow}>YOUR GYM</Text>
            <Text style={styles.selectedLabel} numberOfLines={2}>
              {value.label}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>
      )}

      <View style={styles.search} onLayout={(e) => (searchY.current = e.nativeEvent.layout.y)}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={value ? 'Search for a different gym' : 'Gym name, address or postcode'}
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          onFocus={() => onSearchFocus?.(searchY.current)}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel="Search for your gym"
        />
        {searching ? <ActivityIndicator color={colors.textMuted} /> : null}
      </View>

      {typing ? (
        <ResultList
          options={results}
          onChoose={choose}
          empty={
            results && results.length === 0 && !searching
              ? searchFailed
                ? 'Search isn’t available right now. Check your connection and try again.'
                : `Nothing found for “${query.trim()}”. Try the gym’s name and area, like “PureGym Leeds”.`
              : null
          }
        />
      ) : nearby.state === 'needsLocation' ? (
        <Pressable
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          onPress={findNearMe}
          disabled={locating}
          accessibilityRole="button"
        >
          {locating ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="navigate" size={18} color={colors.accent} />}
          <Text style={styles.actionText}>Show gyms near me</Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.sectionLabel}>GYMS NEAR YOU</Text>
          {nearby.state === 'loading' ? (
            <ActivityIndicator color={colors.textMuted} style={styles.loader} />
          ) : (
            <ResultList
              options={nearby.gyms}
              onChoose={choose}
              empty={nearby.gyms.length === 0 ? 'No gyms on Apple Maps within 5 km. Search by name instead.' : null}
            />
          )}
        </>
      )}

      <Pressable onPress={useExactLocation} disabled={locating} hitSlop={8} accessibilityRole="button" style={styles.exact}>
        <Text style={styles.exactText}>
          Not listed? <Text style={styles.exactLink}>Use my exact location</Text>
        </Text>
      </Pressable>
    </View>
  );
}

function ResultList({ options, onChoose, empty }: { options: GymOption[] | null; onChoose: (o: GymOption) => void; empty: string | null }) {
  if (empty) return <Text style={styles.empty}>{empty}</Text>;
  if (!options || options.length === 0) return null;
  return (
    <View style={styles.list}>
      {options.map((o, i) => (
        <Pressable
          key={`${o.name}-${o.latitude}-${o.longitude}`}
          onPress={() => onChoose(o)}
          style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel={`${o.name}${o.address ? `, ${o.address}` : ''}${o.distanceMeters !== null ? `, ${formatDistance(o.distanceMeters)} away` : ''}`}
        >
          <View style={[styles.rowIcon, o.isGym && styles.rowIconGym]}>
            <Ionicons name={o.isGym ? 'barbell' : 'location-outline'} size={17} color={o.isGym ? colors.accent : colors.textMuted} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.rowName} numberOfLines={1}>
              {o.name}
            </Text>
            {o.address ? (
              <Text style={styles.rowAddress} numberOfLines={1}>
                {o.address}
              </Text>
            ) : null}
          </View>
          {o.distanceMeters !== null && <Text style={styles.rowDistance}>{formatDistance(o.distanceMeters)}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm + 4 },
  flex: { flex: 1 },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    padding: spacing.md,
  },
  pin: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.successMuted, alignItems: 'center', justifyContent: 'center' },
  selectedEyebrow: { color: colors.success, ...type.eyebrow, fontSize: 11 },
  selectedLabel: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 17, paddingVertical: spacing.sm + 4 },
  sectionLabel: { color: colors.textMuted, ...type.eyebrow, fontSize: 12, marginTop: spacing.xs, marginLeft: spacing.xs },
  loader: { marginVertical: spacing.md },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  rowIconGym: { backgroundColor: colors.accentMuted },
  rowName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowAddress: { color: colors.textMuted, fontSize: 13, marginTop: 1 },
  rowDistance: { color: colors.textMuted, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  empty: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginHorizontal: spacing.xs },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  actionPressed: { backgroundColor: colors.surfaceAlt },
  actionText: { color: colors.accent, fontSize: 17, fontWeight: '600' },
  exact: { alignSelf: 'center', paddingVertical: spacing.xs },
  exactText: { color: colors.textMuted, fontSize: 14 },
  exactLink: { color: colors.accent, fontWeight: '600' },
});
