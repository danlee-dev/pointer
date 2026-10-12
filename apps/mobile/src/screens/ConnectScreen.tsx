// 처음 연결: 컴퓨터의 pointer 앱에 뜬 QR 을 찍거나, QR 아래 주소를 직접 넣는다.
// (시뮬레이터처럼 카메라가 없을 때도 주소로 연결할 수 있게)

import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parsePairingUrl, type Pairing } from '@pointer/protocol';
import { t } from '../i18n';
import { color, curve, radius, type } from '../theme';

export function ConnectScreen({ onPaired, notice }: { onPaired: (p: Pairing) => void; notice?: string | null }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState(false);
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  const accept = (raw: string) => {
    const p = parsePairingUrl(raw.trim());
    if (!p) {
      setError(t.app.invalidAddress);
      return;
    }
    if (done.current) return;
    done.current = true;
    onPaired(p);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: Math.max(24, insets.bottom) }]}>
        <Text style={styles.title}>{t.app.connectTitle}</Text>
        <Text style={styles.sub}>{t.app.connectSub}</Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <View style={styles.camera}>
          {permission?.granted && !manual ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => accept(data)}
            />
          ) : (
            <View style={styles.cameraEmpty}>
              {permission && !permission.granted && !manual ? (
                <>
                  {!permission.canAskAgain ? <Text style={styles.sub}>{t.app.cameraDenied}</Text> : null}
                  {permission.canAskAgain ? (
                    <Pressable style={styles.primary} onPress={() => void requestPermission()}>
                      <Text style={styles.primaryText}>{t.app.allowCamera}</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}
            </View>
          )}
        </View>

        {manual ? (
          <View style={styles.manual}>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={(v) => {
                setAddress(v);
                setError(null);
              }}
              placeholder={t.app.addressPlaceholder}
              placeholderTextColor={color.fgSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={() => accept(address)}
              autoFocus
            />
            <Pressable style={[styles.primary, !address && { opacity: 0.4 }]} disabled={!address} onPress={() => accept(address)}>
              <Text style={styles.primaryText}>{t.app.connect}</Text>
            </Pressable>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.textBtn} onPress={() => setManual((m) => !m)}>
          <Text style={styles.textBtnLabel}>{manual ? t.app.allowCamera : t.app.enterAddress}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  inner: { flex: 1, paddingHorizontal: 20, gap: 12 },
  title: { color: color.fg, ...type.display },
  sub: { color: color.fgMuted, ...type.body },
  notice: { color: color.warn, ...type.body },
  camera: { flex: 1, maxHeight: 420, marginTop: 12, borderRadius: radius.xl, ...curve, overflow: 'hidden', backgroundColor: color.bgRaised },
  cameraEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  manual: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, height: 48, paddingHorizontal: 16, borderRadius: radius.md, ...curve, backgroundColor: color.surface, color: color.fg, fontSize: 15 },
  primary: { height: 48, paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: color.primaryFg, fontSize: 15, fontWeight: '600' },
  error: { color: color.accentText, ...type.caption },
  textBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, marginLeft: -12, borderRadius: radius.pill },
  textBtnLabel: { color: color.fgMuted, fontSize: 15, fontWeight: '600' },
});
