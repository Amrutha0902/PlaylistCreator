const state = {
    playlistName: '',
    tracks: []
};

const q = document.getElementById('q');
const limitSel = document.getElementById('limit');
const resultsInfo = document.getElementById('resultsInfo');
const resultsEl = document.getElementById('results');
const playlistEl = document.getElementById('playlist');
const player = document.getElementById('player');
const trackCount = document.getElementById('trackCount');
const totalTimeEl = document.getElementById('totalTime');
const plistName = document.getElementById('plistName');
const status = document.getElementById('status');

function fmtMs(ms) {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function setStatus(msg) {
    status.textContent = msg;
    setTimeout(() => status.textContent = 'Ready', 2000);
}

function save() {
    localStorage.setItem('playlist', JSON.stringify(state));
    setStatus('Saved');
}

function load() {
    const raw = localStorage.getItem('playlist');
    if (!raw) return;
    Object.assign(state, JSON.parse(raw));
    plistName.value = state.playlistName;
    renderPlaylist();
}

async function search(term) {
    resultsEl.innerHTML = '';
    resultsInfo.textContent = 'Searching…';
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${limitSel.value}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        resultsInfo.textContent = `Found ${data.results.length} tracks`;
        data.results.forEach(renderResult);
    } catch (e) {
        resultsInfo.textContent = 'Error fetching results';
    }
}

function renderResult(item) {
    const tpl = document.getElementById('trackTpl');
    const t = tpl.content.firstElementChild.cloneNode(true);
    t.querySelector('img').src = item.artworkUrl100;
    t.querySelector('.title').textContent = item.trackName;
    t.querySelector('.artist').textContent = item.artistName;

    const ctr = t.querySelector('.controls');
    const playBtn = document.createElement('button');
    playBtn.className = 'btn';
    playBtn.textContent = '▶';
    playBtn.onclick = () => {
        player.src = item.previewUrl;
        player.play();
    };

    const addBtn = document.createElement('button');
    addBtn.className = 'btn primary';
    addBtn.textContent = 'Add';
    addBtn.onclick = () => {
        if (state.tracks.some(x => x.trackId === item.trackId)) return;
        state.tracks.push({
            trackId: item.trackId,
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName,
            art: item.artworkUrl100,
            duration: item.trackTimeMillis,
            previewUrl: item.previewUrl
        });
        renderPlaylist();
        save();
    };

    ctr.append(playBtn, addBtn);
    resultsEl.appendChild(t);
}

// Drag placeholder element
const placeholder = document.createElement('div');
placeholder.className = 'placeholder';

function renderPlaylist() {
    playlistEl.innerHTML = '';
    state.tracks.forEach((track, idx) => {
        const tpl = document.getElementById('trackTpl');
        const t = tpl.content.firstElementChild.cloneNode(true);
        t.querySelector('img').src = track.art;
        t.querySelector('.title').textContent = track.title;
        t.querySelector('.artist').textContent = track.artist;

        // set draggable attributes
        t.dataset.index = idx;
        t.draggable = true;

        // drag events
        t.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', idx);
            t.classList.add('dragging');
            playlistEl.insertBefore(placeholder, t.nextSibling);
        });
        t.addEventListener('dragend', () => {
            t.classList.remove('dragging');
            placeholder.remove();
        });
        t.addEventListener('dragover', e => {
            e.preventDefault();
            const rect = t.getBoundingClientRect();
            const offset = e.clientY - rect.top;
            if (offset > rect.height / 2) {
                playlistEl.insertBefore(placeholder, t.nextSibling);
            } else {
                playlistEl.insertBefore(placeholder, t);
            }
        });
        t.addEventListener('drop', e => {
            e.preventDefault();
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            let toIdx = [...playlistEl.children].indexOf(placeholder);
            if (toIdx > fromIdx) toIdx--; // adjust if moving down

            const moved = state.tracks.splice(fromIdx, 1)[0];
            state.tracks.splice(toIdx, 0, moved);
            renderPlaylist();
            save();
        });

        const ctr = t.querySelector('.controls');
        const playBtn = document.createElement('button');
        playBtn.className = 'btn';
        playBtn.textContent = '▶';
        playBtn.onclick = () => {
            player.src = track.previewUrl;
            player.play();
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'btn danger';
        delBtn.textContent = 'Remove';
        delBtn.onclick = () => {
            state.tracks = state.tracks.filter(x => x.trackId !== track.trackId);
            renderPlaylist();
            save();
        };

        ctr.append(playBtn, delBtn);
        playlistEl.appendChild(t);
    });
    trackCount.textContent = state.tracks.length;
    totalTimeEl.textContent = fmtMs(state.tracks.reduce((s, t) => s + (t.duration || 0), 0));
}

document.getElementById('searchBtn').onclick = () => {
    if (q.value) search(q.value);
};
q.addEventListener('keydown', e => {
    if (e.key === 'Enter' && q.value) search(q.value);
});

document.getElementById('saveBtn').onclick = () => {
    state.playlistName = plistName.value;
    save();
};
document.getElementById('exportJsonBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(state)], {
        type: 'application/json'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.playlistName || 'playlist') + '.json';
    a.click();
};
document.getElementById('importJson').onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        Object.assign(state, JSON.parse(reader.result));
        renderPlaylist();
        save();
    };
    reader.readAsText(file);
};
document.getElementById('clearAllBtn').onclick = () => {
    localStorage.removeItem('playlist');
    state.tracks = [];
    renderPlaylist();
};

load();