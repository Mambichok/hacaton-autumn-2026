const ICONS = {
  chat: '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.2A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>',
  document: '<path d="M6 2.8h8l5 5V21H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 13h8M8 17h8"/>',
  template: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  history: '<path d="M3 11a9 9 0 1 1 2.2 6"/><path d="M3 4v7h7M12 7v5l3 2"/>',
  sparkle: '<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.8c-1.1 1.1-1.9 1.4-1.9 3M12 17h.01"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  paperclip: '<path d="m8 12.5 6.3-6.3a3.2 3.2 0 0 1 4.5 4.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.2-8.2"/>',
  send: '<path d="m3 11 18-8-8 18-2.3-7.7L3 11Z"/><path d="M10.7 13.3 21 3"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3"/>',
  external: '<path d="M13 5h6v6M19 5l-9 9"/><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  file: '<path d="M6 2.8h8l5 5V21H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/>',
  bot: '<rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6M2 11v5M22 11v5"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>'
};

document.querySelectorAll('[data-icon]').forEach((element) => {
  const name = element.dataset.icon;
  if (ICONS[name]) element.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
});

const DOCUMENTS = [];
const UPLOADED_DOCUMENTS = [];

const DEFAULT_TEMPLATES = [
  { title: 'Служебная записка', description: 'Шаблон для оформления служебной записки внутри подразделения.', fields: [['employee', 'ФИО сотрудника'], ['position', 'Должность'], ['recipient', 'Кому адресована'], ['subject', 'Тема записки'], ['details', 'Текст записки', 'textarea'], ['date', 'Дата составления', 'date'] ] },
  { title: 'Заявление на отпуск', description: 'Шаблон заявления на предоставление ежегодного оплачиваемого отпуска.', fields: [['employee', 'ФИО сотрудника'], ['position', 'Должность'], ['start', 'Дата начала отпуска', 'date'], ['end', 'Дата окончания отпуска', 'date'], ['date', 'Дата составления заявления', 'date']] },
  { title: 'Договор поставки', description: 'Шаблон договора поставки товаров и материалов.', fields: [['employee', 'ФИО представителя'], ['position', 'Должность представителя'], ['counterparty', 'Наименование контрагента'], ['subject', 'Предмет поставки'], ['date', 'Дата договора', 'date']] },
  { title: 'Акт выполненных работ', description: 'Шаблон акта приёмки-передачи выполненных работ или оказанных услуг.', fields: [['employee', 'ФИО заказчика'], ['counterparty', 'Наименование исполнителя'], ['subject', 'Перечень выполненных работ'], ['amount', 'Стоимость работ'], ['date', 'Дата составления', 'date']] },
  { title: 'Приказ о приёме на работу', description: 'Шаблон приказа о приёме сотрудника на должность.', fields: [['employee', 'ФИО сотрудника'], ['position', 'Должность'], ['department', 'Подразделение'], ['start', 'Дата начала работы', 'date'], ['date', 'Дата приказа', 'date']] },
  { title: 'Заявление на командировку', description: 'Шаблон заявления о направлении в служебную командировку.', fields: [['employee', 'ФИО сотрудника'], ['position', 'Должность'], ['destination', 'Место командировки'], ['start', 'Дата начала', 'date'], ['end', 'Дата окончания', 'date'], ['date', 'Дата заявления', 'date']] },
  { title: 'Доверенность', description: 'Шаблон доверенности на получение документов и представление интересов.', fields: [['employee', 'ФИО доверителя'], ['representative', 'ФИО представителя'], ['details', 'Полномочия представителя', 'textarea'], ['end', 'Действительна до', 'date'], ['date', 'Дата составления', 'date']] },
  { title: 'Согласие на обработку персональных данных', description: 'Шаблон согласия на обработку персональных данных сотрудника.', fields: [['employee', 'ФИО сотрудника'], ['purpose', 'Цель обработки данных'], ['date', 'Дата составления', 'date']] },
  { title: 'Должностная инструкция', description: 'Шаблон должностной инструкции для новых сотрудников.', fields: [['employee', 'ФИО сотрудника'], ['position', 'Должность'], ['department', 'Подразделение'], ['details', 'Основные обязанности', 'textarea'], ['date', 'Дата составления', 'date']] }
];
const TEMPLATE_STORAGE_KEY = 'centrInvestDemoTemplates';
const TEMPLATES = loadTemplates();

const STORAGE_KEY = 'centrInvestDemoDialogs';
const HISTORY_SAVING_KEY = 'centrInvestSaveHistory';
const STARTER_ID = 'demo-opening-account';
const starterDialog = {
  id: `dialog-${Date.now()}`,
  title: 'Новый диалог',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: []
};

function loadHistorySavingPreference() {
  try {
    return localStorage.getItem(HISTORY_SAVING_KEY) !== 'false';
  } catch (error) {
    console.warn('Не удалось прочитать настройку сохранения истории.', error);
    return true;
  }
}

let historySavingEnabled = loadHistorySavingPreference();
let dialogs = loadDialogs();
let currentDialogId = dialogs[0]?.id ?? null;
let activeTemplate = null;
let previousFocus = null;
let isAdminMode = false;
let adminRole = null;
let isChatListOpen = false;
const screenInfo = {
  chat: { title: 'Интеллектуальный помощник по регламентам', icon: 'sparkle', subtitle: '' },
  documents: { title: 'Документы и регламенты', icon: 'document', subtitle: '' },
  templates: { title: 'Шаблоны документов', icon: 'document', subtitle: 'Выберите шаблон, чтобы подготовить черновик документа.' },
  history: { title: 'История диалогов', icon: 'history', subtitle: '' }
};

function loadTemplates() {
  try {
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((template) =>
        template && typeof template.title === 'string' &&
        typeof template.description === 'string' && Array.isArray(template.fields)
      )) return parsed;
    }
  } catch (error) {
    console.warn('Не удалось прочитать демонстрационные шаблоны из localStorage.', error);
  }
  return structuredClone(DEFAULT_TEMPLATES);
}

function persistTemplates() {
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(TEMPLATES));
    return true;
  } catch (error) {
    console.error('Не удалось сохранить демонстрационные шаблоны.', error);
    showToast('Не удалось сохранить изменения шаблонов в этом браузере.', true);
    return false;
  }
}

function loadDialogs() {
  try {
    if (!historySavingEnabled) {
      localStorage.removeItem(STORAGE_KEY);
      return [structuredClone(starterDialog)];
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter((dialog) => dialog && dialog.id !== STARTER_ID && typeof dialog.id === 'string' && Array.isArray(dialog.messages));
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify([starterDialog]));
  } catch (error) {
    console.warn('Не удалось прочитать демонстрационную историю из localStorage.', error);
  }
  return [structuredClone(starterDialog)];
}

function persistDialogs() {
  try {
    if (historySavingEnabled) localStorage.setItem(STORAGE_KEY, JSON.stringify(dialogs));
    else localStorage.removeItem(STORAGE_KEY);
    renderSidebarChatList();
    return true;
  } catch (error) {
    console.error('Не удалось сохранить демонстрационную историю.', error);
    showToast('Не удалось сохранить историю в этом браузере.', true);
    return false;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function icon(name, extraClass = '') {
  return `<svg class="${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' error' : ''}`;
  toast.textContent = message;
  document.getElementById('toastRegion').append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function setScreen(name) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('active', screen.id === `screen-${name}`));
  document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.section === name));
  const info = screenInfo[name];
  document.getElementById('pageTitle').textContent = info.title;
  document.getElementById('pageSubtitle').textContent = info.subtitle;
  document.getElementById('headingIcon').innerHTML = icon(info.icon);
  document.getElementById('sidebar').classList.remove('menu-open');
  document.getElementById('menuBackdrop').classList.remove('visible');
  renderSidebarChatList();
  if (name === 'chat') renderChat();
  if (name === 'history') renderHistory();
}

function makeDialog() {
  const dialog = createBlankDialog();
  dialogs.unshift(dialog);
  currentDialogId = dialog.id;
  persistDialogs();
  setScreen('chat');
  document.getElementById('messageInput').focus();
}

function createBlankDialog() {
  return {
    id: crypto.randomUUID?.() || `dialog-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: 'Новый диалог',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: []
  };
}

function findSensitiveData(text) {
  const patterns = [
    ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
    ['телефон', /(?<!\d)(?:\+7|8)[\s(.-]*\d{3}[\s).-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?!\d)/],
    ['СНИЛС', /(?<!\d)\d{3}[- ]?\d{3}[- ]?\d{3}[- ]?\d{2}(?!\d)/],
    ['ИНН', /(?<!\d)\d{10}(?:\d{2})?(?!\d)/],
    ['паспортные данные', /паспорт.{0,20}\b\d{2}\s?\d{2}\s?\d{6}\b/i]
  ];
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function renderChat() {
  const container = document.getElementById('chatContent');
  const dialog = dialogs.find((item) => item.id === currentDialogId);
  container.replaceChildren();
  if (!dialog || dialog.messages.length === 0) {
    const intro = document.createElement('div');
    intro.className = 'empty-state chat-welcome';
    intro.innerHTML = '<strong>Чем я могу помочь?</strong><br>Задайте вопрос о документах, регламентах или шаблонах.';
    container.append(intro);
    return;
  }
  dialog.messages.forEach((message) => container.append(createMessageElement(message)));
  container.scrollTop = container.scrollHeight;
}

function createMessageElement(message) {
  const row = document.createElement('article');
  row.className = `chat-row ${message.role}`;
  if (message.role === 'assistant') {
    const avatar = document.createElement('span');
    avatar.className = 'assistant-avatar';
    avatar.innerHTML = icon('bot');
    row.append(avatar);
  }
  const column = document.createElement('div');
  column.className = 'message-column';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = message.text;
  column.append(bubble);
  if (message.role === 'assistant' && Array.isArray(message.sources) && message.sources.length) {
    column.append(createSourceBox(message.sources));
  }
  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = message.time || formatTime(message.createdAt || Date.now());
  column.append(time);
  row.append(column);
  return row;
}

function createSourceBox(sources) {
  const box = document.createElement('div');
  box.className = 'source-tooltip';
  const button = document.createElement('button');
  button.className = 'source-help-button';
  button.type = 'button';
  button.setAttribute('aria-label', 'Показать источники ответа');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span aria-hidden="true">?</span>';

  const popup = document.createElement('div');
  popup.className = 'source-popover';
  popup.setAttribute('role', 'tooltip');
  popup.hidden = true;
  sources.forEach((source) => {
    if (!source || typeof source.title !== 'string') return;
    const item = document.createElement('div');
    item.className = 'source-popover-item';
    const title = document.createElement('strong');
    title.textContent = source.title;
    item.append(title);
    if (typeof source.reference === 'string' && source.reference) {
      const reference = document.createElement('small');
      reference.textContent = source.reference;
      item.append(reference);
    }
    const download = document.createElement('a');
    download.href = `/api/documents/${encodeURIComponent(source.title)}/download`;
    download.download = source.title;
    download.textContent = 'Скачать документ';
    item.append(download);
    popup.append(item);
  });

  let isClickOpen = false;
  const updateVisibility = () => {
    const visible = isClickOpen || box.matches(':hover') || box.contains(document.activeElement);
    popup.hidden = !visible;
    button.setAttribute('aria-expanded', String(visible));
  };
  button.addEventListener('click', () => {
    isClickOpen = !isClickOpen;
    updateVisibility();
  });
  box.addEventListener('pointerenter', updateVisibility);
  box.addEventListener('pointerleave', updateVisibility);
  box.addEventListener('focusin', updateVisibility);
  box.addEventListener('focusout', () => window.setTimeout(updateVisibility, 0));
  box.append(button, popup);
  return box;
}

async function sendMessage(text) {
  const cleanText = text.trim();
  if (!cleanText) return;
  const sensitiveFields = findSensitiveData(cleanText);
  if (sensitiveFields.length) {
    showToast(
      `Не отправлено: обнаружены возможные персональные данные (${sensitiveFields.join(', ')}). Удалите их перед отправкой.`,
      true
    );
    return;
  }
  let dialog = dialogs.find((item) => item.id === currentDialogId);
  if (!dialog) {
    dialog = { id: `dialog-${Date.now()}`, title: 'Новый диалог', createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
    dialogs.unshift(dialog);
    currentDialogId = dialog.id;
  }
  const history = dialog.messages.slice(-6).map((message) => ({
    role: message.role,
    content: message.text.slice(0, 1200)
  }));
  const timestamp = Date.now();
  dialog.messages.push({ role: 'user', text: cleanText, createdAt: timestamp, time: formatTime(timestamp) });
  if (dialog.title === 'Новый диалог') dialog.title = cleanText.slice(0, 58);
  dialog.updatedAt = timestamp;
  persistDialogs();
  renderChat();
  const container = document.getElementById('chatContent');
  const typing = document.createElement('div');
  typing.className = 'chat-row assistant';
  typing.id = `typing-${timestamp}`;
  typing.innerHTML = `<span class="assistant-avatar">${icon('bot')}</span><div class="typing-bubble" role="status" aria-label="Обработка вопроса"><span></span><span></span><span></span></div>`;
  container.append(typing);
  container.scrollTop = container.scrollHeight;
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: cleanText, history })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Сервер не смог обработать вопрос.');
    const answer = typeof result.answer === 'string' ? result.answer.trim() : '';
    if (!answer) throw new Error('Сервер вернул пустой ответ.');
    const sources = Array.isArray(result.sources)
      ? result.sources.filter((source) => source && typeof source.title === 'string')
      : [];
    dialog.messages.push({
      role: 'assistant',
      text: answer,
      sources,
      createdAt: Date.now(),
      time: formatTime(Date.now())
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось связаться с сервером.';
    dialog.messages.push({ role: 'assistant', text: `Не удалось получить ответ: ${message}`, createdAt: Date.now(), time: formatTime(Date.now()) });
    showToast(message, true);
  } finally {
    document.getElementById(typing.id)?.remove();
    dialog.updatedAt = Date.now();
    persistDialogs();
    if (currentDialogId === dialog.id) renderChat();
  }
}

function formatTime(value) {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function renderDocuments(filter = '') {
  const grid = document.getElementById('documentGrid');
  const normalized = filter.trim().toLocaleLowerCase('ru');
  const documents = [...UPLOADED_DOCUMENTS, ...DOCUMENTS].filter((doc) => `${doc.title} ${doc.description}`.toLocaleLowerCase('ru').includes(normalized));
  grid.innerHTML = documents.map((doc, index) => `<article class="document-card"><span class="file-icon">${icon('file')}<span class="file-label">${escapeHTML(doc.source?.split('.').pop()?.toUpperCase() || 'PDF')}</span></span><h2>${escapeHTML(doc.title)}</h2><p>${escapeHTML(doc.description)}</p><div class="document-meta">${icon('calendar')}Обновлено ${escapeHTML(doc.date)}</div><div class="document-actions"><button class="primary-button" type="button" data-read-document="${index}">${icon('external')}Читать</button><a class="download-document-button" href="/api/documents/${encodeURIComponent(doc.source)}/download" download="${escapeHTML(doc.source)}" aria-label="Скачать ${escapeHTML(doc.title)}" title="Скачать">${icon('download')}</a></div></article>`).join('');
  document.getElementById('documentsEmpty').hidden = documents.length > 0;
  grid.querySelectorAll('[data-read-document]').forEach((button) => button.addEventListener('click', () => {
    const documentItem = documents[Number(button.dataset.readDocument)];
    showDocumentModal(documentItem);
  }));
}

function renderTemplates(filter = '') {
  const grid = document.getElementById('templateGrid');
  const normalized = filter.trim().toLocaleLowerCase('ru');
  const templates = TEMPLATES.filter((item) => `${item.title} ${item.description}`.toLocaleLowerCase('ru').includes(normalized));
  document.getElementById('addTemplateButton').hidden = !isAdminMode;
  grid.innerHTML = templates.map((item) => {
    const templateIndex = TEMPLATES.indexOf(item);
    const isPdf = ['Заявление на отпуск', 'Акт выполненных работ', 'Заявление на командировку', 'Согласие на обработку персональных данных'].includes(item.title) || item.format === 'PDF';
    const managementButtons = isAdminMode
      ? `<div class="template-card-actions"><button class="template-action-button" type="button" data-edit-template="${templateIndex}" aria-label="Редактировать шаблон ${escapeHTML(item.title)}" title="Редактировать">${icon('edit')}</button><button class="template-action-button delete" type="button" data-delete-template="${templateIndex}" aria-label="Удалить шаблон ${escapeHTML(item.title)}" title="Удалить">${icon('trash')}</button></div>`
      : '';
    return `<article class="template-card${isAdminMode ? ' admin-template-card' : ''}">${managementButtons}<span class="file-icon ${isPdf ? '' : 'word'}">${icon('file')}<span class="file-label">${isPdf ? 'PDF' : 'W'}</span></span><h2>${escapeHTML(item.title)}</h2><p>${escapeHTML(item.description)}</p><button class="primary-button" type="button" data-prepare-template="${templateIndex}">${icon('file')}Подготовить документ</button></article>`;
  }).join('');
  document.getElementById('templatesEmpty').hidden = templates.length > 0;
  grid.querySelectorAll('[data-prepare-template]').forEach((button) => button.addEventListener('click', () => openTemplateModal(TEMPLATES[Number(button.dataset.prepareTemplate)])));
  grid.querySelectorAll('[data-edit-template]').forEach((button) => button.addEventListener('click', () => openTemplateAdminModal(Number(button.dataset.editTemplate))));
  grid.querySelectorAll('[data-delete-template]').forEach((button) => button.addEventListener('click', () => confirmDeleteTemplate(Number(button.dataset.deleteTemplate))));
}

function openTemplateAdminModal(templateIndex = null) {
  const template = templateIndex === null ? null : TEMPLATES[templateIndex];
  if (templateIndex !== null && !template) return;
  const isEditing = template !== null;
  openModal(`<span class="demo-label">ДЕМОНСТРАЦИОННЫЙ РЕЖИМ</span><h2 id="modalTitle">${isEditing ? 'Изменить шаблон' : 'Добавить шаблон'}</h2><p>Изменения сохраняются только в этом браузере и не публикуются на сервере.</p><form id="adminTemplateForm"><label class="form-field">Название шаблона<input name="title" type="text" maxlength="100" value="${escapeHTML(template?.title || '')}" required></label><label class="form-field">Описание<textarea name="description" maxlength="240" required>${escapeHTML(template?.description || '')}</textarea></label><label class="form-field">Формат файла<select name="format"><option value="DOCX" ${template?.format !== 'PDF' ? 'selected' : ''}>Word (DOCX)</option><option value="PDF" ${template?.format === 'PDF' ? 'selected' : ''}>PDF</option></select></label><div class="modal-actions"><button class="secondary-action" type="button" data-modal-close>Отмена</button><button class="primary-button" type="submit">${isEditing ? 'Сохранить' : 'Добавить шаблон'}</button></div></form>`, () => {
    document.getElementById('adminTemplateForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const title = String(formData.get('title')).trim();
      const description = String(formData.get('description')).trim();
      const format = String(formData.get('format'));
      if (!title || !description) {
        showToast('Заполните название и описание шаблона.', true);
        return;
      }
      if (isEditing) {
        TEMPLATES[templateIndex] = { ...template, title, description, format };
      } else {
        TEMPLATES.push({
          title,
          description,
          format,
          fields: [['employee', 'ФИО сотрудника'], ['details', 'Дополнительная информация', 'textarea'], ['date', 'Дата составления', 'date']]
        });
      }
      if (!persistTemplates()) return;
      closeModal();
      renderTemplates(document.getElementById('templateSearch').value);
      showToast(isEditing ? 'Изменения шаблона сохранены в этом браузере.' : 'Шаблон добавлен в демонстрационный интерфейс.');
    });
  });
}

function confirmDeleteTemplate(templateIndex) {
  const template = TEMPLATES[templateIndex];
  if (!template) return;
  openModal(`<h2 id="modalTitle">Удалить шаблон?</h2><p>Шаблон «${escapeHTML(template.title)}» будет удалён из демонстрационного интерфейса этого браузера.</p><div class="modal-actions"><button class="secondary-action" type="button" data-modal-close>Отмена</button><button class="primary-button danger-button" type="button" id="confirmDeleteTemplate">Удалить</button></div>`, () => {
    document.getElementById('confirmDeleteTemplate').addEventListener('click', () => {
      TEMPLATES.splice(templateIndex, 1);
      if (!persistTemplates()) return;
      closeModal();
      renderTemplates(document.getElementById('templateSearch').value);
      showToast('Шаблон удалён из демонстрационного интерфейса.');
    });
  });
}

function groupFor(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  if (date.toDateString() === now.toDateString()) return 'Сегодня';
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  return date >= startOfWeek ? 'На этой неделе' : 'Ранее';
}

function sourcesForDialog(dialog) {
  const sources = new Map();
  dialog.messages.forEach((message) => {
    if (message.role !== 'assistant' || !Array.isArray(message.sources)) return;
    message.sources.forEach((source) => {
      if (!source || typeof source.title !== 'string') return;
      const key = `${source.title}\u0000${source.reference || ''}`;
      if (!sources.has(key)) sources.set(key, source);
    });
  });
  return [...sources.values()];
}

function renderSidebarChatList() {
  const list = document.getElementById('sidebarChatList');
  if (!list) return;
  const recentDialogs = [...dialogs].sort((a, b) => b.updatedAt - a.updatedAt);
  list.innerHTML = recentDialogs.length
    ? recentDialogs.map((dialog) => {
      const preview = dialog.messages.at(-1)?.text || 'Новый диалог';
      return `<button class="sidebar-chat-item${dialog.id === currentDialogId ? ' active' : ''}" type="button" data-sidebar-dialog="${escapeHTML(dialog.id)}"><strong>${escapeHTML(dialog.title)}</strong><small>${escapeHTML(preview)}</small></button>`;
    }).join('')
    : '<p class="sidebar-chat-empty">Чатов пока нет</p>';
  list.hidden = !isChatListOpen;
  list.querySelectorAll('[data-sidebar-dialog]').forEach((button) => button.addEventListener('click', () => {
    currentDialogId = button.dataset.sidebarDialog;
    setScreen('chat');
  }));
}

function historyDate(timestamp) {
  const date = new Date(timestamp);
  if (date.toDateString() === new Date().toDateString()) return `Сегодня, ${formatTime(timestamp)}`;
  return `${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date)}, ${formatTime(timestamp)}`;
}

function renderHistory(filter = '') {
  const container = document.getElementById('historyList');
  const normalized = filter.trim().toLocaleLowerCase('ru');
  const filtered = dialogs.filter((dialog) => `${dialog.title} ${dialog.messages.at(-1)?.text || ''}`.toLocaleLowerCase('ru').includes(normalized))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  if (filtered.length === 0) {
    container.innerHTML = `<div class="history-empty"><strong>${dialogs.length ? 'Ничего не найдено' : 'История пока пуста'}</strong><span>${dialogs.length ? 'Измените поисковый запрос или создайте новый диалог.' : 'Создайте новый диалог, чтобы начать общение.'}</span><button class="primary-button" type="button" id="emptyHistoryNewChat">${dialogs.length ? 'Новый диалог' : 'Создать диалог'}</button></div>`;
    document.getElementById('emptyHistoryNewChat').addEventListener('click', makeDialog);
    return;
  }
  const groups = ['Сегодня', 'На этой неделе', 'Ранее'];
  container.innerHTML = groups.map((group) => {
    const entries = filtered.filter((dialog) => groupFor(dialog.updatedAt) === group);
    if (!entries.length) return '';
    return `<section class="history-group"><h2>${group}</h2>${entries.map((dialog) => {
      const lastMessage = dialog.messages.at(-1)?.text || 'Новый диалог';
      const sources = sourcesForDialog(dialog);
      const sourceList = sources.length
        ? sources.map((source) => `<div class="history-source"><strong>${escapeHTML(source.title)}</strong>${source.reference ? `<small>${escapeHTML(source.reference)}</small>` : ''}<a href="/api/documents/${encodeURIComponent(source.title)}/download" download="${escapeHTML(source.title)}">Скачать</a></div>`).join('')
        : '<p class="history-no-sources">В этом чате нет ответов со ссылками на документы.</p>';
      return `<article class="history-entry"><div class="history-item"><span class="history-chat-icon">${icon('chat')}</span><div class="history-copy"><strong>${escapeHTML(dialog.title)}</strong><p>${escapeHTML(lastMessage)}</p></div><span class="history-date">${historyDate(dialog.updatedAt)}</span><button class="open-history-button" type="button" data-open-dialog="${escapeHTML(dialog.id)}">${icon('external')} Открыть</button><button class="delete-history-button" type="button" data-delete-dialog="${escapeHTML(dialog.id)}" aria-label="Удалить диалог ${escapeHTML(dialog.title)}" title="Удалить диалог">×</button></div><button class="history-sources-toggle" type="button" data-history-sources="${escapeHTML(dialog.id)}" aria-expanded="false">Источники в этом чате (${sources.length})</button><div class="history-sources" data-history-source-panel="${escapeHTML(dialog.id)}" hidden>${sourceList}</div></article>`;
    }).join('')}</section>`;
  }).join('');
  container.querySelectorAll('[data-open-dialog]').forEach((button) => button.addEventListener('click', () => {
    currentDialogId = button.dataset.openDialog;
    setScreen('chat');
  }));
  container.querySelectorAll('[data-delete-dialog]').forEach((button) => button.addEventListener('click', () => confirmDeleteDialog(button.dataset.deleteDialog)));
  container.querySelectorAll('[data-history-sources]').forEach((button) => button.addEventListener('click', () => {
    const panel = container.querySelector(`[data-history-source-panel="${CSS.escape(button.dataset.historySources)}"]`);
    if (!panel) return;
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    button.textContent = `Источники в этом чате (${sourcesForDialog(dialogs.find((item) => item.id === button.dataset.historySources)).length})`;
    panel.hidden = expanded;
  }));
}

function openModal(content, onReady) {
  previousFocus = document.activeElement;
  document.getElementById('modalContent').innerHTML = `<div class="modal-content">${content}</div>`;
  const layer = document.getElementById('modalLayer');
  layer.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('modalCloseButton').focus();
  if (onReady) onReady();
}

function closeModal() {
  document.getElementById('modalLayer').hidden = true;
  document.body.style.overflow = '';
  previousFocus?.focus?.();
}

function showDocumentModal(documentItem) {
  if (documentItem.indexed) {
    openModal(`<span class="demo-label">ДОКУМЕНТ БАЗЫ ЗНАНИЙ</span><h2 id="modalTitle">${escapeHTML(documentItem.title)}</h2><p>${escapeHTML(documentItem.description)}</p><div class="modal-document-text">Файл доступен для поиска в чате. Задайте вопрос по его содержанию, чтобы получить ответ с источником.</div><div class="modal-actions"><button class="secondary-action" type="button" data-modal-close>Закрыть</button></div>`);
    return;
  }
  openModal(`<span class="demo-label">ДЕМОНСТРАЦИОННЫЙ ДОКУМЕНТ</span><h2 id="modalTitle">${escapeHTML(documentItem.title)}</h2><p>Обновлено ${documentItem.date}</p><div class="modal-document-text">${escapeHTML(documentItem.content)}</div><div class="modal-actions"><button class="secondary-action" type="button" data-modal-close>Закрыть</button></div>`);
}

function showHelpModal() {
  openModal(`<span class="demo-label">КРАТКАЯ ИНСТРУКЦИЯ</span><h2 id="modalTitle">Как пользоваться помощником</h2><p>Ответы в чате формируются по документам, проиндексированным в базе знаний.</p><div class="modal-document-text"><strong>Чат.</strong> Задайте вопрос по внутренним документам. Если в базе нет подтверждения, помощник сообщит об этом.<br><br><strong>Документы и регламенты.</strong> Просматривайте загруженные материалы.<br><br><strong>Загрузка.</strong> В разделе «Документы и регламенты» добавьте DOCX или PDF. После индексации файл сразу станет доступен для поиска в чате.<br><br><strong>История.</strong> Переписка хранится в localStorage этого браузера.</div><div class="modal-actions"><button class="secondary-action" type="button" data-modal-close>Закрыть</button></div>`);
}

function appendCheckReport(filename, result) {
  let dialog = dialogs.find((item) => item.id === currentDialogId);
  if (!dialog) {
    dialog = { id: `dialog-${Date.now()}`, title: 'Новый диалог', createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
    dialogs.unshift(dialog);
    currentDialogId = dialog.id;
  }
  const now = Date.now();
  dialog.messages.push(
    { role: 'user', text: `Проверка документа: ${filename}`, createdAt: now, time: formatTime(now) },
    {
      role: 'assistant',
      text: result.answer,
      sources: Array.isArray(result.sources) ? result.sources : [],
      createdAt: now + 1,
      time: formatTime(now + 1)
    }
  );
  dialog.updatedAt = now + 1;
  persistDialogs();
  setScreen('chat');
  renderChat();
}

function openDocumentCheckModal() {
  openModal(`<h2 id="modalTitle">Проверить документ DOCX</h2><p>Выберите файл и способ проверки. Файл не добавляется в базу знаний.</p><label class="form-field">Документ<input id="checkDocumentFile" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required></label><div class="modal-actions"><button class="secondary-action" type="button" data-check-mode="spelling">Проверить орфографию</button><button class="primary-button" type="button" data-check-mode="requirements">Проверить по базе</button></div>`, () => {
    document.querySelectorAll('[data-check-mode]').forEach((button) => button.addEventListener('click', async (event) => {
      const file = document.getElementById('checkDocumentFile').files[0];
      if (!file) { showToast('Выберите файл DOCX.', true); return; }
      if (!/\.docx$/i.test(file.name)) { showToast('Для проверки выберите файл DOCX.', true); return; }
      const mode = event.currentTarget.dataset.checkMode;
      const submitButtons = [...document.querySelectorAll('[data-check-mode]')];
      submitButtons.forEach((item) => { item.disabled = true; });
      event.currentTarget.textContent = 'Проверяю...';
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('mode', mode);
        const response = await fetch('/api/documents/check', { method: 'POST', body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Не удалось проверить документ.');
        if (typeof result.answer !== 'string' || !result.answer.trim()) throw new Error('Сервер вернул пустой отчёт.');
        closeModal();
        appendCheckReport(file.name, result);
        showToast('Отчёт о проверке добавлен в чат.');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Не удалось проверить документ.', true);
        submitButtons.forEach((item) => { item.disabled = false; });
        event.currentTarget.textContent = mode === 'spelling' ? 'Проверить орфографию' : 'Проверить по базе';
      }
    }));
  });
}

function syncAdminUI(user = null) {
  adminRole = user?.role || null;
  isAdminMode = Boolean(adminRole);
  const button = document.getElementById('adminModeButton');
  button.setAttribute('aria-pressed', String(isAdminMode));
  button.querySelector('span:last-child').textContent = isAdminMode ? 'Выйти из режима администратора' : 'Вход администратора';
  document.getElementById('uploadDocumentButton').hidden = !isAdminMode;
  document.getElementById('manageAdminsButton').hidden = adminRole !== 'superadmin';
  renderTemplates(document.getElementById('templateSearch').value);
}

async function loadAdminSession() {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) throw new Error('Не удалось проверить сессию администратора.');
    const result = await response.json();
    syncAdminUI(result.authenticated ? result : null);
  } catch (error) {
    syncAdminUI();
    showToast(error instanceof Error ? error.message : 'Не удалось проверить вход администратора.', true);
  }
}

function openAdminLoginModal() {
  openModal(`<h2 id="modalTitle">Вход администратора</h2><p>Учетная запись супер-администратора задаётся в файле .env. Администраторы назначаются супер-администратором.</p><form id="adminLoginForm"><label class="form-field">Логин<input name="username" autocomplete="username" required></label><label class="form-field">Пароль<input name="password" type="password" autocomplete="current-password" required></label><div class="modal-actions"><button class="secondary-action" type="button" data-modal-close>Отмена</button><button class="primary-button" type="submit">Войти</button></div></form>`, () => {
    document.getElementById('adminLoginForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const submit = event.currentTarget.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.get('username'), password: form.get('password') })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Не удалось войти.');
        syncAdminUI(result);
        closeModal();
        setScreen('documents');
        showToast(`Вход выполнен: ${result.username}.`);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Не удалось войти.', true);
        submit.disabled = false;
      }
    });
  });
}

async function openAdminManagementModal() {
  openModal(`<h2 id="modalTitle">Управление администраторами</h2><p>Назначать администраторов может только супер-администратор.</p><form id="createAdminForm"><div class="template-form-grid"><label class="form-field">Логин<input name="username" pattern="[A-Za-z0-9._@-]+" minlength="3" maxlength="80" required></label><label class="form-field">Пароль (не менее 14 символов)<input name="password" type="password" minlength="14" maxlength="256" autocomplete="new-password" required></label></div><div class="modal-actions"><button class="primary-button" type="submit">Назначить администратора</button></div></form><div id="adminList" class="admin-list" aria-live="polite">Загружаю список...</div>`);
  try {
    const response = await fetch('/api/admins');
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Не удалось загрузить список администраторов.');
    const list = document.getElementById('adminList');
    list.innerHTML = result.admins.length ? result.admins.map((admin) => `<div class="admin-list-item"><span><strong>${escapeHTML(admin.username)}</strong><small>Назначен: ${escapeHTML(admin.created_at)} · ${escapeHTML(admin.created_by)}</small></span><button class="secondary-action" type="button" data-delete-admin="${escapeHTML(admin.username)}">Удалить</button></div>`).join('') : '<p>Назначенных администраторов пока нет.</p>';
    list.querySelectorAll('[data-delete-admin]').forEach((button) => button.addEventListener('click', async () => {
      if (!window.confirm(`Удалить администратора «${button.dataset.deleteAdmin}»?`)) return;
      try {
        const response = await fetch(`/api/admins/${encodeURIComponent(button.dataset.deleteAdmin)}`, { method: 'DELETE' });
        const result = response.status === 204 ? {} : await response.json();
        if (!response.ok) throw new Error(result.detail || 'Не удалось удалить администратора.');
        await openAdminManagementModal();
        showToast('Доступ администратора отозван.');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Не удалось удалить администратора.', true);
      }
    }));
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Не удалось загрузить список администраторов.', true);
  }

  document.getElementById('createAdminForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const response = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Не удалось назначить администратора.');
      await openAdminManagementModal();
      showToast(`Администратор ${result.username} добавлен.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось назначить администратора.', true);
      submit.disabled = false;
    }
  });
}

async function logoutAdmin() {
  try {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (!response.ok) throw new Error('Не удалось завершить сессию.');
    syncAdminUI();
    showToast('Вы вышли из режима администратора.');
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Не удалось завершить сессию.', true);
  }
}

function openUploadModal() {
  openModal(`<h2 id="modalTitle">Добавить документ</h2><p>Документ сохранится на сервере и попадёт в поиск чата. Перед индексацией система проверит текст на распространённые форматы персональных данных. При совпадении загрузка будет остановлена до отправки текста сервису эмбеддингов.</p><p>Проверка не гарантирует обнаружение всех данных и может ошибочно сработать на обычных числах. Перед загрузкой проверьте документ вручную.</p><label class="form-field">Название документа<input id="uploadTitle" type="text" placeholder="Необязательно, по умолчанию — имя файла"></label><label class="form-field">Файл PDF или DOCX<input id="uploadFile" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required></label><div class="modal-actions"><button class="secondary-action" type="button" data-modal-close>Отмена</button><button class="primary-button" type="button" id="confirmUpload">Загрузить и индексировать</button></div>`, () => {
    document.getElementById('confirmUpload').addEventListener('click', async (event) => {
      const title = document.getElementById('uploadTitle').value.trim();
      const file = document.getElementById('uploadFile').files[0];
      if (!file) { showToast('Выберите файл.', true); return; }
      if (!/\.(pdf|docx)$/i.test(file.name)) { showToast('Поддерживаются только файлы PDF и DOCX.', true); return; }
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Индексирую...';
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('title', title);
        const response = await fetch('/api/documents/upload', { method: 'POST', body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Не удалось загрузить документ.');
        UPLOADED_DOCUMENTS.unshift(result.document);
        renderDocuments(document.getElementById('documentSearch').value);
        closeModal();
        showToast(`${result.message} Теперь можно задавать вопросы по документу.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить документ.';
        showToast(message, true);
        button.disabled = false;
        button.textContent = 'Загрузить и индексировать';
      }
    });
  });
}

function openTemplateModal(template) {
  activeTemplate = template;
  const fields = template.fields.map(([name, label, type]) => `<label class="form-field">${escapeHTML(label)}${type === 'textarea' ? `<textarea name="${escapeHTML(name)}" required></textarea>` : `<input name="${escapeHTML(name)}" type="${type || 'text'}" required>`}</label>`).join('');
  openModal(`<span class="demo-label">ДЕМО-ШАБЛОН</span><h2 id="modalTitle">${escapeHTML(template.title)}</h2><p>Заполните обязательные поля. Будет сформирован текстовый черновик .txt.</p><form id="templateForm"><div class="template-form-grid">${fields}</div><div class="preview-content" id="templatePreview" hidden></div><div class="modal-actions"><button class="secondary-action" type="button" data-modal-close>Отмена</button><button class="secondary-action" type="button" id="previewTemplate">Предварительный просмотр</button><button class="primary-button" type="button" id="downloadTemplate">Сформировать документ</button></div></form>`, () => {
    document.getElementById('previewTemplate').addEventListener('click', () => {
      if (!validateTemplateForm()) return;
      const preview = document.getElementById('templatePreview');
      preview.textContent = buildTemplateText();
      preview.hidden = false;
    });
    document.getElementById('downloadTemplate').addEventListener('click', () => {
      if (!validateTemplateForm()) return;
      const content = buildTemplateText();
      try {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${template.title.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu, '-')}.txt`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        closeModal();
        showToast('Текстовый черновик создан и скачан в формате TXT.');
      } catch (error) {
        console.error('Не удалось создать текстовый файл.', error);
        showToast('Не удалось создать файл. Попробуйте ещё раз.', true);
      }
    });
  });
}

function validateTemplateForm() {
  const form = document.getElementById('templateForm');
  if (!form.reportValidity()) {
    showToast('Заполните все обязательные поля.', true);
    return false;
  }
  return true;
}

function buildTemplateText() {
  const form = document.getElementById('templateForm');
  const values = Object.fromEntries(new FormData(form).entries());
  const lines = [`${activeTemplate.title}`, '', 'Демонстрационный черновик', ''];
  activeTemplate.fields.forEach(([name, label]) => lines.push(`${label}: ${values[name]}`));
  lines.push('', 'Документ сформирован в демонстрационном режиме. Перед использованием проверьте сведения и применимость утверждённого шаблона.');
  return lines.join('\n');
}

function confirmDeleteDialog(id) {
  const dialog = dialogs.find((item) => item.id === id);
  if (!dialog) return;
  openModal(`<h2 id="modalTitle">Удалить диалог?</h2><p>Диалог «${escapeHTML(dialog.title)}» будет удалён из истории этого браузера.</p><div class="modal-actions"><button class="secondary-action" type="button" data-modal-close>Отмена</button><button class="primary-button danger-button" type="button" id="confirmDelete">Удалить</button></div>`, () => {
    document.getElementById('confirmDelete').addEventListener('click', () => {
      dialogs = dialogs.filter((item) => item.id !== id);
      if (currentDialogId === id) currentDialogId = dialogs[0]?.id ?? null;
      persistDialogs();
      closeModal();
      renderHistory(document.getElementById('historySearch').value);
      showToast('Диалог удалён из демонстрационной истории.');
    });
  });
}

function confirmClearHistory() {
  openModal('<h2 id="modalTitle">Очистить всю историю?</h2><p>Все диалоги будут удалены из памяти этой страницы и из сохранённой истории этого браузера.</p><div class="modal-actions"><button class="secondary-action" type="button" data-modal-close>Отмена</button><button class="primary-button danger-button" type="button" id="confirmClearHistory">Очистить историю</button></div>', () => {
    document.getElementById('confirmClearHistory').addEventListener('click', () => {
      dialogs = [createBlankDialog()];
      currentDialogId = dialogs[0].id;
      persistDialogs();
      closeModal();
      renderChat();
      renderHistory(document.getElementById('historySearch').value);
      showToast('История диалогов очищена.');
    });
  });
}

document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => setScreen(button.dataset.section)));
document.querySelector('.brand').addEventListener('click', () => setScreen('chat'));
document.getElementById('newChatButton').addEventListener('click', makeDialog);
document.getElementById('chatListToggle').addEventListener('click', (event) => {
  isChatListOpen = !isChatListOpen;
  event.currentTarget.setAttribute('aria-expanded', String(isChatListOpen));
  event.currentTarget.setAttribute('aria-label', isChatListOpen ? 'Скрыть список чатов' : 'Показать список чатов');
  event.currentTarget.title = isChatListOpen ? 'Скрыть список чатов' : 'Показать список чатов';
  event.currentTarget.textContent = isChatListOpen ? '⌃' : '⌄';
  renderSidebarChatList();
});
document.getElementById('chatForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('messageInput');
  sendMessage(input.value);
  input.value = '';
});
document.getElementById('messageInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    document.getElementById('chatForm').requestSubmit();
  }
});
document.getElementById('documentSearch').addEventListener('input', (event) => renderDocuments(event.target.value));
document.getElementById('templateSearch').addEventListener('input', (event) => renderTemplates(event.target.value));
document.getElementById('historySearch').addEventListener('input', (event) => renderHistory(event.target.value));
const historySavingToggle = document.getElementById('historySavingToggle');
historySavingToggle.checked = historySavingEnabled;
historySavingToggle.addEventListener('change', () => {
  historySavingEnabled = historySavingToggle.checked;
  try {
    localStorage.setItem(HISTORY_SAVING_KEY, String(historySavingEnabled));
    if (!historySavingEnabled) {
      localStorage.removeItem(STORAGE_KEY);
      dialogs = [createBlankDialog()];
      currentDialogId = dialogs[0].id;
      renderChat();
      renderHistory(document.getElementById('historySearch').value);
      renderSidebarChatList();
      showToast('Сохранение выключено. Существующая история удалена с этого устройства.');
    } else {
      persistDialogs();
      showToast('Сохранение истории на этом устройстве включено.');
    }
  } catch (error) {
    historySavingEnabled = !historySavingToggle.checked;
    historySavingToggle.checked = historySavingEnabled;
    console.error('Не удалось изменить настройку сохранения истории.', error);
    showToast('Не удалось изменить настройку истории в этом браузере.', true);
  }
});
document.getElementById('clearHistoryButton').addEventListener('click', confirmClearHistory);
document.querySelectorAll('[data-clear]').forEach((button) => {
  const input = document.getElementById(button.dataset.clear);
  input.addEventListener('input', () => { button.hidden = !input.value; });
  button.addEventListener('click', () => { input.value = ''; input.dispatchEvent(new Event('input')); input.focus(); });
});
document.getElementById('uploadDocumentButton').addEventListener('click', openUploadModal);
document.getElementById('checkDocumentButton').addEventListener('click', openDocumentCheckModal);
document.getElementById('manageAdminsButton').addEventListener('click', openAdminManagementModal);
document.getElementById('helpButton').addEventListener('click', showHelpModal);
document.getElementById('globalSearchButton').addEventListener('click', () => {
  const activeScreen = document.querySelector('.screen.active');
  const searchInput = activeScreen?.querySelector('input[type="search"]');
  if (searchInput) searchInput.focus();
  else {
    setScreen('documents');
    document.getElementById('documentSearch').focus();
  }
});
document.getElementById('attachButton').addEventListener('click', () => document.getElementById('chatFileInput').click());
document.getElementById('chatFileInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) showToast(`Файл «${file.name}» выбран. Отправка вложений в демонстрационном режиме недоступна.`);
  event.target.value = '';
});
document.getElementById('emojiButton').addEventListener('click', () => {
  const input = document.getElementById('messageInput');
  input.value += '🙂';
  input.focus();
});
document.getElementById('profileButton').addEventListener('click', () => {
  const menu = document.getElementById('profileMenu');
  const isOpen = !menu.hidden;
  menu.hidden = isOpen;
  document.getElementById('profileButton').setAttribute('aria-expanded', String(!isOpen));
});
document.getElementById('adminModeButton').addEventListener('click', () => {
  if (isAdminMode) {
    logoutAdmin();
    return;
  }
  document.getElementById('profileMenu').hidden = true;
  document.getElementById('profileButton').setAttribute('aria-expanded', 'false');
  openAdminLoginModal();
});
document.getElementById('addTemplateButton').addEventListener('click', () => openTemplateAdminModal());
document.getElementById('exitDemoButton').addEventListener('click', () => {
  document.getElementById('profileMenu').hidden = true;
  if (isAdminMode) logoutAdmin();
  else showToast('Вход в систему сотрудника пока не подключён.');
});
document.getElementById('mobileMenuButton').addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('menu-open');
  document.getElementById('menuBackdrop').classList.add('visible');
});
document.getElementById('menuBackdrop').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('menu-open');
  document.getElementById('menuBackdrop').classList.remove('visible');
});
document.getElementById('modalCloseButton').addEventListener('click', closeModal);
document.getElementById('modalLayer').addEventListener('click', (event) => {
  if (event.target.matches('[data-modal-close]')) closeModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!document.getElementById('modalLayer').hidden) closeModal();
    document.getElementById('profileMenu').hidden = true;
    document.getElementById('profileButton').setAttribute('aria-expanded', 'false');
    document.getElementById('sidebar').classList.remove('menu-open');
    document.getElementById('menuBackdrop').classList.remove('visible');
  }
});

renderDocuments();
renderTemplates();
renderSidebarChatList();
renderChat();
loadAdminSession();
fetch('/api/documents')
  .then(async (response) => {
    if (!response.ok) throw new Error('Не удалось загрузить список документов с сервера.');
    const result = await response.json();
    if (!Array.isArray(result.documents)) throw new Error('Сервер вернул некорректный список документов.');
    UPLOADED_DOCUMENTS.splice(0, UPLOADED_DOCUMENTS.length, ...result.documents);
    renderDocuments(document.getElementById('documentSearch').value);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : 'Не удалось подключиться к серверу.';
    showToast(message, true);
  });
