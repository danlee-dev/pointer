// 볼륨 버튼으로 넘기기 (iOS).
// iOS 는 볼륨 버튼 누름을 직접 알려 주지 않는다. 대신 볼륨 값이 바뀌는 걸 보고 방향을 판단한 뒤
// 곧바로 중간(0.5)으로 되돌린다. 그래야 끝(0 이나 1)에 닿아서 더 안 바뀌는 일이 없다.
// 볼륨 HUD 는 숨긴다. 실제 아이폰에서만 동작한다 (시뮬레이터는 볼륨 버튼이 없다).

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { VolumeManager } from 'react-native-volume-manager';

const BASELINE = 0.5;

export function useVolumeButtons(enabled: boolean, onUp: () => void, onDown: () => void) {
  const up = useRef(onUp);
  const down = useRef(onDown);
  up.current = onUp;
  down.current = onDown;

  useEffect(() => {
    if (!enabled || Platform.OS !== 'ios') return;
    let alive = true;
    let ignoreUntil = 0;
    let sub: { remove(): void } | null = null;

    void (async () => {
      await VolumeManager.enable(true, true);
      await VolumeManager.setActive(true, true);
      await VolumeManager.showNativeVolumeUI({ enabled: false });
      // 되돌릴 때 생기는 변화는 버튼 누름이 아니니 잠깐 무시한다
      ignoreUntil = Date.now() + 400;
      await VolumeManager.setVolume(BASELINE, { showUI: false });
      if (!alive) return;
      sub = VolumeManager.addVolumeListener(({ volume }) => {
        if (Date.now() < ignoreUntil || Math.abs(volume - BASELINE) < 0.01) return;
        if (volume > BASELINE) up.current();
        else down.current();
        ignoreUntil = Date.now() + 250;
        void VolumeManager.setVolume(BASELINE, { showUI: false });
      });
    })();

    return () => {
      alive = false;
      sub?.remove();
      void VolumeManager.showNativeVolumeUI({ enabled: true });
    };
  }, [enabled]);
}
