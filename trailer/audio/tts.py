"""Narration: Supertonic 3 (sherpa-onnx) Korean TTS, one wav per line.

  python audio/tts.py <model_dir> <out_dir> [sid] [speed]
Lines live in audio/vo_lines.json.
"""
import json, sys, sherpa_onnx, soundfile as sf

d = sys.argv[1].rstrip('/') + '/'
out = sys.argv[2]
sid = int(sys.argv[3]) if len(sys.argv) > 3 else 7
lines = json.load(open('audio/vo_lines.json', encoding='utf-8'))
cfg = sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
            duration_predictor=d + 'duration_predictor.int8.onnx', text_encoder=d + 'text_encoder.int8.onnx',
            vector_estimator=d + 'vector_estimator.int8.onnx', vocoder=d + 'vocoder.int8.onnx',
            tts_json=d + 'tts.json', unicode_indexer=d + 'unicode_indexer.bin', voice_style=d + 'voice.bin'),
        num_threads=4, provider='cpu'),
    max_num_sentences=1)
tts = sherpa_onnx.OfflineTts(cfg)
for ln in lines:
    gc = sherpa_onnx.GenerationConfig()
    gc.sid = ln.get('sid', sid)
    gc.speed = ln.get('speed', 0.92)
    gc.num_steps = 32
    gc.extra = {'lang': 'ko'}
    a = tts.generate(ln['text'], gc)
    sf.write(f"{out}/{ln['id']}.wav", a.samples, a.sample_rate)
    print(ln['id'], f"{len(a.samples) / a.sample_rate:.2f}s", ln['text'])
