// menu.js
const profileContainer = document.querySelector('.url-profile');
const subscribeBtn = document.getElementById('subscribeBtn');
const animContainer = document.getElementById('animContainer');
const btnText = subscribeBtn.querySelector('.btn-text');

let accessToken = null;
let isSubscribed = false;
let isPlaying = false;
let subscribeAnim = null;
let unsubscribeAnim = null;

// Функция валидации токена (POST метод как в Python)
async function validateToken(token) {
    try {
        const formData = new URLSearchParams();
        formData.append('access_token', token);
        formData.append('v', '5.131');
        formData.append('fields', 'screen_name');

        const res = await fetch('https://api.vk.com/method/users.get', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'KateMobileAndroid/99 lite-999 (Android 13; SDK 33; arm64-v8a; VK; ru)'
            },
            body: formData
        });

        const data = await res.json();

        if (data.response?.[0]) {
            // Сохраняем user_id если его нет
            const userId = data.response[0].id.toString();
            if (!localStorage.getItem('vk_user_id')) {
                localStorage.setItem('vk_user_id', userId);
            }
            return true;
        } else {
            throw new Error(data.error?.error_msg || 'Неверный токен');
        }
    } catch (e) {
        console.error('Ошибка валидации:', e);
        return false;
    }
}

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', async () => {
    // Загружаем токен из localStorage или .env через IPC
    accessToken = localStorage.getItem('vk_token');
    
    if (!accessToken && window.tokenAPI) {
        accessToken = await window.tokenAPI.loadToken();
    }

    if (!accessToken) {
        // Если токена нет - редирект на авторизацию
        window.location.href = '../index.html';
        return;
    }

    // Валидация токена
    const isValid = await validateToken(accessToken);
    if (!isValid) {
        // Если токен недействителен - удаляем и редирект
        if (window.tokenAPI) {
            await window.tokenAPI.deleteToken();
        }
        localStorage.removeItem('vk_token');
        localStorage.removeItem('vk_user_id');
        window.location.href = '../index.html';
        return;
    }

    // Если валиден - сохраняем в localStorage и продолжаем
    localStorage.setItem('vk_token', accessToken);

    // Загрузка профиля
    profileContainer.classList.add('visible');
    await updateProfileLink(accessToken);
    
    // Инициализация анимаций
    initAnimations();
});