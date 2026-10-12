// 맥 디스플레이 미러링 도우미. Electron 은 미러링을 켜고 끄는 API 가 없어서 CoreGraphics 를 직접 부른다.
//   displays status                     -> 연결된 화면 목록 (JSON)
//   displays extend                     -> 미러링을 모두 끔 (확장 모드)
//   displays mirror <원본> <복제> ...    -> 미러링 복구
// 설정은 .forSession 으로만 바꾼다: 로그아웃하면 원래대로 돌아가서, 앱이 죽어도 영구히 꼬이지 않는다.

import CoreGraphics
import Foundation

func onlineDisplays() -> [CGDirectDisplayID] {
  var count: UInt32 = 0
  guard CGGetOnlineDisplayList(0, nil, &count) == .success, count > 0 else { return [] }
  var ids = [CGDirectDisplayID](repeating: 0, count: Int(count))
  guard CGGetOnlineDisplayList(count, &ids, &count) == .success else { return [] }
  return Array(ids.prefix(Int(count)))
}

func status() {
  let list = onlineDisplays().map { id -> [String: Any] in
    [
      "id": Int(id),
      "builtin": CGDisplayIsBuiltin(id) != 0,
      "main": CGDisplayIsMain(id) != 0,
      // 0 이면 다른 화면을 복제하고 있지 않다
      "mirrorOf": Int(CGDisplayMirrorsDisplay(id)),
      "width": CGDisplayPixelsWide(id),
      "height": CGDisplayPixelsHigh(id),
    ]
  }
  let data = try! JSONSerialization.data(withJSONObject: ["displays": list])
  print(String(data: data, encoding: .utf8)!)
}

func configure(_ body: (CGDisplayConfigRef?) -> Void) -> Bool {
  var config: CGDisplayConfigRef?
  guard CGBeginDisplayConfiguration(&config) == .success else { return false }
  body(config)
  return CGCompleteDisplayConfiguration(config, .forSession) == .success
}

let args = CommandLine.arguments.dropFirst()
switch args.first {
case "status":
  status()
case "extend":
  let ok = configure { config in
    for id in onlineDisplays() where CGDisplayMirrorsDisplay(id) != kCGNullDirectDisplay {
      CGConfigureDisplayMirrorOfDisplay(config, id, kCGNullDirectDisplay)
    }
  }
  exit(ok ? 0 : 1)
case "mirror":
  let ids = args.dropFirst().compactMap { UInt32($0) }
  guard let master = ids.first, ids.count > 1 else { exit(2) }
  let ok = configure { config in
    for slave in ids.dropFirst() { CGConfigureDisplayMirrorOfDisplay(config, slave, master) }
  }
  exit(ok ? 0 : 1)
default:
  FileHandle.standardError.write("usage: displays status | extend | mirror <master> <slave>...\n".data(using: .utf8)!)
  exit(2)
}
