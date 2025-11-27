// token-manager.js
const fs = require('fs');
const path = require('path');

// Путь к .env файлу (в scr/utils/.env относительно token-manager.js, но используем абсолютный путь)
const envPath = path.join(__dirname, '.env');

function saveToken(token) {
    try {
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf-8');
        }
        // Обновляем или добавляем VK_TOKEN
        const lines = envContent.split('\n').filter(line => !line.startsWith('VK_TOKEN='));
        lines.push(`VK_TOKEN=${token.trim()}`);
        fs.writeFileSync(envPath, lines.join('\n').trim());
        return true;
    } catch (err) {
        console.error('Ошибка сохранения токена в .env:', err);
        return false;
    }
}

function loadToken() {
    try {
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/VK_TOKEN=(.*)/);
            return match ? match[1].trim() : null;
        }
    } catch (err) {
        console.error('Ошибка чтения токена из .env:', err);
    }
    return null;
}

function deleteToken() {
    try {
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf-8');
            envContent = envContent.split('\n').filter(line => !line.startsWith('VK_TOKEN=')).join('\n').trim();
            fs.writeFileSync(envPath, envContent);
        }
        return true;
    } catch (err) {
        console.error('Ошибка удаления токена из .env:', err);
        return false;
    }
}

module.exports = { saveToken, loadToken, deleteToken };