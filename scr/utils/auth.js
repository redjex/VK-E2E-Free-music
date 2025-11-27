// auth.js
const authScreen = document.getElementById('authScreen');
const tokenInput = document.getElementById('tokenInput');
const loginBtn = document.getElementById('loginBtn');
const authStatus = document.getElementById('authStatus');

let accessToken = null;

async function validateToken(token) {
    authStatus.textContent = 'Проверка токена...';
    authStatus.style.color = '#ffeb3b';

    try {
        const formData = new URLSearchParams();
        formData.append('access_token', token);
        formData.append('v', '5.131');

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
            accessToken = token;
            const userId = data.response[0].id.toString();
            
            // Сохраняем и токен, и user_id
            localStorage.setItem('vk_token', token);
            localStorage.setItem('vk_user_id', userId);
            
            // Если есть window.tokenAPI (Electron), сохраняем в .env
            if (window.tokenAPI) {
                await window.tokenAPI.saveToken(token);
            }

            authStatus.textContent = 'Успешно! Перенаправление...';
            authStatus.style.color = '#4caf50';

            // Редирект на главное меню
            setTimeout(() => {
                window.location.href = './menu/index.html';
            }, 500);
        } else {
            throw new Error(data.error?.error_msg || 'Неверный токен');
        }
    } catch (e) {
        authStatus.textContent = 'Ошибка: ' + e.message;
        authStatus.style.color = '#f44336';
        console.error(e);
    }
}

loginBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (!token) return authStatus.textContent = 'Вставьте токен';
    validateToken(token);
});

window.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('vk_token');

    if (savedToken) {
        tokenInput.value = savedToken;
        authStatus.textContent = 'Токен найден — нажмите «Войти»';
        authStatus.style.color = '#666';
    }
});