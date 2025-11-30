// mini-player-ui.js - UI мини-плеера для главной страницы
(function() {
    const audioManager = window.globalAudioManager;
    
    // DOM элементы мини-плеера
    const miniPlayer = document.getElementById('miniPlayer');
    const miniCover = document.getElementById('miniCover');
    const miniTitle = document.getElementById('miniTitle');
    const miniArtist = document.getElementById('miniArtist');
    const miniPlayBtn = document.getElementById('miniPlayBtn');
    const miniPrevBtn = document.getElementById('miniPrevBtn');
    const miniNextBtn = document.getElementById('miniNextBtn');
    const miniPlayIcon = document.getElementById('miniPlayIcon');
    const miniPauseIcon = document.getElementById('miniPauseIcon');
    const miniCloseBtn = document.getElementById('miniCloseBtn');
    
    // Инициализация при загрузке страницы
    window.addEventListener('DOMContentLoaded', () => {
        // Проверяем, есть ли текущий трек
        const state = audioManager.getState();
        
        if (state.currentTrack) {
            // Показываем мини-плеер
            miniPlayer.style.display = 'block';
            updateMiniPlayer(state);
        }
        
        // Подписываемся на обновления
        window.addEventListener('audioStateChanged', (e) => {
            const state = e.detail;
            
            if (state.currentTrack) {
                miniPlayer.style.display = 'block';
                updateMiniPlayer(state);
            } else {
                miniPlayer.style.display = 'none';
            }
        });
        
        // Обработчики кнопок
        miniPlayBtn.addEventListener('click', () => {
            audioManager.togglePlay();
        });
        
        miniPrevBtn.addEventListener('click', () => {
            audioManager.playPrevious();
        });
        
        miniNextBtn.addEventListener('click', () => {
            audioManager.playNext();
        });

        // Обработчик кнопки закрытия
        miniCloseBtn.addEventListener('click', () => {
            audioManager.clearTracks();
            miniPlayer.style.display = 'none';
        });

        // Обработчик клика на мини-плеер для перехода на страницу музыки
        miniPlayer.addEventListener('click', (e) => {
            // Проверяем, что клик не на кнопках управления или закрытия
            if (!e.target.closest('.mini-controls') && !e.target.closest('.mini-close')) {
                window.location.href = 'music.html';
            }
        });
    });
    
    // Обновление UI мини-плеера
    function updateMiniPlayer(state) {
        if (!state.currentTrack) return;
        
        const track = state.currentTrack;
        
        // Обновляем обложку
        const cover = track.album?.thumb?.photo_135 || track.album?.thumb?.photo_68 || '';
        if (cover) {
            miniCover.src = cover;
            miniCover.style.display = 'block';
        } else {
            miniCover.style.display = 'none';
        }
        
        // Обновляем информацию
        miniTitle.textContent = track.title;
        miniArtist.textContent = track.artist;
        
        // Обновляем кнопку play/pause
        if (state.isPlaying) {
            miniPlayIcon.style.display = 'none';
            miniPauseIcon.style.display = 'block';
        } else {
            miniPlayIcon.style.display = 'block';
            miniPauseIcon.style.display = 'none';
        }
    }
})();