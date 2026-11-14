"""Voices an episode's narration with Kokoro, locally: English (af_heart) and Spanish (ef_dora).

    .venv/bin/python lib/narrate.py episodes/01-in-3-minutes

Reads episode.json; for every scene with narration writes, per language,
build/<episode>/audio/<lang>/<scene>.wav and one timings file,
build/<episode>/audio/<lang>/timings.json:

    {"<scene>": {"duration": 7.42, "sentences": [{"text": "...", "start": 0.0, "end": 3.1}, ...]}}

Each sentence is voiced on its own and joined with a short pause, so the subtitles carry exact
times. A sentence already voiced with the same text is reused (a script change re-voices only
what changed).
"""
import hashlib, json, os, re, sys, warnings

warnings.filterwarnings("ignore")
import numpy as np
import soundfile as sf

SR = 24000
PAUSE = 0.32  # seconds between sentences
VOICES = {"en": ("a", "af_heart"), "es": ("e", "ef_dora")}
_pipes = {}

# Words Kokoro reads better spelled the way they sound (the subtitles keep the real spelling).
SAY_AS = {
    "en": {"YAML": "yamel", "modux.mateu.io": "modux dot mah teh oo dot io", "ai-complete": "A I complete",
           "CRUD": "crud", "UI": "U I", "API": "A P I", "APIs": "A P Is", "REST": "rest", "MIT": "M I T",
           "Kubernetes": "Kubernetes", "e2e": "end to end", "ISBN": "I S B N", "CI": "C I"},
    "es": {"YAML": "yamel", "modux.mateu.io": "modux punto mateu punto io", "ai-complete": "ei ai complit",
           "CRUD": "crud", "UI": "u i", "API": "a pe i", "APIs": "ápis", "REST": "rest", "MIT": "eme i te",
           "Docker": "dóquer", "Kafka": "cafca", "Kubernetes": "cubernetes", "outbox": "áutbox",
           "gateway": "gueitwey", "e2e": "de extremo a extremo", "Maven": "méiven", "Spring Boot": "spring but",
           "ISBN": "i ese be ene", "CI": "ce i"},
}


def pipe(lang):
    code, _ = VOICES[lang]
    if code not in _pipes:
        from kokoro import KPipeline
        _pipes[code] = KPipeline(lang_code=code, repo_id="hexgrad/Kokoro-82M")
    return _pipes[code]


def spoken(lang, text):
    out = text
    for word, said in sorted(SAY_AS[lang].items(), key=lambda kv: -len(kv[0])):
        out = re.sub(r"(?<![\w.-])" + re.escape(word) + r"(?![\w-])", said, out)
    return out.replace("`", "")


def voice(lang, text, cache_dir):
    key = hashlib.sha1(f"{lang}|{VOICES[lang][1]}|{spoken(lang, text)}".encode()).hexdigest()[:16]
    path = os.path.join(cache_dir, key + ".npy")
    if os.path.exists(path):
        return np.load(path)
    chunks = [a for _, _, a in pipe(lang)(spoken(lang, text), voice=VOICES[lang][1], speed=1.0)]
    audio = np.concatenate([c.numpy() if hasattr(c, "numpy") else np.asarray(c) for c in chunks]).astype(np.float32)
    np.save(path, audio)
    return audio


def sentences(text):
    parts = re.split(r"(?<=[.?!…])\s+(?=[A-ZÁÉÍÓÚÑ¿¡\"«`])", text.strip())
    return [p.strip() for p in parts if p.strip()]


def main(ep_dir):
    episode = json.load(open(os.path.join(ep_dir, "episode.json")))
    name = os.path.basename(os.path.normpath(ep_dir))
    root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "build", name, "audio")
    for lang in ("en", "es"):
        out_dir = os.path.join(root, lang)
        cache = os.path.join(root, "cache")
        os.makedirs(out_dir, exist_ok=True)
        os.makedirs(cache, exist_ok=True)
        timings = {}
        for scene in episode["scenes"]:
            text = (scene.get("narration") or {}).get(lang)
            if not text:
                continue
            pieces, cues, t = [], [], 0.0
            for s in sentences(text):
                a = voice(lang, s, cache)
                cues.append({"text": s, "start": round(t, 3), "end": round(t + len(a) / SR, 3)})
                pieces += [a, np.zeros(int(PAUSE * SR), dtype=np.float32)]
                t += len(a) / SR + PAUSE
            audio = np.concatenate(pieces[:-1])
            sf.write(os.path.join(out_dir, scene["id"] + ".wav"), audio, SR)
            timings[scene["id"]] = {"duration": round(len(audio) / SR, 3), "sentences": cues}
            print(f"{lang} {scene['id']:<14} {len(audio) / SR:6.2f}s  {len(text.split())} words")
        json.dump(timings, open(os.path.join(out_dir, "timings.json"), "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1])
