// 아래에서 올라오는 시트: 장 이동, 타이머, 효과, 더보기. 웹 리모컨과 같은 구성 (제목, 한 줄 설명, 오른쪽 위 닫기).

import { useState, type ReactNode } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatClock, timerElapsed, type Blank, type Cue, type TimerState } from '@pointer/protocol';
import { t } from '../i18n';
import { color, curve, radius, type } from '../theme';
import { CheckIcon, CloseIcon, CUE_ICONS } from './icons';

function Sheet({ visible, title, sub, onClose, children, scroll = true }: { visible: boolean; title: string; sub?: string; onClose: () => void; children: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t.close} />
      <View style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {sub ? <Text style={styles.sub}>{sub}</Text> : null}
          </View>
          <Pressable style={styles.close} onPress={onClose} accessibilityLabel={t.close} hitSlop={8}>
            <CloseIcon color={color.fgMuted} />
          </Pressable>
        </View>
        {scroll ? <ScrollView>{children}</ScrollView> : children}
      </View>
    </Modal>
  );
}

export function JumpSheet(props: { visible: boolean; count: number; index: number; thumb: (i: number) => string | null; onPick: (i: number) => void; onClose: () => void }) {
  const { visible, count, index, thumb, onPick, onClose } = props;
  // 2열 격자. 장 수가 홀수면 마지막 하나가 줄 전체로 늘어나지 않게 폭을 정해 둔다
  const { width } = useWindowDimensions();
  const itemWidth = (width - 40 - 12) / 2;
  return (
    <Sheet visible={visible} title={t.remote.jumpTitle} onClose={onClose} scroll={false}>
      <FlatList
        data={Array.from({ length: count }, (_, i) => i)}
        keyExtractor={(i) => String(i)}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 16, paddingBottom: 8 }}
        initialScrollIndex={Math.max(0, Math.floor(index / 2) * 2)}
        getItemLayout={(_, i) => ({ length: 120, offset: 120 * Math.floor(i / 2), index: i })}
        renderItem={({ item: i }) => {
          const src = thumb(i);
          const current = i === index;
          return (
            <Pressable style={[styles.jumpItem, { width: itemWidth }]} onPress={() => onPick(i)}>
              <View style={[styles.jumpImgWrap, current && styles.jumpCurrent]}>
                {src ? <Image source={{ uri: src }} style={styles.jumpImg} resizeMode="contain" /> : null}
              </View>
              <Text style={[styles.jumpNum, current && { color: color.fg, fontWeight: '600' }]}>{i + 1}</Text>
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

const TARGETS = [5, 10, 15, 20, 30, 45, 60, 90];

export function TimerSheet(props: { visible: boolean; timer: TimerState; now: number; onAction: (a: 'start' | 'pause' | 'reset') => void; onTarget: (ms: number | null) => void; onClose: () => void }) {
  const { visible, timer, now, onAction, onTarget, onClose } = props;
  const elapsed = timerElapsed(timer, now);
  const targetMin = timer.targetMs === null ? null : timer.targetMs / 60_000;
  return (
    <Sheet visible={visible} title={t.timer.title} sub={t.timer.sub} onClose={onClose}>
      <Text style={[styles.clock, !timer.running && { color: color.fgMuted }]}>{formatClock(elapsed)}</Text>
      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => onAction(timer.running ? 'pause' : 'start')}>
          <Text style={[styles.btnText, { color: color.primaryFg }]}>{timer.running ? t.timer.pause : elapsed > 0 ? t.timer.resume : t.timer.start}</Text>
        </Pressable>
        <Pressable style={[styles.btn, elapsed === 0 && { opacity: 0.4 }]} disabled={elapsed === 0} onPress={() => onAction('reset')}>
          <Text style={styles.btnText}>{t.timer.reset}</Text>
        </Pressable>
      </View>
      <Text style={styles.label}>{t.timer.target}</Text>
      {[null, ...TARGETS].map((m) => (
        <Pressable key={m ?? 'none'} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={() => onTarget(m === null ? null : m * 60_000)}>
          <Text style={styles.rowText}>{m === null ? t.timer.noTarget : t.timer.minutes(m)}</Text>
          {targetMin === m ? <CheckIcon color={color.fg} /> : null}
        </Pressable>
      ))}
    </Sheet>
  );
}

export function MoreSheet(props: {
  visible: boolean;
  blank: Blank;
  onBlank: (b: Blank) => void;
  haptics: boolean;
  onHaptics: (on: boolean) => void;
  volumeButtons: boolean;
  onVolumeButtons: (on: boolean) => void;
  latency: number | null;
  onChangeComputer: () => void;
  onClose: () => void;
}) {
  const p = props;
  const choice = (label: string, onPress: () => void, strong = false) => (
    <Pressable key={label} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <Text style={[styles.rowText, strong && { color: color.accentText, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
  return (
    <Sheet visible={p.visible} title={t.remote.more} onClose={p.onClose}>
      {p.blank !== 'black' && choice(t.remote.blankBlack, () => p.onBlank('black'))}
      {p.blank !== 'white' && choice(t.remote.blankWhite, () => p.onBlank('white'))}
      {p.blank !== 'none' && choice(t.remote.unblank, () => p.onBlank('none'), true)}
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowText}>{t.app.volumeButtons}</Text>
          <Text style={styles.switchSub}>{t.app.volumeButtonsSub}</Text>
        </View>
        <Switch value={p.volumeButtons} onValueChange={p.onVolumeButtons} />
      </View>
      <View style={styles.switchRow}>
        <Text style={[styles.rowText, { flex: 1 }]}>{t.remote.vibration}</Text>
        <Switch value={p.haptics} onValueChange={p.onHaptics} />
      </View>
      {choice(t.app.changeComputer, p.onChangeComputer)}
      {p.latency !== null ? <Text style={styles.latency}>{t.remote.ms(p.latency)}</Text> : null}
    </Sheet>
  );
}

// ---------- 효과 ----------
// 누르는 순간 on, 떼는 순간 off (손가락이 미끄러져 나가도 off). 두구두구는 맨 위에 크게.

const CUE_GRID: Cue[] = ['confetti', 'applause', 'fireworks', 'micdrop', 'correct', 'wrong'];

function CuePad({ cue, wide, onCue }: { cue: Cue; wide?: boolean; onCue: (cue: Cue, on: boolean) => void }) {
  const [held, setHeld] = useState(false);
  const Icon = CUE_ICONS[cue];
  return (
    <Pressable
      style={[styles.cuePad, wide && styles.cueWide, held && styles.cueHeld]}
      onPressIn={() => {
        setHeld(true);
        onCue(cue, true);
      }}
      onPressOut={() => {
        setHeld(false);
        onCue(cue, false);
      }}
      accessibilityRole="button"
      accessibilityLabel={t.cue.name[cue]}
    >
      <Icon color={held ? color.fg : color.fgMuted} size={wide ? 36 : 28} />
      <Text style={[styles.cueLabel, wide && styles.cueLabelWide]}>{t.cue.name[cue]}</Text>
      {held ? <View style={styles.liveDot} /> : null}
    </Pressable>
  );
}

export function CueSheet({ visible, onCue, onClose }: { visible: boolean; onCue: (cue: Cue, on: boolean) => void; onClose: () => void }) {
  const { width } = useWindowDimensions();
  // 3열. flexWrap + % 대신 폭을 숫자로 정한다 (RN 에서 % 줄바꿈은 마지막 줄이 늘어난다)
  const cell = (width - 40 - 16) / 3;
  return (
    <Sheet visible={visible} title={t.cue.title} sub={t.cue.sub} onClose={onClose} scroll={false}>
      <View style={styles.cueGrid}>
        <CuePad cue="drumroll" wide onCue={onCue} />
        {[CUE_GRID.slice(0, 3), CUE_GRID.slice(3)].map((row, i) => (
          <View key={i} style={styles.cueRow}>
            {row.map((c) => (
              <View key={c} style={{ width: cell }}>
                <CuePad cue={c} onCue={onCue} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: color.scrim },
  sheet: { maxHeight: '86%', paddingTop: 24, paddingHorizontal: 20, backgroundColor: color.bgRaised, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, ...curve },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  title: { color: color.fg, ...type.section },
  sub: { color: color.fgMuted, ...type.caption, marginTop: 8 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
  jumpItem: { gap: 6 },
  jumpImgWrap: { aspectRatio: 16 / 9, borderRadius: radius.sm, ...curve, overflow: 'hidden', backgroundColor: '#000' },
  jumpCurrent: { borderWidth: 2, borderColor: color.fg },
  jumpImg: { width: '100%', height: '100%' },
  jumpNum: { color: color.fgMuted, fontSize: 13 },
  clock: { color: color.fg, fontSize: 56, lineHeight: 62, fontWeight: '300', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 24 },
  btn: { height: 46, paddingHorizontal: 22, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
  btnPrimary: { backgroundColor: color.primary },
  btnText: { color: color.fg, fontSize: 15, fontWeight: '600' },
  label: { color: color.fgMuted, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginHorizontal: -12, borderRadius: radius.md, ...curve },
  rowPressed: { backgroundColor: color.surface },
  rowText: { color: color.fg, fontSize: 16 },
  switchRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  switchSub: { color: color.fgMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  latency: { color: color.fgSubtle, fontSize: 13, marginTop: 16, fontVariant: ['tabular-nums'] },
  cueGrid: { gap: 8, paddingBottom: 4 },
  cueRow: { flexDirection: 'row', gap: 8 },
  cuePad: { minHeight: 96, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, ...curve, backgroundColor: color.surface },
  cueWide: { minHeight: 120, flexDirection: 'row', gap: 12 },
  cueHeld: { backgroundColor: color.surfacePress, transform: [{ scale: 0.96 }] },
  cueLabel: { color: color.fg, fontSize: 14, fontWeight: '600' },
  cueLabelWide: { fontSize: 20, fontWeight: '300', letterSpacing: -0.4 },
  liveDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: color.laser },
});
