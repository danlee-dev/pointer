// iOS 리모컨 화면. 구성은 안드로이드 웹 리모컨과 같다:
//   위: 장 번호(누르면 장 이동) · 타이머 · 더보기
//   가운데: 현재 장 = 터치 패드, 도구 고르기, (펜이면 색), 발표 메모
//   아래: 이전 / 다음(다음 장 미리보기)
// iOS 에만 있는 것: 볼륨 버튼 넘기기, 진동(햅틱), 에어 포인터, 화면 꺼짐 방지.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { crossedAlerts, formatClock, thumbUrl, timerElapsed, timerRemaining, PEN_COLORS, type Blank, type Cue, type Pairing, type PenColor } from '@pointer/protocol';
import type { RemoteClient } from '@pointer/remote-core';
import { AirIcon, LaserIcon, MagnifyIcon, MoreIcon, PenIcon, SparkleIcon, SpotlightIcon } from '../components/icons';
import { Pad, type PadTool } from '../components/Pad';
import { CueSheet, JumpSheet, MoreSheet, TimerSheet } from '../components/Sheets';
import { useVolumeButtons } from '../hooks/useVolumeButtons';
import { t } from '../i18n';
import type { Settings } from '../storage';
import { color, curve, pen, radius, type } from '../theme';

const TOOLS: PadTool[] = ['laser', 'spotlight', 'magnify', 'pen', 'air'];
const TOOL_ICON = { laser: LaserIcon, spotlight: SpotlightIcon, magnify: MagnifyIcon, pen: PenIcon, air: AirIcon };

function useNow(ms: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

interface Props {
  client: RemoteClient;
  pairing: Pairing;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onChangeComputer: () => void;
}

export function RemoteScreen({ client, pairing, settings, onSettings, onChangeComputer }: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const snap = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const { state, status, latency, clockOffset } = snap;
  const [penColor, setPenColor] = useState<PenColor>('red');
  const [clearSignal, setClearSignal] = useState(0);
  const [sheet, setSheet] = useState<'jump' | 'timer' | 'cue' | 'more' | null>(null);
  const [hintSeen, setHintSeen] = useState<Record<string, boolean>>({});
  const now = useNow(250) + clockOffset;
  const tool = settings.tool;

  // 앱으로 돌아오면 바로 다시 붙는다 (iOS 는 백그라운드에서 소켓을 끊는다)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && client.wake());
    return () => sub.remove();
  }, [client]);

  const tick = () => settings.haptics && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  // 목표 시간 알림: 5분, 1분 남았을 때, 끝났을 때
  const prevRemaining = useRef<number | null>(null);
  const remaining = state ? timerRemaining(state.timer, now) : null;
  useEffect(() => {
    const prev = prevRemaining.current;
    prevRemaining.current = remaining;
    if (prev === null || remaining === null || !state?.timer.running) return;
    if (crossedAlerts(prev, remaining).length && settings.haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [remaining, state?.timer.running, settings.haptics]);

  const thumb = useMemo(() => (i: number) => (state?.deck ? thumbUrl(pairing, state.deck.id, i) : null), [pairing, state?.deck?.id]);

  useEffect(() => {
    if (!state?.deck) return;
    for (const i of [state.index + 1, state.index - 1]) {
      const u = thumb(i);
      if (u && i >= 0 && i < state.deck.pages.length) void Image.prefetch(u);
    }
  }, [state?.deck?.id, state?.index, thumb]);

  const deck = state?.deck ?? null;
  const nav = (dir: 1 | -1) => {
    if (!state || !deck) return;
    tick();
    if (state.blank !== 'none') client.patchState({ blank: 'none' });
    else client.patchState({ index: Math.max(0, Math.min(deck.pages.length - 1, state.index + dir)) });
    client.send({ t: 'nav', dir });
  };

  useVolumeButtons(settings.volumeButtons && !!deck, () => nav(1), () => nav(-1));

  // 효과: 누르면 톡, 두구두구는 누르고 있는 동안 손에서도 두구두구
  const rollBuzz = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCue = (cue: Cue, on: boolean) => {
    client.send({ t: 'cue', cue, on });
    if (!settings.haptics) return;
    if (on) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (cue !== 'drumroll') return;
    if (rollBuzz.current) clearInterval(rollBuzz.current);
    rollBuzz.current = null;
    if (on) rollBuzz.current = setInterval(() => void Haptics.selectionAsync(), 90);
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };
  useEffect(() => () => {
    if (rollBuzz.current) clearInterval(rollBuzz.current);
  }, []);

  const setBlank = (b: Blank) => {
    client.patchState({ blank: b });
    client.send({ t: 'blank', blank: b });
    setSheet(null);
  };

  // ---------- 연결 상태 화면 ----------
  if (status === 'expired' || status === 'revoked' || status === 'version' || !state || !deck) {
    const title =
      status === 'expired' ? t.remote.expired : status === 'revoked' ? t.remote.revoked : status === 'version' ? t.remote.versionMismatch : !state ? t.remote.connecting : t.remote.noDeck;
    const sub = status === 'expired' ? t.remote.expiredSub : state && status !== 'open' ? t.remote.reconnecting : null;
    return (
      <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.noticeTitle}>{title}</Text>
        {sub ? <Text style={styles.noticeSub}>{sub}</Text> : null}
        <Pressable style={styles.textBtn} onPress={onChangeComputer}>
          <Text style={styles.textBtnLabel}>{t.app.changeComputer}</Text>
        </Pressable>
      </View>
    );
  }

  const page = deck.pages[state.index] ?? { w: 16, h: 9 };
  const nextPage = deck.pages[state.index + 1];
  const last = state.index >= deck.pages.length - 1;
  const blank = state.blank;
  const elapsed = timerElapsed(state.timer, now);
  const over = remaining !== null && remaining < 0;
  const showVolumeTip = !settings.volumeButtons && !settings.volumeTipSeen;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 4, paddingBottom: Math.max(16, insets.bottom) }]}>
      <View style={styles.bar}>
        <Pressable style={styles.page} onPress={() => setSheet('jump')} accessibilityLabel={t.remote.jumpTitle}>
          <Text style={styles.pageNum}>{state.index + 1}</Text>
          <Text style={styles.pageOf}>/ {deck.pages.length}</Text>
        </Pressable>
        <Pressable style={styles.clockBtn} onPress={() => setSheet('timer')} accessibilityLabel={t.timer.title}>
          <Text style={[styles.clockText, !state.timer.running && { color: color.fgMuted }, over && { color: color.accentText }]}>
            {remaining === null ? formatClock(elapsed) : formatClock(Math.abs(remaining))}
            {remaining !== null ? <Text style={styles.clockSuffix}>  {over ? t.timer.over : t.timer.left}</Text> : null}
          </Text>
        </Pressable>
        <View style={styles.barActions}>
          <Pressable style={styles.iconBtn} onPress={() => setSheet('cue')} accessibilityLabel={t.cue.title}>
            <SparkleIcon color={color.fgMuted} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setSheet('more')} accessibilityLabel={t.remote.more}>
            <MoreIcon color={color.fgMuted} />
          </Pressable>
        </View>
      </View>

      {status !== 'open' ? <Text style={styles.status}>{t.remote.reconnecting}</Text> : null}

      <Pad
        client={client}
        src={thumb(state.index)}
        aspect={page.w / page.h}
        index={state.index}
        blank={blank}
        tool={tool}
        penColor={penColor}
        clearSignal={clearSignal}
        showHint={!hintSeen[tool]}
        onUsed={() => !hintSeen[tool] && setHintSeen((h) => ({ ...h, [tool]: true }))}
        maxHeight={height * 0.34}
      />

      <View style={styles.tools}>
        {TOOLS.map((k) => {
          const Icon = TOOL_ICON[k];
          const on = k === tool;
          return (
            <Pressable key={k} style={[styles.tool, on && styles.toolOn]} onPress={() => onSettings({ ...settings, tool: k })} accessibilityState={{ selected: on }}>
              <Icon color={on ? color.accentText : color.fgSubtle} />
              <Text style={[styles.toolLabel, on && { color: color.fg }]}>{t.tool[k]}</Text>
            </Pressable>
          );
        })}
      </View>

      {tool === 'pen' ? (
        <View style={styles.penRow}>
          {PEN_COLORS.map((c) => (
            <Pressable key={c} onPress={() => setPenColor(c)} style={[styles.swatch, { backgroundColor: pen[c] }, c === penColor && styles.swatchOn]} accessibilityLabel={c} />
          ))}
          <Pressable
            style={[styles.textBtn, { marginLeft: 'auto' }]}
            onPress={() => {
              client.send({ t: 'clearInk' });
              setClearSignal((n) => n + 1);
            }}
          >
            <Text style={styles.textBtnLabel}>{t.remote.clearInk}</Text>
          </Pressable>
        </View>
      ) : null}

      {showVolumeTip ? (
        <View style={styles.tip}>
          <Text style={styles.tipText}>{t.app.volumeTip}</Text>
          <Pressable onPress={() => onSettings({ ...settings, volumeTipSeen: true })} style={styles.textBtn}>
            <Text style={styles.textBtnLabel}>{t.app.later}</Text>
          </Pressable>
          <Pressable onPress={() => onSettings({ ...settings, volumeButtons: true, volumeTipSeen: true })} style={styles.tipBtn}>
            <Text style={styles.tipBtnText}>{t.app.enable}</Text>
          </Pressable>
        </View>
      ) : state.notes ? (
        <ScrollView style={styles.notes} contentContainerStyle={{ padding: 14 }}>
          <Text style={styles.notesText} selectable>
            {state.notes}
          </Text>
        </ScrollView>
      ) : null}

      <View style={styles.nav}>
        <Pressable
          style={({ pressed }) => [styles.prev, pressed && styles.pressed, state.index === 0 && blank === 'none' && { opacity: 0.35 }]}
          disabled={state.index === 0 && blank === 'none'}
          onPress={() => nav(-1)}
        >
          <Text style={styles.prevText}>{t.remote.prev}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.next, pressed && styles.pressedNext, last && blank === 'none' && { opacity: 0.35 }]}
          disabled={last && blank === 'none'}
          onPress={() => nav(1)}
        >
          {!last && nextPage ? (
            <Image source={{ uri: thumb(state.index + 1) ?? undefined }} style={[styles.nextImg, { aspectRatio: nextPage.w / nextPage.h }]} resizeMode="contain" />
          ) : null}
          <Text style={last ? styles.lastText : styles.nextText}>{last ? t.remote.last : t.remote.next}</Text>
        </Pressable>
      </View>

      <JumpSheet
        visible={sheet === 'jump'}
        count={deck.pages.length}
        index={state.index}
        thumb={thumb}
        onPick={(i) => {
          tick();
          client.patchState({ index: i, blank: 'none' });
          client.send({ t: 'goto', index: i });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <TimerSheet
        visible={sheet === 'timer'}
        timer={state.timer}
        now={now}
        onAction={(action) => client.send({ t: 'timer', action })}
        onTarget={(ms) => client.send({ t: 'timerTarget', ms })}
        onClose={() => setSheet(null)}
      />
      <CueSheet visible={sheet === 'cue'} onCue={onCue} onClose={() => setSheet(null)} />
      <MoreSheet
        visible={sheet === 'more'}
        blank={blank}
        onBlank={setBlank}
        haptics={settings.haptics}
        onHaptics={(on) => onSettings({ ...settings, haptics: on })}
        volumeButtons={settings.volumeButtons}
        onVolumeButtons={(on) => onSettings({ ...settings, volumeButtons: on, volumeTipSeen: true })}
        latency={latency}
        onChangeComputer={() => {
          setSheet(null);
          onChangeComputer();
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg, paddingHorizontal: 16, gap: 12 },
  center: { flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  noticeTitle: { color: color.fg, fontSize: 24, lineHeight: 32, fontWeight: '300', textAlign: 'center', letterSpacing: -0.5 },
  noticeSub: { color: color.fgMuted, ...type.body, textAlign: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  page: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingVertical: 4 },
  pageNum: { color: color.fg, fontSize: 36, fontWeight: '300', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  pageOf: { color: color.fgMuted, fontSize: 15, fontVariant: ['tabular-nums'] },
  clockBtn: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: color.bgRaised, justifyContent: 'center' },
  clockText: { color: color.fg, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  clockSuffix: { color: color.fgMuted, fontSize: 13, fontWeight: '400' },
  barActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bgRaised },
  status: { color: color.warn, fontSize: 13, marginVertical: -4 },
  tools: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.lg, ...curve, backgroundColor: color.bgRaised },
  tool: { flex: 1, alignItems: 'center', gap: 2, paddingTop: 8, paddingBottom: 6, borderRadius: radius.lg - 4, ...curve },
  toolOn: { backgroundColor: color.surface, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  toolLabel: { color: color.fgSubtle, fontSize: 12, fontWeight: '600' },
  penRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  swatchOn: { borderWidth: 3, borderColor: color.fg },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, borderRadius: radius.lg, ...curve, backgroundColor: color.bgRaised },
  tipText: { flex: 1, color: color.fg, fontSize: 14 },
  tipBtn: { height: 34, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: color.primary, justifyContent: 'center' },
  tipBtnText: { color: color.primaryFg, fontSize: 14, fontWeight: '600' },
  notes: { flexGrow: 0, maxHeight: 140, borderRadius: radius.lg, ...curve, backgroundColor: color.bgRaised },
  notesText: { color: color.fg, ...type.body },
  textBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill },
  textBtnLabel: { color: color.fgMuted, fontSize: 14, fontWeight: '600' },
  nav: { flex: 1, minHeight: 132, flexDirection: 'row', gap: 8 },
  prev: { flex: 0.45, borderRadius: radius.xl, ...curve, backgroundColor: color.bgRaised, alignItems: 'center', justifyContent: 'center' },
  prevText: { color: color.fgMuted, fontSize: 17, fontWeight: '600' },
  next: { flex: 1, borderRadius: radius.xl, ...curve, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  nextImg: { width: '78%', maxHeight: '40%', borderRadius: radius.lg - 8, ...curve },
  nextText: { color: color.fg, fontSize: 28, fontWeight: '300', letterSpacing: -0.8 },
  lastText: { color: color.fgMuted, fontSize: 17, fontWeight: '600' },
  pressed: { backgroundColor: color.surface, transform: [{ scale: 0.97 }] },
  pressedNext: { backgroundColor: color.surfacePress, transform: [{ scale: 0.97 }] },
});
