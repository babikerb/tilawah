import React, { useCallback, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as SplashScreen from 'expo-splash-screen';
import { useAppFonts } from '../theme/useAppFonts';
import { PlaybackProvider } from '../lib/PlaybackProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <PlaybackProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="player" options={{ animation: 'slide_from_bottom' }} />
            </Stack>
          </PlaybackProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
