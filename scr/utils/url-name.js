async function updateProfileLink(token) {
    try {
        const res = await fetch(`https://api.vk.com/method/users.get?access_token=${encodeURIComponent(token)}&v=5.131&fields=screen_name,photo_200,crop_photo`, {
            headers: { 'User-Agent': 'KateMobileAndroid/99 lite-999 (Android 13; SDK 33; arm64-v8a; VK; ru)' }
        });
        const data = await res.json();

        if (data.response?.[0]) {
            const user = data.response[0];
            const screenName = user.screen_name || `id${user.id}`;
            const shortName = screenName.startsWith('id') ? screenName.substring(0, 10) + '...' : screenName;

            document.getElementById('screenName').textContent = shortName;
            document.getElementById('profileLink').href = `https://vk.com/${screenName}`;
            
            if (user.photo_200) {
                const avatarImg = document.getElementById('userAvatar');
                const avatarContainer = document.getElementById('avatarContainer');
                avatarImg.src = user.photo_200;
                avatarContainer.style.display = 'block';
            }
            
            await loadUserCover(token, user.id);
            showProfileUrl();
            
            return true;
        }
        return false;
    } catch (e) {
        document.getElementById('screenName').textContent = 'id...';
        console.error(e);
        return false;
    }
}

async function loadUserCover(token, userId) {
    try {
        const res = await fetch(`https://api.vk.com/method/users.get?access_token=${encodeURIComponent(token)}&user_ids=${userId}&v=5.131&fields=cover`, {
            headers: { 'User-Agent': 'KateMobileAndroid/99 lite-999 (Android 13; SDK 33; arm64-v8a; VK; ru)' }
        });
        const data = await res.json();
        
        const coverImg = document.getElementById('userCover');
        
        if (data.response?.[0]?.cover?.enabled === 1 && data.response[0].cover.images?.length > 0) {
            const images = data.response[0].cover.images;
            const largestCover = images[images.length - 1];
            coverImg.src = largestCover.url;
        }
    } catch (e) {
        console.error('Ошибка загрузки обложки:', e);
    }
}

function showProfileUrl() {
    const urlProfileH1 = document.querySelector('.url-profile h1');
    if (urlProfileH1) {
        urlProfileH1.style.display = 'block';
    }
}

function hideProfileUrl() {
    const urlProfileH1 = document.querySelector('.url-profile h1');
    if (urlProfileH1) {
        urlProfileH1.style.display = 'none';
    }
}