// app/modules/audioHandler.js

let audio = null;
let onTimeUpdateCb, onEndedCb, onLoadedCb;

export function init(onTimeUpdate, onEnded, onLoaded) {
    audio = document.getElementById('audio-player');
    onTimeUpdateCb = onTimeUpdate;
    onEndedCb = onEnded;
    onLoadedCb = onLoaded;

    if (!audio) return;
    audio.addEventListener('timeupdate', () => {
        if (onTimeUpdateCb) onTimeUpdateCb(audio.currentTime, audio.duration);
    });
    audio.addEventListener('ended', () => {
        if (onEndedCb) onEndedCb();
    });
    audio.addEventListener('loadedmetadata', () => {
        if (onLoadedCb) onLoadedCb(audio.duration);
    });
}

export function loadAudio(url) {
    if (!audio) return;
    audio.src = url;
    audio.load();
}

export function play() {
    if (audio) audio.play();
}

export function pause() {
    if (audio) audio.pause();
}

export function isPlaying() {
    return audio && !audio.paused;
}

export function getCurrentTime() {
    return audio ? audio.currentTime : 0;
}

export function seek(time) {
    if (audio) {
        audio.currentTime = time;
    }
}

export function getDuration() {
    return audio && !isNaN(audio.duration) ? audio.duration : 0;
}

export function setVolume(volume) {
    if (audio) audio.volume = volume;
}

export function getVolume() {
    return audio ? audio.volume : 1;
}

export function resetPlayback() {
    if (audio) {
        audio.currentTime = 0;
        audio.pause();
    }
}

