// mesh-gradient.js - Анимированный mesh градиент
class MeshGradient {
    constructor() {
        this.canvas = document.getElementById('meshGradientCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.animationId = null;
        this.isActive = false;
        this.currentPalette = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = 0;
        
        // Отслеживание текущего трека
        this.currentTrackId = null;
        
        // Данные аудио анализа
        this.audioData = {
            bass: 0,
            mid: 0,
            high: 0,
            overall: 0
        };
        
        // Палитры цветов для разных треков
        this.palettes = [
            // Фиолетово-розовый
            ['#6B5B95', '#B565A7', '#D4A5A5', '#9B59B6', '#E91E63'],
            // Сине-голубой
            ['#2E86AB', '#06BCC1', '#5FA8D3', '#1B4965', '#62B6CB'],
            // Оранжево-красный
            ['#FF6B6B', '#FFA07A', '#FF8C42', '#FF595E', '#FFCA3A'],
            // Зелено-желтый
            ['#52B788', '#95D5B2', '#B7E4C7', '#74C69D', '#40916C'],
            // Пурпурно-синий
            ['#7209B7', '#560BAD', '#3A0CA3', '#4361EE', '#4CC9F0'],
            // Золотисто-розовый
            ['#FF9F1C', '#FFBF69', '#FF5D8F', '#EE6C4D', '#C9ADA7'],
            // Морская волна
            ['#06FFA5', '#00D9FF', '#0496FF', '#006BA6', '#023E7D'],
            // Закатный
            ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF']
        ];
        
        this.init();
    }
    
    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    // Подключение к аудио анализатору
    connectAudio(force = false) {
        const globalAnalyser = window.globalAudioManager?.getAnalyser();
        if (globalAnalyser && (force || !this.analyser)) {
            this.analyser = globalAnalyser;
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            console.log('Mesh gradient connected to audio analyser');
        }
    }
    
    // Анализ частот
    analyzeAudio() {
        if (!this.analyser || !this.dataArray) {
            this.audioData = { bass: 0, mid: 0, high: 0, overall: 0 };
            return;
        }
        
        try {
            this.analyser.getByteFrequencyData(this.dataArray);
        } catch (e) {
            console.error('Error getting frequency data:', e);
            this.audioData = { bass: 0, mid: 0, high: 0, overall: 0 };
            return;
        }
        
        // Разделяем на диапазоны
        const bassEnd = Math.floor(this.bufferLength * 0.15);
        const midEnd = Math.floor(this.bufferLength * 0.5);
        
        let bass = 0, mid = 0, high = 0, overall = 0;
        
        // Басы (0-15%)
        for (let i = 0; i < bassEnd; i++) {
            bass += this.dataArray[i];
        }
        bass /= bassEnd;
        
        // Средние (15-50%)
        for (let i = bassEnd; i < midEnd; i++) {
            mid += this.dataArray[i];
        }
        mid /= (midEnd - bassEnd);
        
        // Высокие (50-100%)
        for (let i = midEnd; i < this.bufferLength; i++) {
            high += this.dataArray[i];
        }
        high /= (this.bufferLength - midEnd);
        
        // Общая энергия
        for (let i = 0; i < this.bufferLength; i++) {
            overall += this.dataArray[i];
        }
        overall /= this.bufferLength;
        
        // Нормализуем (0-1)
        this.audioData = {
            bass: bass / 255,
            mid: mid / 255,
            high: high / 255,
            overall: overall / 255
        };
    }
    
    // Генерация уникального seed из названия трека
    generateSeedFromTrack(trackTitle, trackArtist) {
        const text = (trackTitle + trackArtist).toLowerCase();
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    
    // Генерация точек на основе трека
    generatePointsForTrack(trackTitle, trackArtist) {
        const seed = this.generateSeedFromTrack(trackTitle, trackArtist);
        
        // Используем seed для выбора палитры
        const paletteIndex = seed % this.palettes.length;
        this.currentPalette = this.palettes[paletteIndex];
        
        // Количество точек (от 6 до 10) - увеличил минимум с 4 до 6
        const numPoints = 6 + (seed % 5);
        
        this.points = [];
        
        // Создаем псевдо-рандомный генератор с seed
        let randomSeed = seed;
        const seededRandom = () => {
            randomSeed = (randomSeed * 9301 + 49297) % 233280;
            return randomSeed / 233280;
        };
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const radius = 0.08 + seededRandom() * 0.08; // УМЕНЬШИЛ с 0.15-0.3 до 0.08-0.16
            
            const point = {
                // Начальная позиция
                x: 0.5 + Math.cos(angle) * radius,
                y: 0.5 + Math.sin(angle) * radius,
                
                // Целевая позиция для анимации
                targetX: 0.5 + Math.cos(angle) * radius,
                targetY: 0.5 + Math.sin(angle) * radius,
                
                // Базовая позиция (центр орбиты)
                baseX: 0.5,
                baseY: 0.5,
                baseAngle: angle,
                
                // Цвет из палитры
                color: this.currentPalette[i % this.currentPalette.length],
                
                // Скорость движения - УВЕЛИЧЕНА для более подвижного градиента
                speed: 0.001 + seededRandom() * 0.002, // Увеличил с 0.0003-0.001 до 0.001-0.003
                
                // Радиус движения - УМЕНЬШЕН для более компактного градиента
                moveRadius: 0.05 + seededRandom() * 0.08, // УМЕНЬШИЛ с 0.08-0.2 до 0.05-0.13
                baseRadius: 0.05 + seededRandom() * 0.08,
                
                // Фаза анимации
                phase: seededRandom() * Math.PI * 2,
                
                // Размер точки
                size: 150 + seededRandom() * 200,
                baseSize: 150 + seededRandom() * 200,
                
                // Вибрация для басов
                vibrationPhase: seededRandom() * Math.PI * 2,
                vibrationSpeed: 0.1 + seededRandom() * 0.2, // Увеличил с 0.05-0.15
                
                // Для случайного перемещения между позициями - УВЕЛИЧЕНА скорость
                swapPhase: seededRandom() * Math.PI * 2,
                swapSpeed: 0.0005 + seededRandom() * 0.001 // Увеличил с 0.0001-0.0003 до 0.0005-0.0015
            };
            
            this.points.push(point);
        }
    }
    
    // Начало анимации с треком
    start(trackTitle, trackArtist) {
        // Создаем уникальный ID трека
        const trackId = trackTitle + '|' + trackArtist;
        
        // Если это тот же трек, не пересоздаем точки
        if (this.currentTrackId === trackId && this.isActive) {
            console.log('Same track, skipping regeneration');
            return;
        }
        
        console.log('Starting mesh gradient for:', trackTitle, '-', trackArtist);
        this.currentTrackId = trackId;
        
        // Останавливаем предыдущую анимацию если была
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.generatePointsForTrack(trackTitle, trackArtist);
        
        // Форсируем переподключение к analyser для нового трека
        this.connectAudio(true);
        
        // Если analyser не готов, пробуем еще раз через 100ms
        if (!this.analyser) {
            setTimeout(() => {
                this.connectAudio(true);
            }, 100);
        }
        
        this.isActive = true;
        this.canvas.style.opacity = '1';
        this.animate();
    }
    
    // Остановка анимации
    stop() {
        this.isActive = false;
        this.currentTrackId = null; // Сбрасываем ID трека
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Плавно скрываем
        this.canvas.style.opacity = '0';
        
        // Очищаем canvas
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    // Обновление позиций точек
    updatePoints() {
        const time = Date.now() * 0.001;
        
        // Анализируем аудио
        this.analyzeAudio();
        
        this.points.forEach((point, index) => {
            // Базовое круговое движение
            const angle = time * point.speed + point.phase;
            
            // Случайное изменение угла для смены позиций - УВЕЛИЧЕНА амплитуда
            const swapOffset = Math.sin(time * point.swapSpeed + point.swapPhase) * Math.PI * 0.5; // Увеличил с 0.3
            
            // Изменение радиуса от средних частот - УВЕЛИЧЕНА амплитуда
            const radiusVariation = Math.sin(time * point.speed * 2) * 0.05; // Увеличил с 0.03
            
            // Реакция на басы - УМЕНЬШИЛ расширение радиуса
            const bassBoost = this.audioData.bass * 0.08;
            const currentRadius = point.baseRadius + radiusVariation + bassBoost;
            
            // Вибрация на басах - быстрое дрожание - УВЕЛИЧЕНА амплитуда
            const vibration = Math.sin(time * 20 + point.vibrationPhase) * this.audioData.bass * 0.04; // Увеличил с 0.02
            
            // Реакция на высокие частоты - изменение угла - УВЕЛИЧЕНА
            const highFreqOffset = this.audioData.high * 0.4 * Math.sin(time * 4); // Увеличил с 0.2 и с 3
            
            // Смещение центра орбиты от общей энергии - УВЕЛИЧЕНО
            const centerOffsetX = Math.sin(time * 0.8 + index) * this.audioData.overall * 0.08; // Увеличил скорость и амплитуду
            const centerOffsetY = Math.cos(time * 0.8 + index) * this.audioData.overall * 0.08;
            
            // Применяем все эффекты с учетом swap для случайного перемещения
            point.targetX = 0.5 + centerOffsetX + Math.cos(angle + highFreqOffset + swapOffset) * (currentRadius + vibration);
            point.targetY = 0.5 + centerOffsetY + Math.sin(angle + highFreqOffset + swapOffset) * (currentRadius + vibration);
            
            // Плавная интерполяция к целевой позиции - УВЕЛИЧЕНА скорость
            point.x += (point.targetX - point.x) * 0.05; // Увеличил с 0.02
            point.y += (point.targetY - point.y) * 0.05;
            
            // Размер реагирует на басы - пульсация
            const sizeBoost = this.audioData.bass * 100;
            const targetSize = point.baseSize + sizeBoost;
            point.size += (targetSize - point.size) * 0.15; // Увеличил с 0.1
        });
    }
    
    // Рисование mesh градиента
    drawMeshGradient() {
        const { width, height } = this.canvas;
        
        // Очищаем canvas
        this.ctx.clearRect(0, 0, width, height);
        
        // Рисуем каждую точку с радиальным градиентом
        this.points.forEach(point => {
            const x = point.x * width;
            const y = point.y * height;
            const size = point.size;
            
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
            
            // Конвертируем hex в rgba
            const hexToRgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : null;
            };
            
            const rgb = hexToRgb(point.color);
            
            // Яркость увеличивается от басов
            const intensityBoost = this.audioData.bass * 0.3;
            
            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.6 + intensityBoost})`);
            gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.3 + intensityBoost * 0.5})`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, width, height);
        });
        
        // Применяем блюр эффект через фильтр
        this.ctx.filter = 'blur(60px)';
        this.ctx.drawImage(this.canvas, 0, 0);
        this.ctx.filter = 'none';
    }
    
    // Анимация
    animate() {
        if (!this.isActive) return;
        
        this.updatePoints();
        this.drawMeshGradient();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
}

// Создаем глобальный экземпляр
window.meshGradient = window.meshGradient || new MeshGradient();