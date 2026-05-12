import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import BrowserScreen from './src/screens/BrowserScreen';
import DownloadsScreen from './src/screens/DownloadsScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import MiniPlayer from './src/components/MiniPlayer';
import useStore from './src/store/useStore';
import { C } from './src/theme';

const Tab = createBottomTabNavigator();

const NavTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: C.bg, card: C.s1, border: C.s3, text: C.txt },
};

function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { downloads, currentTrack } = useStore();
  const activeCount = downloads.filter(d => ['fetching','downloading','converting'].includes(d.status)).length;

  const icons = { Browser: 'globe-outline', Downloads: 'arrow-down-circle-outline', Library: 'library-outline', Player: 'musical-notes-outline' };
  const activeIcons = { Browser: 'globe', Downloads: 'arrow-down-circle', Library: 'library', Player: 'musical-notes' };

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
      {/* Mini player sits above tab bar */}
      {currentTrack && (
        <MiniPlayer onPress={() => navigation.navigate('Player')} />
      )}
      <View style={styles.tabs}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = route.name;
          const icon = focused ? activeIcons[label] : icons[label];
          const showBadge = label === 'Downloads' && activeCount > 0;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={icon} size={24} color={focused ? C.lime : C.muted} />
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTxt}>{activeCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const { loadLibrary } = useStore();

  useEffect(() => {
    loadLibrary();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={NavTheme}>
          <StatusBar style="light" backgroundColor={C.bg} />
          <Tab.Navigator
            tabBar={(props) => <TabBar {...props} />}
            screenOptions={{ headerShown: false }}
          >
            <Tab.Screen name="Browser"   component={BrowserScreen} />
            <Tab.Screen name="Downloads" component={DownloadsScreen} />
            <Tab.Screen name="Library"   component={LibraryScreen} />
            <Tab.Screen name="Player"    component={PlayerScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(5,5,8,0.98)',
    borderTopWidth: 1,
    borderTopColor: C.s3,
    paddingTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 50, // space for mini player
  },
  tabItem: { alignItems: 'center', gap: 3, paddingHorizontal: 16 },
  iconWrap: { position: 'relative' },
  tabLabel: { fontSize: 9, fontWeight: '700', color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  tabLabelActive: { color: C.lime },
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeTxt: { fontSize: 9, fontWeight: '900', color: '#000' },
});
