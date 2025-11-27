(function() {
    const subBtn = document.getElementById('subscribeBtn');
    if (!subBtn) return;
    
    const subBtnText = subBtn.querySelector('.btn-text');
    const subAnimContainer = document.getElementById('subscribeAnim');
    const unsubAnimContainer = document.getElementById('unsubscribeAnim');

    let isSubbed = false;
    let animPlaying = false;

    function initSubAnimations() {
        // Создаем img элементы для GIF
        const subImg = document.createElement('img');
        subImg.src = '../tgs-anim/subscribe.gif';
        subImg.style.width = '32px';
        subImg.style.height = '32px';
        subAnimContainer.appendChild(subImg);

        const unsubImg = document.createElement('img');
        unsubImg.src = '../tgs-anim/unsubscribe.gif';
        unsubImg.style.width = '32px';
        unsubImg.style.height = '32px';
        unsubAnimContainer.appendChild(unsubImg);

        // GIF проигрывается автоматически, ждем ~1 секунду
        subImg.addEventListener('load', () => {
            // Получаем длительность из data-атрибута или используем стандартное время
            subImg.dataset.duration = 1000;
        });

        unsubImg.addEventListener('load', () => {
            unsubImg.dataset.duration = 1000;
        });
    }

    subBtn.addEventListener('click', () => {
        if (animPlaying) return;

        animPlaying = true;
        subBtn.classList.add('playing');
        subBtnText.style.display = 'none';

        if (!isSubbed) {
            subAnimContainer.classList.add('active');
            unsubAnimContainer.classList.remove('active');
            
            // Перезапуск GIF (добавляем timestamp)
            const img = subAnimContainer.querySelector('img');
            const src = img.src.split('?')[0];
            img.src = src + '?t=' + Date.now();
            
            setTimeout(() => endSubAnimation(true), 1100);
        } else {
            unsubAnimContainer.classList.add('active');
            subAnimContainer.classList.remove('active');
            
            // Перезапуск GIF
            const img = unsubAnimContainer.querySelector('img');
            const src = img.src.split('?')[0];
            img.src = src + '?t=' + Date.now();
            
            setTimeout(() => endSubAnimation(false), 900);
        }
    });

    function endSubAnimation(subscribed) {
        animPlaying = false;
        isSubbed = subscribed;
        subBtnText.style.display = 'block';
        subBtnText.textContent = subscribed ? 'Unsubscribe' : 'Subscribe';
        subBtn.classList.toggle('subscribed', subscribed);
        subBtn.classList.remove('playing');
        subAnimContainer.classList.remove('active');
        unsubAnimContainer.classList.remove('active');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSubAnimations);
    } else {
        initSubAnimations();
    }
})();