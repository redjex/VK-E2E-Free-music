// music-player.js - Основной плеер с автозагрузкой треков
(function() {
    const audioManager = window.globalAudioManager;
    const visualizer = window.audioVisualizer;
    
    // DOM элементы
    const playlistContainer = document.getElementById('playlistContainer');
    const currentCover = document.getElementById('currentCover');
    const currentTitle = document.getElementById('currentTitle');
    const currentArtist = document.getElementById('currentArtist');
    const playBtn = document.getElementById('playBtn');
    const likeBtn = document.getElementById('likeBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const searchInput = document.getElementById('searchInput');
    const performSearch = document.getElementById('performSearch');
    const searchResults = document.getElementById('searchResults');
    const visualizerContainer = document.getElementById('visualizerContainer');
    const visualizerImage = document.getElementById('visualizerImage');
    const myTracksBtn = document.getElementById('myTracksBtn');
    const myTracksList = document.getElementById('myTracksList');
    const myTracksContainer = document.getElementById('myTracksContainer');
    
    // Данные
    let tracks = [];
    let myTracks = [];
    let isSearching = false;
    let isMyTracksVisible = false;
    let isPlayingFromMyTracks = false; // Флаг для отслеживания источника воспроизведения
    let isPlayingFromSearch = false; // Флаг для треков из поиска
    
    // VK API (требуется токен)
    const VK_API_VERSION = '5.131';
    const VK_ACCESS_TOKEN = localStorage.getItem('vk_token') || '';
    const USE_KATE_API = true;
    
    // Инициализация при загрузке
    window.addEventListener('DOMContentLoaded', () => {
        init();
    });
    
    async function init() {
        const state = audioManager.getState();
        
        if (state.tracks && state.tracks.length > 0) {
            tracks = state.tracks;
            shuffleBtn.disabled = false;
        }
        
        if (state.currentTrack) {
            updatePlayerUI(state);
        }
        
        setupEventListeners();
        setupAudioUpdates();
    }
    
    async function loadVKMix() {
        if (!VK_ACCESS_TOKEN) {
            alert('Нужен VK токен. Получите на vkhost.github.io');
            return false;
        }
        
        try {
            const url = `https://api.vk.com/method/audio.getRecommendations?access_token=${VK_ACCESS_TOKEN}&v=${VK_API_VERSION}&count=100`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
                console.error('VK API Error:', data.error);
                alert('Ошибка VK API: ' + data.error.error_msg);
                return false;
            }
            
            if (data.response && data.response.items && data.response.items.length > 0) {
                tracks = data.response.items
                    .filter(item => item.url && item.url.length > 0)
                    .map(item => ({
                        title: item.title,
                        artist: item.artist,
                        duration: item.duration,
                        url: item.url,
                        album: item.album || {},
                        id: item.id,
                        owner_id: item.owner_id
                    }));
                
                if (tracks.length === 0) {
                    alert('VK не вернул треки с URL. Нужен токен Kate Mobile с vkhost.github.io');
                    return false;
                }
                
                audioManager.setTracks(tracks);
                shuffleBtn.disabled = false;
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка загрузки VK Микса:', error);
            alert('Ошибка загрузки VK Микса. Проверьте токен.');
            return false;
        }
    }
    
    async function loadMyTracks() {
        if (!VK_ACCESS_TOKEN) {
            alert('Нужен VK токен. Получите на vkhost.github.io');
            return false;
        }
        
        try {
            const url = `https://api.vk.com/method/audio.get?access_token=${VK_ACCESS_TOKEN}&v=${VK_API_VERSION}&count=100`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
                console.error('VK API Error:', data.error);
                alert('Ошибка VK API: ' + data.error.error_msg);
                return false;
            }
            
            if (data.response && data.response.items && data.response.items.length > 0) {
                myTracks = data.response.items
                    .filter(item => item.url && item.url.length > 0)
                    .map(item => ({
                        title: item.title,
                        artist: item.artist,
                        duration: item.duration,
                        url: item.url,
                        album: item.album || {},
                        id: item.id,
                        owner_id: item.owner_id
                    }));
                
                if (myTracks.length === 0) {
                    alert('Не удалось загрузить ваши треки');
                    return false;
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка загрузки моих треков:', error);
            alert('Ошибка загрузки треков. Проверьте токен.');
            return false;
        }
    }
    
    // Проверка, есть ли трек в моих треках
    function isTrackLiked(track) {
        return myTracks.some(t => 
            t.title === track.title && 
            t.artist === track.artist
        );
    }
    
    // Добавление трека в мои треки
    async function addTrackToMyMusic(track) {
        if (!VK_ACCESS_TOKEN) {
            alert('Нужен VK токен');
            return false;
        }
        
        // Проверяем наличие ID
        if (!track.id || !track.owner_id) {
            // Пытаемся найти трек через поиск
            const foundTrack = await searchTrackForId(track);
            if (foundTrack) {
                track.id = foundTrack.id;
                track.owner_id = foundTrack.owner_id;
            } else {
                alert('Не удалось найти ID трека для добавления. Попробуйте найти его через поиск.');
                return false;
            }
        }
        
        try {
            likeBtn.disabled = true;
            
            const url = `https://api.vk.com/method/audio.add?access_token=${VK_ACCESS_TOKEN}&v=${VK_API_VERSION}&audio_id=${track.id}&owner_id=${track.owner_id}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.error_msg);
            }
            
            if (data.response) {
                // Добавляем трек в локальный массив
                myTracks.unshift(track);
                likeBtn.classList.add('liked');
                console.log('Трек добавлен в мои треки');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка добавления трека:', error);
            alert('Ошибка: ' + error.message);
            return false;
        } finally {
            likeBtn.disabled = false;
        }
    }
    
    // Поиск трека для получения ID
    async function searchTrackForId(track) {
        try {
            const query = `${track.artist} - ${track.title}`;
            const url = `https://api.vk.com/method/audio.search?access_token=${VK_ACCESS_TOKEN}&v=${VK_API_VERSION}&q=${encodeURIComponent(query)}&count=5`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.response && data.response.items && data.response.items.length > 0) {
                // Ищем точное совпадение
                const found = data.response.items.find(item => 
                    item.title.toLowerCase() === track.title.toLowerCase() &&
                    item.artist.toLowerCase() === track.artist.toLowerCase()
                );
                
                if (found) {
                    return {
                        id: found.id,
                        owner_id: found.owner_id
                    };
                }
                
                // Если точного совпадения нет, берем первый результат
                return {
                    id: data.response.items[0].id,
                    owner_id: data.response.items[0].owner_id
                };
            }
            
            return null;
        } catch (error) {
            console.error('Ошибка поиска ID трека:', error);
            return null;
        }
    }
    
    // Удаление трека из моих треков
    async function removeTrackFromMyMusic(track) {
        if (!VK_ACCESS_TOKEN) {
            alert('Нужен VK токен');
            return false;
        }
        
        if (!track.id || !track.owner_id) {
            alert('У этого трека нет ID для удаления');
            return false;
        }
        
        try {
            likeBtn.disabled = true;
            
            const url = `https://api.vk.com/method/audio.delete?access_token=${VK_ACCESS_TOKEN}&v=${VK_API_VERSION}&audio_id=${track.id}&owner_id=${track.owner_id}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.error_msg);
            }
            
            if (data.response === 1) {
                // Удаляем трек из локального массива
                myTracks = myTracks.filter(t => 
                    !(t.title === track.title && t.artist === track.artist)
                );
                likeBtn.classList.remove('liked');
                console.log('Трек удален из моих треков');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка удаления трека:', error);
            alert('Ошибка: ' + error.message);
            return false;
        } finally {
            likeBtn.disabled = false;
        }
    }
    
    async function toggleMyTracks() {
        if (!isMyTracksVisible) {
            if (myTracks.length === 0) {
                myTracksBtn.textContent = 'Загрузка...';
                myTracksBtn.disabled = true;
                const success = await loadMyTracks();
                myTracksBtn.textContent = 'Мои треки';
                myTracksBtn.disabled = false;
                if (!success) return;
            }

            visualizerContainer.classList.add('hidden');
            if (window.meshGradient) window.meshGradient.stop();

            renderMyTracks();
            myTracksList.classList.remove('hidden');
            myTracksBtn.classList.add('active');
            isMyTracksVisible = true;

        } else {
            myTracksList.classList.add('hidden');
            myTracksBtn.classList.remove('active');
            isMyTracksVisible = false;

            visualizerContainer.classList.remove('hidden');
            
            const state = audioManager.getState();
            
            // Всегда показываем play иконку при возврате из "Моих треков"
            visualizerImage.src = '../img/icons/aether_play_w.png';
            
            // Останавливаем музыку если она играла
            if (state.isPlaying) {
                audioManager.togglePlay();
            }
            
            // Останавливаем градиент
            if (window.meshGradient) {
                window.meshGradient.stop();
            }
        }
    }
    
    function renderMyTracks() {
        myTracksContainer.innerHTML = '';
        
        myTracks.forEach((track, index) => {
            const card = document.createElement('div');
            card.className = 'my-track-card';
            
            const cover = track.album?.thumb?.photo_135 || track.album?.thumb?.photo_68 || '';
            
            card.innerHTML = `
                ${cover ? `<img src="${cover}" alt="Cover" class="my-track-card-cover">` : '<div class="my-track-card-cover"></div>'}
                <div class="my-track-card-info">
                    <div class="my-track-card-title">${track.title}</div>
                    <div class="my-track-card-artist">${track.artist}</div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                audioManager.setTracks(myTracks);
                audioManager.playTrack(track, index);
                isPlayingFromMyTracks = true; // Устанавливаем флаг
                
                // Для треков из "Моих треков" всегда показываем play иконку
                if (visualizerImage) {
                    visualizerImage.src = '../img/icons/aether_play_w.png';
                }
                
                updateMyTracksUI(index);
            });
            
            myTracksContainer.appendChild(card);
        });
        
        const state = audioManager.getState();
        if (state.currentTrack) {
            const currentIndex = myTracks.findIndex(t => 
                t.title === state.currentTrack.title && 
                t.artist === state.currentTrack.artist
            );
            if (currentIndex !== -1) {
                updateMyTracksUI(currentIndex);
            }
        }
    }
    
    function updateMyTracksUI(playingIndex) {
        const cards = myTracksContainer.querySelectorAll('.my-track-card');
        cards.forEach((card, i) => {
            if (i === playingIndex) {
                card.classList.add('playing');
            } else {
                card.classList.remove('playing');
            }
        });
    }
    
    async function performSearchAction() {
        const query = searchInput.value.trim();
        if (!query || isSearching) return;
        
        if (!VK_ACCESS_TOKEN) {
            alert('Нужен VK токен для поиска');
            return;
        }
        
        isSearching = true;
        performSearch.disabled = true;
        performSearch.textContent = 'Поиск...';
        
        try {
            const url = `https://api.vk.com/method/audio.search?access_token=${VK_ACCESS_TOKEN}&v=${VK_API_VERSION}&q=${encodeURIComponent(query)}&count=20`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.error_msg);
            }
            
            if (data.response && data.response.items && data.response.items.length > 0) {
                const searchTracks = data.response.items
                    .filter(item => item.url && item.url.length > 0)
                    .map(item => ({
                        title: item.title,
                        artist: item.artist,
                        duration: item.duration,
                        url: item.url,
                        album: item.album || {},
                        id: item.id,
                        owner_id: item.owner_id
                    }));
                
                displaySearchResults(searchTracks);
            } else {
                displaySearchResults([]);
            }
            
        } catch (error) {
            console.error('Ошибка поиска:', error);
            searchResults.innerHTML = '<div class="search-message">Ошибка поиска</div>';
            searchResults.classList.remove('hidden');
        } finally {
            isSearching = false;
            performSearch.disabled = false;
            performSearch.textContent = 'Найти';
        }
    }
    
    function displaySearchResults(searchTracks) {
        searchResults.innerHTML = '';
        
        if (searchTracks.length === 0) {
            searchResults.innerHTML = '<div class="search-message">Ничего не найдено</div>';
        } else {
            searchTracks.forEach((track, index) => {
                const item = document.createElement('div');
                item.className = 'track-item';
                
                const cover = track.album?.thumb?.photo_135 || track.album?.thumb?.photo_68 || '';
                const duration = formatTime(track.duration);
                
                item.innerHTML = `
                    ${cover ? `<img src="${cover}" alt="Cover" class="track-cover">` : '<div class="track-cover"></div>'}
                    <div class="track-details">
                        <div class="track-name">${track.title}</div>
                        <div class="track-artist">${track.artist}</div>
                    </div>
                    <div class="track-duration">${duration}</div>
                `;
                
                item.addEventListener('click', () => {
                    audioManager.setTracks(searchTracks);
                    audioManager.playTrack(track, index);
                    tracks = searchTracks;
                    isPlayingFromMyTracks = false; // Сбрасываем флаг
                    isPlayingFromSearch = true; // Устанавливаем флаг поиска
                    shuffleBtn.disabled = false;
                    searchResults.classList.add('hidden');
                    
                    // Для треков из поиска показываем play иконку
                    if (visualizerImage) {
                        visualizerImage.src = '../img/icons/aether_play_w.png';
                    }
                });
                
                searchResults.appendChild(item);
            });
        }
        
        searchResults.classList.remove('hidden');
    }
    
    function setupEventListeners() {
        // Нажатие на картинку - управление воспроизведением
        visualizerImage.addEventListener('click', async () => {
            const state = audioManager.getState();
            
            if (!state.currentTrack) {
                // Нет трека - загружаем VK Микс
                visualizerImage.classList.add('loading');
                const success = await loadVKMix();
                visualizerImage.classList.remove('loading');
                
                if (success && tracks.length > 0) {
                    audioManager.playTrack(tracks[0], 0);
                    isPlayingFromMyTracks = false;
                    isPlayingFromSearch = false;
                }
            } else if (isPlayingFromMyTracks || isPlayingFromSearch) {
                // Трек из "Моих треков" или поиска - загружаем VK Микс
                visualizerImage.classList.add('loading');
                const success = await loadVKMix();
                visualizerImage.classList.remove('loading');
                
                if (success && tracks.length > 0) {
                    audioManager.playTrack(tracks[0], 0);
                    isPlayingFromMyTracks = false;
                    isPlayingFromSearch = false;
                }
            } else {
                // VK Микс - обычный toggle
                audioManager.togglePlay();
            }
        });
        
        playBtn.addEventListener('click', () => {
            audioManager.togglePlay();
        });
        
        // Кнопка лайка
        likeBtn.addEventListener('click', async () => {
            const state = audioManager.getState();
            if (!state.currentTrack) return;
            
            const track = state.currentTrack;
            
            if (isTrackLiked(track)) {
                // Убираем из избранного
                await removeTrackFromMyMusic(track);
            } else {
                // Добавляем в избранное
                await addTrackToMyMusic(track);
            }
        });
        
        prevBtn.addEventListener('click', () => {
            audioManager.playPrevious();
        });
        
        nextBtn.addEventListener('click', () => {
            audioManager.playNext();
        });
        
        shuffleBtn.addEventListener('click', () => {
            if (tracks.length > 0) {
                const shuffled = shuffleArray(tracks);
                tracks = shuffled;
                audioManager.setTracks(shuffled);
                
                if (audioManager.currentTrack) {
                    const newIndex = shuffled.findIndex(t => 
                        t.title === audioManager.currentTrack.title && 
                        t.artist === audioManager.currentTrack.artist
                    );
                    audioManager.currentTrackIndex = newIndex;
                    audioManager.saveState();
                }
                
                alert('Плейлист перемешан!');
            }
        });
        
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const state = audioManager.getState();
            
            if (state.duration) {
                const newTime = percent * state.duration;
                audioManager.seek(newTime);
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearchAction();
            }
        });
        
        performSearch.addEventListener('click', () => {
            performSearchAction();
        });
        
        myTracksBtn.addEventListener('click', () => {
            toggleMyTracks();
        });
        
        const volumeBtn = document.getElementById('volumeBtn');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeSliderContainer = document.getElementById('volumeSliderContainer');
        const volumePercentage = document.getElementById('volumePercentage');
        const volumeIcon = document.getElementById('volumeIcon');
        const volumeMuteIcon = document.getElementById('volumeMuteIcon');
        
        const savedVolume = localStorage.getItem('player_volume') || '100';
        volumeSlider.value = savedVolume;
        updateVolume(parseInt(savedVolume));
        
        volumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            volumeSliderContainer.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!volumeSliderContainer.contains(e.target) && !volumeBtn.contains(e.target)) {
                volumeSliderContainer.classList.remove('show');
            }
        });
        
        volumeBtn.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const currentVolume = parseInt(volumeSlider.value);
            if (currentVolume > 0) {
                localStorage.setItem('player_volume_before_mute', currentVolume);
                volumeSlider.value = 0;
                updateVolume(0);
            } else {
                const beforeMute = localStorage.getItem('player_volume_before_mute') || '100';
                volumeSlider.value = beforeMute;
                updateVolume(parseInt(beforeMute));
            }
        });
        
        volumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            updateVolume(volume);
            localStorage.setItem('player_volume', volume);
        });
        
        function updateVolume(volume) {
            volumePercentage.textContent = volume + '%';
            
            if (volume === 0) {
                volumeIcon.style.display = 'none';
                volumeMuteIcon.style.display = 'block';
            } else {
                volumeIcon.style.display = 'block';
                volumeMuteIcon.style.display = 'none';
            }
            
            if (audioManager.audio) {
                audioManager.audio.volume = volume / 100;
            }
        }
        
        document.addEventListener('click', (e) => {
            if (!searchResults.contains(e.target) && 
                !searchInput.contains(e.target) && 
                !performSearch.contains(e.target)) {
                searchResults.classList.add('hidden');
            }
        });
    }
    
    function setupAudioUpdates() {
        window.addEventListener('audioStateChanged', (e) => {
            updatePlayerUI(e.detail);
        });
        
        setInterval(() => {
            const state = audioManager.getState();
            if (state.isPlaying) {
                updateProgress(state);
            }
        }, 100);
    }
    
    function updatePlayerUI(state) {
        if (!state.currentTrack) return;
        
        const track = state.currentTrack;
        const meshGradient = window.meshGradient;
        
        const cover = track.album?.thumb?.photo_135 || track.album?.thumb?.photo_68 || '';
        if (cover) {
            currentCover.src = cover;
            currentCover.style.display = 'block';
        } else {
            currentCover.style.display = 'none';
        }
        
        currentTitle.textContent = track.title;
        currentArtist.textContent = track.artist;
        
        // Обновляем состояние кнопки лайка
        if (likeBtn) {
            if (isTrackLiked(track)) {
                likeBtn.classList.add('liked');
            } else {
                likeBtn.classList.remove('liked');
            }
        }
        
        if (state.isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            
            if (visualizerImage) {
                // Если трек из "Моих треков" или поиска - оставляем play иконку
                // Если из VK Микса - показываем stop иконку
                if (isPlayingFromMyTracks || isPlayingFromSearch) {
                    visualizerImage.src = '../img/icons/aether_play_w.png';
                } else {
                    visualizerImage.src = '../img/icons/aether_stop_w.png';
                }
            }
            
            if (!isMyTracksVisible) {
                visualizerContainer.classList.remove('hidden');
                
                if (meshGradient) {
                    meshGradient.start(track.title, track.artist);
                }
            }
            
            if (audioManager.audio && visualizer) {
                visualizer.connectAudio(audioManager.audio);
            }
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            
            if (visualizerImage) {
                // Всегда показываем play иконку при паузе
                visualizerImage.src = '../img/icons/aether_play_w.png';
            }
            
            // НЕ ОСТАНАВЛИВАЕМ градиент при паузе, только если трек есть
            if (track && meshGradient && !isMyTracksVisible) {
                // Градиент продолжает работать
                if (!meshGradient.isRunning) {
                    meshGradient.start(track.title, track.artist);
                }
            }
            
            if (visualizer) {
                visualizer.disconnect();
            }
        }
        
        updateActiveTrack(state.currentTrackIndex);
    }
    
    function updateProgress(state) {
        if (state.duration) {
            const percent = (state.currentTime / state.duration) * 100;
            progressFill.style.width = percent + '%';
            currentTimeEl.textContent = formatTime(state.currentTime);
            totalTimeEl.textContent = formatTime(state.duration);
        }
    }
    
    function updateActiveTrack(index) {
        const trackItems = document.querySelectorAll('.track-item');
        trackItems.forEach((item, i) => {
            if (i === index) {
                item.classList.add('playing');
            } else {
                item.classList.remove('playing');
            }
        });
    }
    
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
    
    function injectSearchStyles() {
        if (document.getElementById('search-results-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'search-results-styles';
        style.textContent = `
            .search-results {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                margin-top: 10px;
                background: rgba(32, 32, 32, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 15px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                max-height: 400px;
                overflow-y: auto;
                z-index: 10020;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                padding-right: 15px;
            }
            
            .search-results.hidden {
                display: none;
            }
            
            .search-message {
                padding: 20px;
                text-align: center;
                color: #999;
                font-family: "Special Gothic Expanded One", sans-serif;
            }
        `;
        document.head.appendChild(style);
    }
    
    injectSearchStyles();
})();
