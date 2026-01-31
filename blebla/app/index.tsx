import { AnimationConfig, GDGColors } from "@/constants/colors";
import { useAppTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

export default function SplashScreen() {
  const { theme, isDark } = useAppTheme();
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial fade in and scale with spring physics
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: AnimationConfig.timing.normal,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: AnimationConfig.spring.damping,
        stiffness: AnimationConfig.spring.stiffness,
        mass: AnimationConfig.spring.mass,
        useNativeDriver: true,
      }),
    ]).start();

    // Dot loading animation with stagger
    const dotAnimations = dotAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 120),
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
        ]),
      ),
    );
    dotAnimations.forEach((anim) => anim.start());

    // Navigate after splash
    const timeout = setTimeout(() => {
      router.replace("/home");
    }, 3000);

    return () => {
      clearTimeout(timeout);
      dotAnimations.forEach((anim) => anim.stop());
    };
  }, []);

  const gdgColors = [
    GDGColors.googleBlue,
    GDGColors.googleRed,
    GDGColors.googleYellow,
    GDGColors.googleGreen,
  ];

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
              { rotate: rotation },
            ],
          },
        ]}
      >
        {/* Mesh network logo */}
        <View style={styles.meshLogo}>
          <View style={[styles.meshOuter, { borderColor: theme.primary }]}>
            <View
              style={[styles.meshInner, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.meshText}>M</Text>
            </View>
          </View>
          {/* Orbital dots */}
          {gdgColors.map((color, index) => (
            <Animated.View
              key={index}
              style={[
                styles.orbitalDot,
                {
                  backgroundColor: color,
                  transform: [
                    { rotate: `${index * 90}deg` },
                    { translateX: 52 },
                    {
                      scale: dotAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 1.3],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        {/* App name */}
        <Animated.Text
          style={[styles.appName, { color: theme.text, opacity: fadeAnim }]}
        >
          MeshChat
        </Animated.Text>

        {/* GDG badge */}
        <Animated.View style={[styles.gdgBadge, { opacity: fadeAnim }]}>
          <Text style={[styles.gdgText, { color: theme.textSecondary }]}>
            Built with <Text style={{ color: GDGColors.googleBlue }}>G</Text>
            <Text style={{ color: GDGColors.googleRed }}>D</Text>
            <Text style={{ color: GDGColors.googleYellow }}>G</Text> love
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Loading indicator */}
      <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
        <View style={styles.dotsContainer}>
          {gdgColors.map((color, index) => (
            <Animated.View
              key={index}
              style={[
                styles.loadingDot,
                {
                  backgroundColor: color,
                  opacity: dotAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: dotAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Initializing mesh network...
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  meshLogo: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  meshOuter: {
    width: 110,
    height: 110,
    borderRadius: 9999,
    borderWidth: 3.5,
    alignItems: "center",
    justifyContent: "center",
  },
  meshInner: {
    width: 68,
    height: 68,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  meshText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },
  orbitalDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  gdgBadge: {
    marginTop: 8,
  },
  gdgText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loadingContainer: {
    position: "absolute",
    bottom: 100,
    alignItems: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "400",
  },
});
