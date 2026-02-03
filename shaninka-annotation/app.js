// 🔐 Простая аутентификация логин/пароль

let articlesData = [];
let currentItem = null;
let annotatedIds = new Set();
let currentUser = null;
let currentIndex = 0;

// JSONP helper
function jsonp(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_' + Math.random().toString(36).substr(2, 9);
        const script = document.createElement('script');
        
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };
        
        script.onerror = function() {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('JSONP request failed'));
        };
        
        script.src = url + '&callback=' + callbackName;
        document.body.appendChild(script);
    });
}

// Показать ошибку регистрации
function showRegisterError(message) {
    const errorDiv = document.getElementById('registerErrorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('active');
}

// Скрыть ошибку регистрации
function hideRegisterError() {
    const errorDiv = document.getElementById('registerErrorMessage');
    errorDiv.classList.remove('active');
}

// Показать форму регистрации
function showRegisterOverlay() {
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('registerOverlay').classList.remove('hidden');
    document.getElementById('regUsername').focus();
}

// Показать форму входа
function showLoginOverlay() {
    document.getElementById('registerOverlay').classList.add('hidden');
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('username').focus();
}

// Регистрация
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const name = document.getElementById('regName').value.trim();
    
    if (!username || !password || !name) {
        showRegisterError('Заполните все поля');
        return;
    }
    
    if (username.length < 3) {
        showRegisterError('Логин должен быть минимум 3 символа');
        return;
    }
    
    if (password.length < 4) {
        showRegisterError('Пароль должен быть минимум 4 символа');
        return;
    }
    
    const registerBtn = document.getElementById('registerBtn');
    registerBtn.disabled = true;
    registerBtn.textContent = 'Регистрация...';
    hideRegisterError();
    
    try {
        // Регистрируем через Apps Script
        const url = `${CONFIG.appsScriptUrl}?action=register&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&name=${encodeURIComponent(name)}`;
        const result = await jsonp(url);
        
        if (result.success && result.user) {
            currentUser = result.user;
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            
            console.log('👤 Зарегистрирован пользователь:', currentUser.name);
            
            hideRegisterOverlay();
            updateUIAfterLogin();
            loadUserProgress();
        } else {
            showRegisterError(result.error || 'Ошибка регистрации');
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showRegisterError('Ошибка соединения с сервером');
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Зарегистрироваться';
    }
}

// Скрыть форму регистрации
function hideRegisterOverlay() {
    document.getElementById('registerOverlay').classList.add('hidden');
}

// Показать ошибку входа
function showLoginError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('active');
}

// Скрыть ошибку входа
function hideLoginError() {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.classList.remove('active');
}

// Вход
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showLoginError('Заполните все поля');
        return;
    }
    
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Вход...';
    hideLoginError();
    
    try {
        // Проверяем логин/пароль через Apps Script
        const url = `${CONFIG.appsScriptUrl}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        const result = await jsonp(url);
        
        if (result.success && result.user) {
            currentUser = result.user;
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            
            console.log('👤 Вошёл пользователь:', currentUser.name);
            
            hideLoginOverlay();
            updateUIAfterLogin();
            loadUserProgress();
        } else {
            showLoginError(result.error || 'Неверный логин или пароль');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        showLoginError('Ошибка соединения с сервером');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Войти';
    }
}

// Показать форму входа
function showLoginOverlay() {
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('username').focus();
}

// Скрыть форму входа
function hideLoginOverlay() {
    document.getElementById('loginOverlay').classList.add('hidden');
}

// Обновить UI после входа
function updateUIAfterLogin() {
    document.getElementById('showLoginBtn').style.display = 'none';
    document.getElementById('userInfo').classList.add('active');
    document.getElementById('userName').textContent = currentUser.name;
}

// Выход
function signOut() {
    currentUser = null;
    localStorage.removeItem('current_user');
    
    document.getElementById('showLoginBtn').style.display = 'flex';
    document.getElementById('userInfo').classList.remove('active');
    
    articlesData = [];
    annotatedIds.clear();
    
    document.getElementById('metadata').innerHTML = '<div class="loading">Нажмите "Войти" для начала работы</div>';
    document.getElementById('annotationForm').style.display = 'none';
    document.getElementById('articleFrame').src = 'about:blank';
    
    // Очищаем форму
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    hideLoginError();
    
    console.log('👋 Вышли из системы');
}

// Проверка сохранённой сессии
function checkStoredSession() {
    const stored = localStorage.getItem('current_user');
    if (stored) {
        try {
            currentUser = JSON.parse(stored);
            console.log('👤 Восстановлена сессия:', currentUser.name);
            updateUIAfterLogin();
            loadUserProgress();
            return true;
        } catch (e) {
            console.error('Ошибка восстановления сессии:', e);
            localStorage.removeItem('current_user');
        }
    }
    return false;
}

// Получение IP адреса
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Ошибка получения IP:', error);
        return 'unknown';
    }
}

// Загрузка данных через JSONP
async function loadDataFromAppsScript() {
    try {
        const url = `${CONFIG.appsScriptUrl}?action=getData`;
        const result = await jsonp(url);
        
        if (!result.success) {
            throw new Error(result.error || 'Ошибка загрузки данных');
        }
        
        articlesData = result.data;
        console.log(`✅ Загружено ${articlesData.length} статей`);
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных: ' + error.message);
        return false;
    }
}

// Загрузка прогресса пользователя
async function loadUserProgress() {
    if (!currentUser) return;
    
    try {
        const dataLoaded = await loadDataFromAppsScript();
        if (!dataLoaded) return;
        
        const url = `${CONFIG.appsScriptUrl}?action=getUserProgress&userId=${encodeURIComponent(currentUser.username)}`;
        const result = await jsonp(url);
        
        if (result.success && result.data) {
            annotatedIds = new Set(result.data.annotated_ids || []);
            currentIndex = result.data.last_index || 0;
            console.log(`📂 Загружен прогресс: ${annotatedIds.size} размеченных`);
        }
        
        loadNextItem();
        
    } catch (error) {
        console.error('Ошибка загрузки прогресса:', error);
        showError('Ошибка загрузки прогресса: ' + error.message);
    }
}

// Сохранение прогресса на сервер
async function saveUserProgress() {
    if (!currentUser) return;
    
    try {
        await fetch(CONFIG.appsScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'saveProgress',
                userId: currentUser.username,
                userName: currentUser.name,
                annotated_ids: [...annotatedIds],
                last_index: currentIndex
            })
        });
        
        console.log('💾 Прогресс сохранён');
    } catch (error) {
        console.error('Ошибка сохранения прогресса:', error);
    }
}

// Сохранение аннотации
async function saveAnnotation(itemId, wordMention, authorAffiliation) {
    if (!currentUser) {
        throw new Error('Необходимо войти в систему');
    }
    
    try {
        const ip = await getClientIP();
        const timestamp = new Date().toISOString();
        
        await fetch(CONFIG.appsScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'saveAnnotation',
                item_id: itemId,
                word_mention: wordMention,
                author_affiliation: authorAffiliation,
                user_id: currentUser.username,
                user_name: currentUser.name,
                ip: ip,
                timestamp: timestamp
            })
        });
        
        return true;
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        throw error;
    }
}

// Получить следующий элемент
function getNextItem() {
    for (let i = currentIndex; i < articlesData.length; i++) {
        const item = articlesData[i];
        if (!annotatedIds.has(item.id)) {
            currentIndex = i;
            return item;
        }
    }
    
    for (let i = 0; i < currentIndex; i++) {
        const item = articlesData[i];
        if (!annotatedIds.has(item.id)) {
            currentIndex = i;
            return item;
        }
    }
    
    return null;
}

// Отобразить элемент
function displayItem(item) {
    const metadata = document.getElementById('metadata');
    const form = document.getElementById('annotationForm');
    const frame = document.getElementById('articleFrame');
    
    const itemIndex = articlesData.findIndex(a => a.id === item.id);
    
    metadata.innerHTML = `
        <div class="metadata-item">
            <div class="metadata-label">Прогресс</div>
            <div class="metadata-value" style="color: #007bff; font-weight: 600;">
                Статья ${itemIndex + 1} из ${articlesData.length}
            </div>
        </div>
        
        <div class="metadata-item">
            <div class="metadata-label">Название</div>
            <div class="metadata-value">${escapeHtml(item.title)}</div>
        </div>
        
        <div class="metadata-item">
            <div class="metadata-label">Авторы</div>
            <ul class="authors-list metadata-value">
                ${item.authors.map(author => `<li>${escapeHtml(author)}</li>`).join('')}
            </ul>
        </div>
        
        <div class="metadata-item">
            <div class="metadata-label">Журнал</div>
            <div class="metadata-value">${escapeHtml(item.journal_name)}</div>
        </div>
        
        <div class="metadata-item">
            <div class="metadata-label">Год публикации</div>
            <div class="metadata-value">${escapeHtml(String(item.publication_year))}</div>
        </div>
    `;
    
    form.style.display = 'block';
    
    document.getElementById('wordMention').checked = false;
    document.getElementById('authorAffiliation').checked = false;
    
    frame.src = item.url;
}

// Обновить статистику
function updateStats() {
    const total = articlesData.length;
    const annotated = annotatedIds.size;
    const remaining = total - annotated;
    const percent = total > 0 ? (annotated / total * 100) : 0;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('annotatedCount').textContent = annotated;
    document.getElementById('remainingCount').textContent = remaining;
    document.getElementById('progressBar').style.width = percent + '%';
}

// Загрузить следующий элемент
function loadNextItem() {
    const item = getNextItem();
    
    if (item) {
        currentItem = item;
        displayItem(item);
        updateStats();
    } else {
        showCompletionMessage();
    }
}

// Сохранить аннотацию
async function handleSave() {
    if (!currentItem || !currentUser) return;
    
    const wordMention = document.getElementById('wordMention').checked;
    const authorAffiliation = document.getElementById('authorAffiliation').checked;
    
    const saveBtn = document.getElementById('saveBtn');
    const skipBtn = document.getElementById('skipBtn');
    saveBtn.disabled = true;
    skipBtn.disabled = true;
    saveBtn.textContent = 'Сохранение...';
    
    try {
        await saveAnnotation(currentItem.id, wordMention, authorAffiliation);
        
        annotatedIds.add(currentItem.id);
        await saveUserProgress();
        
        setTimeout(() => {
            loadNextItem();
        }, 500);
        
    } catch (error) {
        alert(error.message);
    } finally {
        saveBtn.disabled = false;
        skipBtn.disabled = false;
        saveBtn.textContent = 'Сохранить';
    }
}

// Пропустить элемент
async function handleSkip() {
    if (!currentItem || !currentUser) return;
    
    const skipBtn = document.getElementById('skipBtn');
    const saveBtn = document.getElementById('saveBtn');
    skipBtn.disabled = true;
    saveBtn.disabled = true;
    skipBtn.textContent = 'Пропуск...';
    
    try {
        await saveAnnotation(currentItem.id, false, false);
        annotatedIds.add(currentItem.id);
        await saveUserProgress();
        
        setTimeout(() => {
            loadNextItem();
        }, 500);
    } catch (error) {
        alert(error.message);
    } finally {
        skipBtn.disabled = false;
        saveBtn.disabled = false;
        skipBtn.textContent = 'Пропустить';
    }
}

// Сообщение о завершении
function showCompletionMessage() {
    const metadata = document.getElementById('metadata');
    const form = document.getElementById('annotationForm');
    
    metadata.innerHTML = `
        <div class="alert alert-success">
            <strong>Поздравляем, ${escapeHtml(currentUser.name)}!</strong><br>
            Вы разметили все доступные статьи. Спасибо за вашу работу!
        </div>
    `;
    
    form.style.display = 'none';
}

// Показать ошибку
function showError(message) {
    const metadata = document.getElementById('metadata');
    metadata.innerHTML = `
        <div class="alert alert-error">
            <strong>Ошибка!</strong><br>
            ${escapeHtml(message)}
        </div>
    `;
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обработчики событий
document.getElementById('showLoginBtn').addEventListener('click', showLoginOverlay);
document.getElementById('loginForm').addEventListener('submit', handleLogin);
document.getElementById('registerForm').addEventListener('submit', handleRegister);
document.getElementById('showRegisterLink').addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterOverlay();
});
document.getElementById('showLoginLink').addEventListener('click', (e) => {
    e.preventDefault();
    showLoginOverlay();
});
document.getElementById('signOutBtn').addEventListener('click', signOut);
document.getElementById('saveBtn').addEventListener('click', handleSave);
document.getElementById('skipBtn').addEventListener('click', handleSkip);

// Горячие клавиши
document.addEventListener('keydown', (e) => {
    if (!currentUser) return;
    
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
    } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSkip();
    }
});

// Сохраняем прогресс при закрытии
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        saveUserProgress();
    }
});

// Инициализация при загрузке
window.addEventListener('load', () => {
    // Проверяем есть ли сохранённая сессия
    if (!checkStoredSession()) {
        // Нет сессии - просто ждём пока нажмут кнопку "Войти"
        console.log('👋 Нажмите "Войти" для начала работы');
    }
});
