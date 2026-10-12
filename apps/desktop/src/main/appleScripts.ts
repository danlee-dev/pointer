// PowerPoint·Keynote 에게 PDF 내보내기를 시키는 AppleScript. (convert.ts 에서 씀)
// 따로 둔 이유: appleScripts.test.ts 가 osacompile 로 문법을 검사한다.
// (AppleScript 예약어를 변수 이름으로 써서 통째로 안 돌던 일이 있었다. 'before' 같은 것)

/** argv: [입력 파일, 출력 PDF] */
export const POWERPOINT_EXPORT = `on run argv
  with timeout of 170 seconds
    tell application "Microsoft PowerPoint"
      open (POSIX file (item 1 of argv))
      set pres to active presentation
      save pres in (POSIX file (item 2 of argv)) as save as PDF
      close pres saving no
    end tell
  end timeout
end run`;

/** argv: [입력 파일, 출력 PDF]. 건너뛰지 않은 장의 발표자 노트를 ASCII 31 로 이어서 돌려준다 */
export const KEYNOTE_EXPORT = `on run argv
  with timeout of 170 seconds
    tell application "Keynote"
      -- pptx 를 열면 open 이 문서 대신 가져오기 중인 임시 참조(unmerge id)를 돌려줄 때가 있다.
      -- 돌려받은 값을 쓰지 말고, 문서가 실제로 생길 때까지 기다렸다가 맨 앞 문서를 쓴다.
      set docsBefore to count of documents
      open (POSIX file (item 1 of argv))
      repeat 240 times
        if (count of documents) > docsBefore then exit repeat
        delay 0.5
      end repeat
      set doc to front document
      set notesList to presenter notes of every slide of doc
      set skippedList to skipped of every slide of doc
      export doc to (POSIX file (item 2 of argv)) as PDF with properties {PDF image quality:Best, skipped slides:false}
      close doc saving no
    end tell
  end timeout
  set out to ""
  repeat with i from 1 to count of notesList
    if item i of skippedList is false then set out to out & (item i of notesList) & (ASCII character 31)
  end repeat
  return out
end run`;
