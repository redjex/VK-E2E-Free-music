const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { saveToken, loadToken, deleteToken } = require('./scr/utils/token-manager.js');

let mainWindow;

const VK_USER_AGENT = 'KateMobileAndroid/99 lite-999 (Android 13; SDK 33; arm64-v8a; VK; ru)';
const VK_API_VERSION = '5.131';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 700,
        minHeight: 500,
        resizable: true,
        autoHideMenuBar: true,        
        titleBarStyle: 'hidden',      
        titleBarOverlay: {
            color: '#181818',
            symbolColor: '#ffffff',
            height: 40
        },
        webPreferences: {
            preload: path.join(__dirname, 'scr/utils/preload.js'),
            nodeIntegration: true,
            contextIsolation: true,
            webSecurity: false
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'icon.ico')
    });

    // Отключаем CORS для VK API
    mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
        { urls: ['https://api.vk.com/*', 'https://*.vk.com/*', 'https://*.vkuseraudio.net/*', 'https://*.vkuservideo.net/*'] },
        (details, callback) => {
            details.requestHeaders['User-Agent'] = VK_USER_AGENT;
            callback({ requestHeaders: details.requestHeaders });
        }
    );

    const existingToken = loadToken();
    if (existingToken) {
        mainWindow.loadFile('scr/menu/index.html');
    } else {
        mainWindow.loadFile('scr/index.html');
    }

    mainWindow.webContents.on('did-navigate', (event, url) => {
        if (url.startsWith('https://oauth.vk.com/blank.html#')) {
            const hash = url.split('#')[1];
            const params = new URLSearchParams(hash);
            const token = params.get('access_token');
            const expiresIn = params.get('expires_in');

            if (token) {
                saveToken(token);
                mainWindow.loadFile('scr/menu/index.html');
            }
        }
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC handlers для токенов
ipcMain.handle('save-token', async (event, token) => {
    return saveToken(token);
});

ipcMain.handle('load-token', async () => {
    return loadToken();
});

ipcMain.handle('delete-token', async () => {
    deleteToken();
    return true;
});

// VK API handlers
ipcMain.handle('vk-get-user-id', async (event, token) => {
    try {
        const response = await axios.post(
            'https://api.vk.com/method/users.get',
            new URLSearchParams({
                access_token: token,
                v: VK_API_VERSION
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': VK_USER_AGENT
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error in vk-get-user-id:', error);
        throw error;
    }
});

ipcMain.handle('vk-get-audio', async (event, token, userId) => {
    try {
        const response = await axios.post(
            'https://api.vk.com/method/audio.get',
            new URLSearchParams({
                access_token: token,
                v: VK_API_VERSION,
                owner_id: userId,
                count: '100'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': VK_USER_AGENT
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error in vk-get-audio:', error);
        throw error;
    }
});

ipcMain.handle('vk-get-recommendations', async (event, token) => {
    try {
        const response = await axios.post(
            'https://api.vk.com/method/audio.getRecommendations',
            new URLSearchParams({
                access_token: token,
                v: VK_API_VERSION,
                count: '100'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': VK_USER_AGENT
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error in vk-get-recommendations:', error);
        throw error;
    }
});

ipcMain.handle('vk-search-audio', async (event, token, query) => {
    try {
        const response = await axios.post(
            'https://api.vk.com/method/audio.search',
            new URLSearchParams({
                access_token: token,
                v: VK_API_VERSION,
                q: query,
                count: '100'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': VK_USER_AGENT
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error in vk-search-audio:', error);
        throw error;
    }
});

ipcMain.handle('vk-add-audio', async (event, token, ownerId, audioId) => {
    try {
        const response = await axios.post(
            'https://api.vk.com/method/audio.add',
            new URLSearchParams({
                access_token: token,
                v: VK_API_VERSION,
                owner_id: ownerId,
                audio_id: audioId
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': VK_USER_AGENT
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error in vk-add-audio:', error);
        throw error;
    }
});

ipcMain.handle('vk-delete-audio', async (event, token, ownerId, audioId) => {
    try {
        const response = await axios.post(
            'https://api.vk.com/method/audio.delete',
            new URLSearchParams({
                access_token: token,
                v: VK_API_VERSION,
                owner_id: ownerId,
                audio_id: audioId
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': VK_USER_AGENT
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error in vk-delete-audio:', error);
        throw error;
    }
});