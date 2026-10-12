// 폰에 남기는 것: 마지막에 연결한 컴퓨터, 이 폰의 id, 설정. 계정 없이 이 폰 안에만.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Pairing, Tool } from '@pointer/protocol';

export interface Settings {
  haptics: boolean;
  /** 볼륨 버튼으로 넘기기. App Store 심사(2.5.9) 때문에 기본은 꺼 두고 사용자가 켠다 */
  volumeButtons: boolean;
  volumeTipSeen: boolean;
  tool: Tool | 'air';
}

const DEFAULTS: Settings = { haptics: true, volumeButtons: false, volumeTipSeen: false, tool: 'laser' };

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
const write = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});

export const store = {
  pairing: () => read<Pairing | null>('pairing', null),
  setPairing: (p: Pairing | null) => (p ? write('pairing', p) : AsyncStorage.removeItem('pairing')),
  async deviceId(): Promise<string> {
    const saved = await read<string | null>('deviceId', null);
    if (saved) return saved;
    // 보안용이 아니라 같은 폰을 알아보는 용도라 Math.random 으로 충분하다
    const id = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    await write('deviceId', id);
    return id;
  },
  settings: async (): Promise<Settings> => ({ ...DEFAULTS, ...(await read<Partial<Settings>>('settings', {})) }),
  setSettings: (s: Settings) => write('settings', s),
};
