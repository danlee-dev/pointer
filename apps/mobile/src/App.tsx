// 앱 뼈대: 마지막에 연결한 컴퓨터가 있으면 바로 리모컨, 없으면 연결 화면.

import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import type { Pairing } from '@pointer/protocol';
import { RemoteClient } from '@pointer/remote-core';
import { ConnectScreen } from './screens/ConnectScreen';
import { RemoteScreen } from './screens/RemoteScreen';
import { store, type Settings } from './storage';
import { color } from './theme';

export default function App() {
  const [ready, setReady] = useState(false);
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void (async () => {
      const [p, id, s] = await Promise.all([store.pairing(), store.deviceId(), store.settings()]);
      setPairing(p);
      setDeviceId(id);
      setSettings(s);
      setReady(true);
    })();
  }, []);

  // 컴퓨터가 바뀔 때만 연결을 새로 만든다
  const client = useMemo(() => {
    if (!pairing || !deviceId) return null;
    const name = Constants.deviceName || 'iPhone';
    return new RemoteClient(pairing, { id: deviceId, name, platform: 'ios' });
  }, [pairing, deviceId]);

  useEffect(() => {
    if (!client) return;
    client.connect();
    return () => client.close();
  }, [client]);

  if (!ready || !settings) return <View style={{ flex: 1, backgroundColor: color.bg }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {client && pairing ? (
        <RemoteScreen
          client={client}
          pairing={pairing}
          settings={settings}
          onSettings={(s) => {
            setSettings(s);
            void store.setSettings(s);
          }}
          onChangeComputer={() => {
            setPairing(null);
            void store.setPairing(null);
          }}
        />
      ) : (
        <ConnectScreen
          onPaired={(p) => {
            setPairing(p);
            void store.setPairing(p);
          }}
        />
      )}
    </SafeAreaProvider>
  );
}
