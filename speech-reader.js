// Uses browser/OS voices; no API key or server-side narration service.
(() => {
  let cleanup = () => {};
  const chunksFor = text => {
    const chunks = []; let rest = text.replace(/\s+/g," ").trim();
    while (rest.length) {
      let end = Math.min(240,rest.length);
      if (end < rest.length) {
        const boundary = rest.lastIndexOf(" ",end);
        if (boundary > 80) end = boundary;
      }
      chunks.push(rest.slice(0,end)); rest = rest.slice(end).trimStart();
    }
    return chunks;
  };
  window.quietSpeechChunks = chunksFor;
  window.stopSpeechReader = () => { cleanup(); cleanup = () => {}; };
  document.getElementById("article-dialog")?.addEventListener("close", window.stopSpeechReader);
  window.addEventListener("pagehide", window.stopSpeechReader);
  window.setupSpeechReader = (story, host, before) => {
    window.stopSpeechReader();
    const panel = document.createElement("section"); panel.className = "speech-reader"; panel.setAttribute("aria-label","Read article aloud");
    const heading = document.createElement("span"); heading.className = "speech-label"; heading.textContent = "Listen to this story"; panel.append(heading);
    const status = document.createElement("p"); status.className = "speech-status"; status.setAttribute("role","status");
    before.before(panel);
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      status.textContent = "Read aloud is unavailable in this browser. Try a current Chrome or Edge browser."; panel.append(status); return;
    }
    const synth = window.speechSynthesis;
    const controls = document.createElement("div"); controls.className = "speech-controls";
    function button(text) { const node = document.createElement("button"); node.type = "button"; node.textContent = text; controls.append(node); return node; }
    const play = button("▶ Listen"), pause = button("Pause"), stop = button("Stop");
    const voiceLabel = document.createElement("label"); voiceLabel.textContent = "Voice ";
    const voice = document.createElement("select"); voice.setAttribute("aria-label","Reading voice"); voiceLabel.append(voice);
    const rateLabel = document.createElement("label"); rateLabel.textContent = "Speed ";
    const rate = document.createElement("select"); rate.setAttribute("aria-label","Reading speed");
    [.75,1,1.25,1.5].forEach(value => { const option = document.createElement("option"); option.value = String(value); option.textContent = `${value}×`; rate.append(option); });
    rateLabel.append(rate); controls.append(voiceLabel,rateLabel); panel.append(controls,status);
    let savedVoice = "", savedRate = "1";
    try { savedVoice = localStorage.getItem("quiet-web-speech-voice") || ""; savedRate = localStorage.getItem("quiet-web-speech-rate") || "1"; } catch {}
    rate.value = [.75,1,1.25,1.5].includes(Number(savedRate)) ? savedRate : "1";
    let voices = [], state = "idle", generation = 0, disposed = false;
    const chunks = chunksFor([story.title,...story.body].join(". "));
    function update() { play.disabled = state !== "idle" || !chunks.length; pause.disabled = state === "idle"; stop.disabled = state === "idle"; pause.textContent = state === "paused" ? "Resume" : "Pause"; }
    function cancel(message = "Stopped. Press Listen to start again.") { generation++; synth.cancel(); state = "idle"; update(); status.textContent = message; }
    function loadVoices() {
      voices = synth.getVoices(); const selected = voice.value || savedVoice;
      voice.replaceChildren();
      const automatic = document.createElement("option"); automatic.value = ""; automatic.textContent = "Browser default"; voice.append(automatic);
      voices.forEach(item => { const option = document.createElement("option"); option.value = item.voiceURI; option.textContent = `${item.name} · ${item.lang}${item.localService ? " · on device" : " · online"}`; voice.append(option); });
      voice.value = voices.some(item => item.voiceURI === selected) ? selected : "";
    }
    play.onclick = () => {
      cancel(""); const token = generation; let index = 0;
      state = "playing"; update();
      const advance = () => {
        if (disposed || token !== generation) return;
        if (index >= chunks.length) { state = "idle"; update(); status.textContent = "Finished reading aloud."; return; }
        const utterance = new window.SpeechSynthesisUtterance(chunks[index]);
        const chosen = voices.find(item => item.voiceURI === voice.value);
        if (chosen) { utterance.voice = chosen; utterance.lang = chosen.lang; }
        utterance.rate = Number(rate.value);
        utterance.onend = () => { if (token !== generation || disposed) return; index++; advance(); };
        utterance.onerror = event => {
          if (token !== generation || disposed) return;
          cancel(event.error === "not-allowed" ? "Your browser blocked speech. Press Listen again to allow playback." : "Speech could not play. Choose another voice and try again.");
        };
        status.textContent = `Reading aloud · segment ${index+1} of ${chunks.length}`;
        synth.speak(utterance);
      };
      advance();
    };
    pause.onclick = () => { if (state === "paused") { synth.resume(); state = "playing"; status.textContent = "Reading resumed."; } else if (state === "playing") { synth.pause(); state = "paused"; status.textContent = "Reading paused."; } update(); };
    stop.onclick = () => cancel();
    voice.onchange = () => { savedVoice = voice.value; try { localStorage.setItem("quiet-web-speech-voice",savedVoice); } catch {} cancel("Voice changed. Press Listen to start."); };
    rate.onchange = () => { try { localStorage.setItem("quiet-web-speech-rate",rate.value); } catch {} cancel("Speed changed. Press Listen to start."); };
    synth.addEventListener("voiceschanged",loadVoices); loadVoices(); update();
    status.textContent = "Choose a voice and press Listen. Voices marked online may use your browser’s speech service.";
    cleanup = () => { disposed = true; generation++; synth.cancel(); synth.removeEventListener("voiceschanged",loadVoices); };
  };
})();
