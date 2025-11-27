// music-player.js
let accessToken = null;
let tracks = [];
let currentTrackIndex = -1;
let isPlaying = false;
let currentAudio = null;

// DOM Elements
let trackList, shuffleBtn, playBtn, prevBtn, nextBtn;
let currentCover, currentTitle, currentArtist;
let progressBar, progressFill, currentTimeEl, totalTimeEl;
let playIcon, pauseIcon;
let searchInput, performSearchBtn;

// Инициализация
window.addEventListener('DOMContentLoaded', async () => {
    // Получаем токен
    accessToken = localStorage.getItem('vk_token') || await window.tokenAPI.loadToken();

    if (!accessToken) {
        showError('Токен не найден. Возврат на страницу авторизации...');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
        return;
    }

    // Инициализируем элементы DOM
    initDOMElements();
    
    // Загружаем треки
    await loadRecommendedTracks();
    
    // Настраиваем обработчики
    setupEventListeners();
});

function initDOMElements() {
    trackList = document.getElementById('trackList');
    shuffleBtn = document.getElementById('shuffleBtn');
    playBtn = document.getElementById('playBtn');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    
    currentCover = document.getElementById('currentCover');
    currentTitle = document.getElementById('currentTitle');
    currentArtist = document.getElementById('currentArtist');
    
    progressBar = document.getElementById('progressBar');
    progressFill = document.getElementById('progressFill');
    currentTimeEl = document.getElementById('currentTime');
    totalTimeEl = document.getElementById('totalTime');
    
    playIcon = document.getElementById('playIcon');
    pauseIcon = document.getElementById('pauseIcon');

    searchInput = document.getElementById('searchInput');
    performSearchBtn = document.getElementById('performSearch');
}

function setupEventListeners() {
    // Кнопка Shuffle
    shuffleBtn.addEventListener('click', shuffleTracks);
    
    // Кнопки управления плеером
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    
    // Прогресс-бар
    progressBar.addEventListener('click', seekTrack);

    // Поиск треков
    if (performSearchBtn) {
        performSearchBtn.addEventListener('click', async () => {
            const query = searchInput.value.trim();
            if (query) {
                await searchTracks(query);
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    await searchTracks(query);
                }
            }
        });
    }
}

// Загрузка рекомендованных треков из VK
async function loadRecommendedTracks() {
    try {
        showLoading('Загрузка треков...');
        
        // Используем метод audio.getRecommendations для получения рекомендаций
        const response = await fetch('https://api.vk.com/method/audio.getRecommendations?v=5.131&count=50', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'KateMobileAndroid/99 lite-999 (Android 13; SDK 33; arm64-v8a; VK; ru)'
            },
            body: new URLSearchParams({ access_token: accessToken })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.error_msg || 'Ошибка при загрузке треков');
        }

        if (data.response && data.response.items) {
            tracks = data.response.items.filter(track => track.url); // Фильтруем треки с URL
            
            if (tracks.length === 0) {
                showError('Не удалось загрузить треки. Попробуйте позже.');
                return;
            }
            
            renderTracks();
            hideLoading();
        } else {
            showError('Не удалось получить рекомендации. Проверьте токен.');
        }
    } catch (error) {
        console.error('Ошибка загрузки треков:', error);
        showError('Ошибка загрузки треков: ' + error.message);
    }
}

// Отображение треков в плейлисте
function renderTracks() {
    trackList.innerHTML = '';
    
    tracks.forEach((track, index) => {
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';
        trackItem.dataset.index = index;
        
        const cover = track.album?.thumb?.photo_135 || track.album?.thumb?.photo_68 || '';
        const duration = formatTime(track.duration);
        
        trackItem.innerHTML = `
            <img class="track-cover" src="${cover || ''}" alt="Cover" onerror="this.style.display='none'">
            <div class="track-details">
                <div class="track-name">${escapeHtml(track.title)}</div>
                <div class="track-artist">${escapeHtml(track.artist)}</div>
            </div>
            <div class="track-duration">${duration}</div>
        `;
        
        trackItem.addEventListener('click', () => playTrack(index));
        trackList.appendChild(trackItem);
    });
    
    shuffleBtn.disabled = false;
}

// Воспроизведение трека
function playTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    
    // Останавливаем текущий трек
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    currentTrackIndex = index;
    const track = tracks[index];
    
    // Обновляем UI
    updateCurrentTrackInfo(track);
    updatePlaylistUI();
    
    // Создаем новый аудио элемент
    currentAudio = new Audio(track.url);
    
    // Обработчики событий аудио
    currentAudio.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(currentAudio.duration);
    });
    
    currentAudio.addEventListener('timeupdate', () => {
        updateProgress();
    });
    
    currentAudio.addEventListener('ended', () => {
        playNext();
    });
    
    currentAudio.addEventListener('error', (e) => {
        console.error('Ошибка воспроизведения:', e);
        playNext(); // Переходим к следующему треку
    });
    
    // Воспроизводим
    currentAudio.play()
        .then(() => {
            isPlaying = true;
            updatePlayButton();
        })
        .catch(error => {
            console.error('Ошибка при воспроизведении:', error);
            isPlaying = false;
            updatePlayButton();
        });
}

// Обновление информации о текущем треке
function updateCurrentTrackInfo(track) {
    const cover = track.album?.thumb?.photo_135 || track.album?.thumb?.photo_68 || '';
    
    if (cover) {
        currentCover.src = cover;
        currentCover.style.display = 'block';
    } else {
        currentCover.style.display = 'none';
    }
    
    currentTitle.textContent = track.title;
    currentArtist.textContent = track.artist;
}

// Обновление UI плейлиста
function updatePlaylistUI() {
    document.querySelectorAll('.track-item').forEach((item, index) => {
        if (index === currentTrackIndex) {
            item.classList.add('playing');
        } else {
            item.classList.remove('playing');
        }
    });
}

// Переключение воспроизведения/паузы
function togglePlay() {
    if (!currentAudio) {
        // Если нет трека, играем первый
        if (tracks.length > 0) {
            playTrack(0);
        }
        return;
    }
    
    if (isPlaying) {
        currentAudio.pause();
        isPlaying = false;
    } else {
        currentAudio.play()
            .then(() => {
                isPlaying = true;
            })
            .catch(error => {
                console.error('Ошибка при воспроизведении:', error);
                isPlaying = false;
            });
    }
    
    updatePlayButton();
}

// Обновление кнопки play/pause
function updatePlayButton() {
    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

// Предыдущий трек
function playPrevious() {
    if (currentTrackIndex > 0) {
        playTrack(currentTrackIndex - 1);
    } else {
        playTrack(tracks.length - 1); // Зацикливаем на последний трек
    }
}

// Следующий трек
function playNext() {
    if (currentTrackIndex < tracks.length - 1) {
        playTrack(currentTrackIndex + 1);
    } else {
        playTrack(0); // Зацикливаем на первый трек
    }
}

// Перемешать треки
function shuffleTracks() {
    // Сохраняем текущий трек, если играет
    const currentTrack = currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null;
    
    // Перемешиваем массив (Fisher-Yates shuffle)
    for (let i = tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }
    
    // Находим новый индекс текущего трека
    if (currentTrack) {
        currentTrackIndex = tracks.findIndex(t => t.id === currentTrack.id);
    }
    
    // Перерисовываем плейлист
    renderTracks();
    updatePlaylistUI();
}

// Перемотка трека
function seekTrack(e) {
    if (!currentAudio) return;
    
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    currentAudio.currentTime = currentAudio.duration * percent;
}

// Обновление прогресса
function updateProgress() {
    if (!currentAudio) return;
    
    const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
    progressFill.style.width = percent + '%';
    currentTimeEl.textContent = formatTime(currentAudio.currentTime);
}

// Форматирование времени
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Показать загрузку
function showLoading(message) {
    trackList.innerHTML = `<div class="loading-message">${message}</div>`;
}

// Скрыть загрузку
function hideLoading() {
    const loading = document.querySelector('.loading-message');
    if (loading) {
        loading.remove();
    }
}

// Показать ошибку
function showError(message) {
    trackList.innerHTML = `<div class="error-message">${message}</div>`;
    shuffleBtn.disabled = true;
}