// 렌더러는 sandbox 라 Node 를 못 쓴다. 필요한 것만 window.pointer 로 열어 준다.

import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron';
import { IPC, type DesktopApi } from '../shared/ipc';

function listen<T>(channel: string, cb: (v: T) => void): () => void {
  const handler = (_e: IpcRendererEvent, v: T) => cb(v);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api: DesktopApi = {
  platform: process.platform as DesktopApi['platform'],

  openDialog: () => ipcRenderer.invoke(IPC.openDialog),
  // 끌어다 놓은 파일의 실제 경로는 preload 에서만 알 수 있다 (File.path 는 없어졌다).
  openFiles: (files) => ipcRenderer.invoke(IPC.openPaths, files.map((f) => webUtils.getPathForFile(f))),
  openRecent: (paths) => ipcRenderer.invoke(IPC.openPaths, paths),
  removeRecent: (paths) => ipcRenderer.invoke(IPC.removeRecent, paths),
  getRecent: () => ipcRenderer.invoke(IPC.getRecent),
  closeDeck: () => ipcRenderer.send(IPC.closeDeck),
  getSource: () => ipcRenderer.invoke(IPC.getSource),
  readFile: (deckId, fileIndex) => ipcRenderer.invoke(IPC.readFile, deckId, fileIndex),
  getPassword: (deckId) => ipcRenderer.invoke(IPC.getPassword, deckId),
  submitPassword: (password) => ipcRenderer.send(IPC.submitPassword, password),
  onPasswordRequest: (cb) => listen(IPC.passwordRequest, cb),
  getThumb: (deckId, index) => ipcRenderer.invoke(IPC.getThumb, deckId, index),

  getState: () => ipcRenderer.invoke(IPC.getState),
  onState: (cb) => listen(IPC.state, cb),
  command: (c) => ipcRenderer.send(IPC.command, c),
  setNotes: (deckId, index, text) => ipcRenderer.send(IPC.setNotes, deckId, index, text),

  startPresenting: () => ipcRenderer.send(IPC.startPresenting),
  stopPresenting: () => ipcRenderer.send(IPC.stopPresenting),
  swapDisplays: () => ipcRenderer.send(IPC.swapDisplays),
  toggleFullscreen: () => ipcRenderer.send(IPC.toggleFullscreen),
  getFullscreen: () => ipcRenderer.invoke(IPC.getFullscreen),
  onFullscreen: (cb) => listen(IPC.fullscreen, cb),
  getDisplays: () => ipcRenderer.invoke(IPC.getDisplays),
  onDisplays: (cb) => listen(IPC.displays, cb),
  onNotice: (cb) => listen(IPC.notice, cb),
  onPointer: (cb) => listen(IPC.pointer, cb),
  onInk: (cb) => listen(IPC.ink, cb),
  getInk: () => ipcRenderer.invoke(IPC.getInk),

  getConnection: () => ipcRenderer.invoke(IPC.getConnection),
  onConnection: (cb) => listen(IPC.connection, cb),
  setAddress: (address) => ipcRenderer.send(IPC.setAddress, address),
  kickDevice: (id) => ipcRenderer.send(IPC.kickDevice, id),
  rotateToken: () => ipcRenderer.send(IPC.rotateToken),

  getLocale: () => ipcRenderer.invoke(IPC.getLocale),
  onLocale: (cb) => listen(IPC.locale, cb),

  worker: {
    onLoad: (cb) => listen(IPC.workerLoad, cb),
    loaded: (r) => ipcRenderer.send(IPC.workerLoaded, r),
    onThumbRequest: (cb) => listen(IPC.workerThumbRequest, cb),
    thumbDone: (deckId, index, jpeg) => ipcRenderer.send(IPC.workerThumbDone, deckId, index, jpeg),
    onTextRequest: (cb) => listen(IPC.workerTextRequest, cb),
    textDone: (reqId, text) => ipcRenderer.send(IPC.workerTextDone, reqId, text),
  },

  getAiConnection: () => ipcRenderer.invoke(IPC.getAiConnection),
  copyText: (text) => ipcRenderer.send(IPC.copyText, text),
};

contextBridge.exposeInMainWorld('pointer', api);
