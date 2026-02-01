/**
 * 📝 Google Apps Script для сохранения аннотаций
 * 
 * 🔧 КАК УСТАНОВИТЬ:
 * 
 * 1. Открой таблицу Google Sheets
 * 2. Расширения → Apps Script
 * 3. Удали весь код
 * 4. Вставь этот код
 * 5. Сохрани (Cmd+S или Ctrl+S)
 * 6. Deploy → New deployment → Web app
 * 7. "Кто имеет доступ" → "Все" (Anyone)
 * 8. Deploy
 * 9. Скопируй URL
 * 10. Вставь URL в config.js
 */

function doPost(e) {
  try {
    // Парсим данные из запроса
    const data = JSON.parse(e.postData.contents);
    
    // Открываем таблицу и лист Annotations
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Annotations');
    
    if (!sheet) {
      throw new Error('Лист "Annotations" не найден');
    }
    
    // Добавляем новую строку с данными
    sheet.appendRow([
      data.item_id,
      data.word_mention ? 'TRUE' : 'FALSE',
      data.author_affiliation ? 'TRUE' : 'FALSE',
      data.ip,
      data.timestamp
    ]);
    
    // Возвращаем успех
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Возвращаем ошибку
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Для проверки что скрипт работает (необязательно)
function doGet(e) {
  return ContentService
    .createTextOutput('✅ Apps Script работает!\n\nИспользуй POST запрос для сохранения данных.')
    .setMimeType(ContentService.MimeType.TEXT);
}
