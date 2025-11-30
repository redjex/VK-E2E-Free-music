class GlobalAudioManager {
    constructor() {
        this.audio = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.tracks = [];
        this.currentTrackIndex = -1;
        
        // Web Audio API
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        
        // Загружаем состояние из localStorage при инициализации
        this.loadState();
        
        // Если есть сохраненный трек, восстанавливаем его
        if (this.currentTrack) {
            this.restoreAudio();
        }
    }
    
    // Инициализация Web Audio API
    initWebAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
        }
        
        // Возобновляем если приостановлен
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    // Подключение аудио элемента к Web Audio API
    connectAudioElement(audioElement) {
        if (this.audioContext && audioElement) {
            try {
                // Если уже есть source, отключаем старый
                if (this.source) {
                    try {
                        this.source.disconnect();
                    } catch (e) {
                        // Ignore disconnect errors
                    }
                }
                
                // Создаем новый source для нового аудио элемента
                // Важно: каждый новый Audio() элемент нужен для нового source
                this.source = this.audioContext.createMediaElementSource(audioElement);
                this.source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
                
                console.log('Audio element connected to Web Audio API');
            } catch (e) {
                // Если элемент уже был подключен к MediaElementSource, это нормально
                if (e.name === 'InvalidStateError') {
                    console.log('Audio element already connected to a source node');
                } else {
                    console.error('Ошибка подключения аудио:', e);
                }
            }
        }
    }
    
    // Получить analyser для визуализации
    getAnalyser() {
        return this.analyser;
    }
    
    // Сохранение состояния в localStorage
    saveState() {
        const state = {
            currentTrack: this.currentTrack,
            isPlaying: this.isPlaying,
            currentTime: this.audio ? this.audio.currentTime : 0,
            tracks: this.tracks,
            currentTrackIndex: this.currentTrackIndex
        };
        localStorage.setItem('audio_state', JSON.stringify(state));
    }
    
    // Загрузка состояния из localStorage
    loadState() {
        const saved = localStorage.getItem('audio_state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.currentTrack = state.currentTrack;
                this.isPlaying = state.isPlaying;
                this.tracks = state.tracks || [];
                this.currentTrackIndex = state.currentTrackIndex || -1;
                return state;
            } catch (e) {
                console.error('Ошибка загрузки состояния:', e);
            }
        }
        return null;
    }
    
    // Восстановление аудио после загрузки страницы
    restoreAudio() {
        if (!this.currentTrack) return;
        
        const state = this.loadState();
        
        // Инициализируем Web Audio API
        this.initWebAudio();
        
        // Создаем аудио элемент
        this.audio = new Audio(this.currentTrack.url);
        
        // Применяем сохраненную громкость
        const savedVolume = localStorage.getItem('player_volume') || '100';
        this.audio.volume = parseInt(savedVolume) / 100;
        
        // Восстанавливаем позицию
        if (state && state.currentTime) {
            this.audio.currentTime = state.currentTime;
        }
        
        // Устанавливаем обработчики
        this.setupAudioHandlers();
        
        // Подключаем к Web Audio API
        this.connectAudioElement(this.audio);
        
        // Если было воспроизведение, продолжаем
        if (this.isPlaying) {
            this.audio.play().catch(err => {
                console.error('Ошибка автовоспроизведения:', err);
                this.isPlaying = false;
            });
        }
        
        // Запускаем периодическое сохранение
        this.startAutoSave();
    }
    
    // Настройка обработчиков аудио
    setupAudioHandlers() {
        if (!this.audio) return;
        
        this.audio.addEventListener('ended', () => {
            this.playNext();
        });
        
        this.audio.addEventListener('error', (e) => {
            console.error('Ошибка воспроизведения:', e);
            this.playNext();
        });
        
        // Сохраняем состояние при изменениях
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.saveState();
            this.triggerUpdate();
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.saveState();
            this.triggerUpdate();
        });
    }
    
    // Воспроизведение трека
    playTrack(track, trackIndex = -1) {
        // Останавливаем текущий трек
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
        
        this.currentTrack = track;
        this.currentTrackIndex = trackIndex;
        
        // Инициализируем Web Audio API
        this.initWebAudio();
        
        // Создаем новый аудио элемент
        this.audio = new Audio(track.url);
        
        // Применяем сохраненную громкость
        const savedVolume = localStorage.getItem('player_volume') || '100';
        this.audio.volume = parseInt(savedVolume) / 100;
        
        this.setupAudioHandlers();
        
        // Подключаем к Web Audio API
        this.connectAudioElement(this.audio);
        
        // Воспроизводим
        this.audio.play()
            .then(() => {
                this.isPlaying = true;
                this.saveState();
                this.triggerUpdate();
            })
            .catch(error => {
                console.error('Ошибка при воспроизведении:', error);
                this.isPlaying = false;
                this.saveState();
            });
    }
    
    // Переключение play/pause
    togglePlay() {
        if (!this.audio) {
            // Если нет трека, пытаемся восстановить
            if (this.currentTrack) {
                this.restoreAudio();
            }
            return;
        }
        
        if (this.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play().catch(err => {
                console.error('Ошибка воспроизведения:', err);
            });
        }
    }
    
    // Следующий трек
    playNext() {
        if (this.tracks.length === 0) return;
        
        let nextIndex = this.currentTrackIndex + 1;
        if (nextIndex >= this.tracks.length) {
            nextIndex = 0; // Зацикливаем
        }
        
        this.playTrack(this.tracks[nextIndex], nextIndex);
    }
    
    // Предыдущий трек
    playPrevious() {
        if (this.tracks.length === 0) return;
        
        let prevIndex = this.currentTrackIndex - 1;
        if (prevIndex < 0) {
            prevIndex = this.tracks.length - 1; // Зацикливаем
        }
        
        this.playTrack(this.tracks[prevIndex], prevIndex);
    }
    
    // Установка плейлиста
    setTracks(tracks) {
        this.tracks = tracks;
        this.saveState();
    }
    
    // Перемотка
    seek(time) {
        if (this.audio) {
            this.audio.currentTime = time;
        }
    }
    
    // Получение текущего состояния
    getState() {
        return {
            currentTrack: this.currentTrack,
            isPlaying: this.isPlaying,
            currentTime: this.audio ? this.audio.currentTime : 0,
            duration: this.audio ? this.audio.duration : 0,
            tracks: this.tracks,
            currentTrackIndex: this.currentTrackIndex
        };
    }

    startAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(() => {
            if (this.isPlaying) {
                this.saveState();
            }
        }, 50);
    }
    
    // Остановка автосохранения
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
    
    // Триггер обновления UI (кастомное событие)
    triggerUpdate() {
        window.dispatchEvent(new CustomEvent('audioStateChanged', {
            detail: this.getState()
        }));
    }

    // Метод для очистки треков и остановки воспроизведения
    clearTracks() {
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
        this.currentTrack = null;
        this.isPlaying = false;
        this.tracks = [];
        this.currentTrackIndex = -1;
        this.saveState();
        this.triggerUpdate();
        this.stopAutoSave();
    }
}

// Создаем глобальный экземпляр
window.globalAudioManager = window.globalAudioManager || new GlobalAudioManager();