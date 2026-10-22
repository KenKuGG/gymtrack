import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';

interface GymTrackLogoProps {
  size?: 'small' | 'medium' | 'large';
  showBrandName?: boolean;
  textColor?: string;
  subtitleColor?: string;
}

export function GymTrackLogo({
  size = 'medium',
  showBrandName = false,
  textColor = '#0F172A',
  subtitleColor = '#64748B',
}: GymTrackLogoProps) {
  const dimensions =
    size === 'large'
      ? { circle: 118, fontSize: 44, borderWidth: 3 }
      : size === 'medium'
      ? { circle: 64, fontSize: 24, borderWidth: 2 }
      : { circle: 40, fontSize: 15, borderWidth: 1.5 };

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.blackCircle,
          {
            width: dimensions.circle,
            height: dimensions.circle,
            borderRadius: dimensions.circle / 2,
            borderWidth: dimensions.borderWidth,
          },
        ]}
      >
        <Text
          style={[
            styles.logoLetters,
            {
              fontSize: dimensions.fontSize,
            },
          ]}
        >
          GT!
        </Text>
      </View>

      {showBrandName && (
        <View style={styles.brandTextContainer}>
          <Text
            style={[
              styles.brandName,
              {
                color: textColor,
                fontSize: size === 'large' ? 34 : 22,
              },
            ]}
          >
            GymTrack!
          </Text>
          {size === 'large' && (
            <>
              <Text style={[styles.brandTagline, { color: subtitleColor }]}>
                SMART CALORIES • AI DIETS • ROUTINES
              </Text>
              <Text style={[styles.authorCredit, { color: subtitleColor }]}>
                App By KenKu
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const MODERN_FONT = Platform.select({
  ios: 'AvenirNext-HeavyItalic',
  android: 'sans-serif-condensed',
  default: 'System',
});

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  blackCircle: {
    backgroundColor: '#000000',
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  logoLetters: {
    color: '#FFFFFF',
    fontFamily: MODERN_FONT,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1.2,
    includeFontPadding: false,
  },
  brandTextContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  brandName: {
    fontFamily: MODERN_FONT,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginTop: 6,
    textAlign: 'center',
  },
  authorCredit: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 10,
    opacity: 0.78,
    textAlign: 'center',
  },
});
