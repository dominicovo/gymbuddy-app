import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

// Each person gets a stable tint from their name, so a buddy list reads as
// people rather than a column of identical grey circles.
const TINTS = ['#8B84F0', '#4FC3B5', '#EE8A74', '#E8B25A', '#6AA8F0', '#E07BB5', '#9CCB5E', '#B99AF0'];

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function tintFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '–';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

interface AvatarProps {
  name: string;
  /** Stable identity for the tint (a user id or handle); falls back to the name. */
  seed?: string;
  size?: number;
  /** Small status dot at the bottom-right, e.g. checked in today. */
  status?: string | null;
  /** Profile photo; initials show until it loads, and if it fails. */
  uri?: string | null;
}

export function Avatar({ name, seed, size = 44, status, uri }: AvatarProps) {
  const tint = tintFor(seed || name || '?');
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showPhoto = !!uri && uri !== failedUri;
  const dot = Math.max(10, Math.round(size * 0.28));
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: hexToRgba(tint, 0.2) },
        ]}
      >
        <Text style={[styles.initials, { color: tint, fontSize: Math.round(size * 0.38) }]}>{initialsFor(name)}</Text>
        {showPhoto ? (
          <Image
            source={{ uri: uri! }}
            style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
            onError={() => setFailedUri(uri!)}
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>
      {status ? (
        <View
          style={[
            styles.dot,
            { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: status },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontWeight: '800' },
  dot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    borderWidth: 2,
    borderColor: colors.background,
  },
});
