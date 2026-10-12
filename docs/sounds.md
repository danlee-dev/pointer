# 효과음 출처

효과음은 대부분 Web Audio 로 그 자리에서 합성한다 (`apps/desktop/src/renderer/src/cues/sound.ts`).
녹음을 쓰는 건 두구두구 하나뿐이고, 모두 CC0 (퍼블릭 도메인, 표기 의무 없음) 이다.

| 파일 | 원본 | 작성자 | 라이선스 |
| --- | --- | --- | --- |
| `timpani-roll-a.flac` | [Timpani - rolls - E3](https://freesound.org/people/sgossner/sounds/373946/) | sgossner | CC0 |
| `timpani-roll-b.flac` | [Timpani Roll kevinsticks](https://freesound.org/people/hallkev/sounds/428611/) | hallkev | CC0 |
| `timpani-hit.flac` | [Timpani - E3 hit](https://freesound.org/people/sgossner/sounds/373935/) | sgossner | CC0 |

파일은 `apps/desktop/src/renderer/public/sounds/` 에 있고 `apps/desktop/scripts/make-sounds.py` 로 다시 만들 수 있다.

## 고를 때 지킬 것

- CC0 만 쓴다. 효과 버튼은 "사용자가 소리를 골라 재생하는" 사운드패드에 가깝다.
  効果音ラボ 처럼 사운드패드 용도를 금지한 사이트, Pixabay·Mixkit 처럼 단독 재생 조항이 애매한 곳은 피한다.
- 방송·블로그에서 받은 소리는 기준(이런 느낌)으로만 쓰고 앱에 넣지 않는다.
- 고음이 센 소리(스네어, 밝은 심벌)는 노트북·프로젝터 스피커에서 귀가 아프다. 낮은 북 계열로 고른다.
