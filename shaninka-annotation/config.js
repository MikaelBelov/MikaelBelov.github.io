// ⚙️ Конфигурация приложения
const CONFIG = {
    // API ключ для ЧТЕНИЯ данных из Google Sheets
    apiKey: 'AIzaSyBBpM3TViIgeID7tmMr4c53DtnZhEP0J9E',
    
    // ID твоей Google таблицы
    spreadsheetId: '1Ao-RCt8RJa90OFScca7Jtl7U0xhW7Nl0PXPyAbCQ6H0',
    
    // Названия листов в таблице
    sheets: {
        data: 'Data',           // Лист с данными о статьях
        annotations: 'Annotations'  // Лист для результатов разметки
    },
    
    // 🔴 ВАЖНО: Вставь сюда URL своего Google Apps Script
    // Как получить: см. инструкцию в README.md
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwrqMgBv3ZDZxe6kJQmIXJLxaThcM65psA0Cw4Y4uJQJnGyOjLfUnAG_iP0fb1dXmXRTw/exec'
    
    // Пример правильного URL:
    // 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxx/exec'
};
