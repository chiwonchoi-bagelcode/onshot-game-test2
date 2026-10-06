# 《와장창 냥이》 트레일러

**결과물:** [`release/wajangchang-nyangi-trailer-1080p.mp4`](release/wajangchang-nyangi-trailer-1080p.mp4)
1920×1080 · 30 fps · 76.9초 · H.264 High (BT.709) + AAC 256 kbps · −14 LUFS · 48 MB  ·  포스터: [`release/poster.jpg`](release/poster.jpg)

> 평화로운 오후. 그리고 고양이는… 툭.
> 손가락 하나로 시작된 장난이 온 집안 대참사로 번지고, 집사가 돌아오면 — 냥? (난 아무것도 몰라요)

이 폴더는 원본 게임과 분리된 **트레일러 전용 작업 공간**입니다. 게임 코드(`../src`)를 읽기 전용으로
import 해서 실제 스테이지를 실제 물리로 돌리고, 트레일러용 카메라·연출·오버레이만 따로 얹어
프레임 단위로 렌더링합니다. 원본 게임 코드·자산·규칙·저장 데이터는 건드리지 않습니다.

---

## 구성 (타임코드)

| 시간 | 장면 | 실제 게임 근거 |
|---|---|---|
| 0:00–0:13.5 | **훅** — 1-1 거실. 평화로운 디오라마 → 화면을 노려보는 치즈냥 → 꽃병 스냅 줌 → 손가락 드래그 + "툭." → 책 도미노가 꽃병을 밀어 슬로모션 낙하, 와장창 → "후훗…" | 1-1 「첫 번째 장난」, 실제 해법(책 도미노) |
| 0:13.5–0:20 | **힘 조절** — 2-1 식탁보. "세게?" 확 당기면 식탁보만 휘릭(마술), "살살?" 살살 당기면 저녁상이 통째로 쏟아짐 | 2-1 「식탁보의 마술」, 실제 power 1.0 / 0.36 |
| 0:20–0:38 | **몽타주** — 흔든 탄산음료 로켓 → 선반 → TV(1-2), 블록 성 밑돌 하나 → 성 붕괴 슬로모션(5-1), 풍선 → 진열장 보물(5-2), 수조 → 복도 물바다(6-3), 로봇청소기·깜짝 상자·욕조 폰 퀵컷(1-4, 5-3, 4-1) | 각 스테이지의 검증된 해법 |
| 0:38.5–1:06.9 | **피날레** — 6-5 온 집안. 아이방 도미노 → 탄산 로켓이 벽을 넘어 주방 혼수 그릇 선반 → 옷걸이 → 괘종시계 "댕-!" → 수조 → 복도 물바다 → 스탠드 → 새 TV. 폐허가 된 집 전경 → 철컥, 여행에서 돌아온 집사 "여행 다녀왔더니… 집이… 우리 집이…!!" → "냥? (난 아무것도 몰라요)" | 6-5 「와장창 대참사」 3★ 해법, 게임의 실제 엔딩 연출(집사 등장·고양이 시치미) |
| 1:06.9–1:12.5 | **타이틀** — 9마리 고양이 단체 사진 + 게임 로고 "와장창 냥이" + "툭, 한 번이면 충분하다냥." | 게임에 구현된 9종 고양이·액세서리 |
| 1:12.5–1:16.9 | **스팅어** — 탁자 위 치즈냥이 카메라를 보며 머그컵을 툭… 쨍그랑과 동시에 암전 | 1-1 머그컵, 실제 swat |

내레이션(한국어, 다큐멘터리 톤): 「평화로운 오후.」 「그리고 고양이는.」 「호기심이 아주 많은 동물이죠.」
「오늘은, 집사가 여행에서 돌아오는 날.」 「범인은, 아직 잡히지 않았습니다.」 「와장창… 냥이.」

### 실제 게임 vs 트레일러 연출

- **실제 게임 그대로:** 모든 스테이지·물체·고양이·물리 결과, 고양이의 swat(`game.swat`), 조준 화살표,
  연쇄 카운터·팝 단어(쨍그랑!, 와장창! …)·피해액, 고양이/집사 말풍선 대사(게임에 있는 대사),
  집사 귀가와 고양이 시치미 엔딩, 효과음(게임의 WebAudio 신스가 낸 소리를 그대로 재생).
- **트레일러 전용:** 시네마 카메라와 컷, 슬로모션/스피드 램프, 화면 문구("툭.", "세게?", "살살?"),
  타이틀 카드와 고양이 단체 사진, 손가락 제스처 표시(게임의 드래그 입력을 시각화), 컷 사이의
  고양이 위치 이동(피날레에서 방을 옮겨 다닐 때), 표정 연기(게임 리그의 눈 찡그림 값을 사용),
  음악·내레이션·추가 사운드 디자인.
  구현되지 않은 기능은 보여주지 않습니다.

---

## 다시 만들기

### 준비물

- Node 22+, 저장소 루트에서 `npm install` (Playwright 포함, Chromium은 `PLAYWRIGHT_BROWSERS_PATH`에 설치된 것을 사용)
- ffmpeg (libx264, aac), sox(선택: 스펙트로그램 확인용)
- FluidSynth + **MuseScore General** SoundFont (`/usr/share/sounds/sf2/MuseScore_General_Full.sf2`, 경로는 `SF2=` 로 변경 가능)
- Python 3.11 + `numpy scipy soundfile mido` (내레이션을 다시 합성할 때만 `sherpa-onnx`)

### 실행

```sh
cd trailer
npx vite --config vite.config.ts &          # 트레일러 페이지 (http://localhost:5300)
PREVIEW=1 sh render/all.sh                  # 480×270·15 fps 미리보기 → out/preview.mp4 (수 분)
sh render/all.sh                            # 1920×1080·30 fps 최종본 → release/…-1080p.mp4 (약 40분, CPU 렌더)
```

`render/all.sh` 의 단계:

1. `render/capture.mjs --edl` — 헤드리스 Chromium(swiftshader)에서 샷마다 스테이지를 로드하고 1/60초 고정
   서브스텝으로 시뮬레이션하며 프레임을 ffmpeg로 바로 인코딩. 편집에 쓰이는 구간만 그리므로 결과는 같고 더 빠릅니다.
   샷마다 `*.sounds.json`(게임이 낸 모든 소리 호출과 시각), `*.events.json`(팝 단어·연쇄 시각)도 남깁니다.
2. `render/edit.mjs` — `edit/timeline.json`(EDL)대로 프레임 단위 컷 편집.
3. `render/sfx.mjs` — 기록된 소리 호출을 게임의 `Sfx`로 OfflineAudioContext에서 재생해 샷별 스템 생성
   (+ `audio/cues.json`의 수동 배치 게임 사운드: 열쇠, 놀람, 골골송, 타이틀 야옹 코러스 등).
4. `audio/music.py` → `audio/render_music.sh` — 그림에 맞춰 쓴 오리지널 스코어(120 BPM, 몽타주 컷이 박자에 정확히 떨어짐)를 MIDI로 생성해 FluidSynth로 렌더.
5. `audio/design.py` — 룸톤·새소리·벽시계·휘익·서브 붐·물 쏟아짐·현관문·타이틀 라이저 합성.
6. `audio/mix.py` → `render/master.sh` → `render/deliver.sh` — 내레이션 덕킹, 버스 컴프, −14 LUFS/−1.5 dBTP 마스터, 먹스, 배포용 인코딩.

### 편집·연출 손보기

- 샷: `src/acts/a1_living.ts`(훅), `a2_montage.ts`, `a3_finale.ts`, `a4_title.ts`(퀵컷·타이틀·스팅어). 카메라는
  키프레임 경로(`camera.ts`의 `path`)와 `cuts`, 추적 카메라(`follow`)로 구성됩니다.
- 컷 길이·내레이션 위치·음악 볼륨 오토메이션: `edit/timeline.json`.
- 특정 순간 확인: `node render/still.mjs G_finale 25.0` → `out/stills/`.
- 주요 사건의 전체 타임코드: `node render/beats.mjs out/clips out/clips/picture.marks.json`.

### 내레이션

`audio/vo/*.wav` 가 마스터 테이크입니다(n2는 편집에서 제외). 다시 합성하려면 sherpa-onnx 릴리스의
`sherpa-onnx-supertonic-3-tts-int8-2026-05-11`(Supertonic 3, 한국어) 모델을 받아:

```sh
python audio/tts.py <모델 폴더> audio/vo 9      # speaker 9: 낮고 차분한 남성 내레이터
```

합성은 매번 조금씩 달라서, 여러 테이크 중 피치(약 88 Hz)와 음성인식(SenseVoice) 결과가 맞는 것을 골랐습니다.

---

## 크레딧 · 라이선스

- 게임 화면·모델·물리·효과음: 이 저장소의 《와장창 냥이》(모든 자산은 코드로 생성)
- 글꼴: **Jua**, **Black Han Sans** — SIL Open Font License 1.1 (`assets/fonts/OFL-*.txt`)
- 음악: 오리지널 작곡(`audio/music.py`), 음원 **MuseScore General** SoundFont — MIT License
- 내레이션: **Supertonic 3** (Supertone) — 코드 MIT, 모델 OpenRAIL-M / 실행: **sherpa-onnx** — Apache-2.0
- 렌더링: three.js (MIT), Rapier (Apache-2.0), Playwright (Apache-2.0), FFmpeg, FluidSynth (LGPL-2.1)
