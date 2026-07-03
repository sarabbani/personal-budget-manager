// Reads/writes transactions directly to a CSV file on disk using the
// File System Access API (Chrome/Edge). The picked file handle is
// remembered in IndexedDB so the app can reconnect on future visits
// without re-picking the file every time.
const CsvStorage = (() => {
  const DB_NAME = 'budget-manager-fs';
  const STORE_NAME = 'handles';
  const HANDLE_KEY = 'transactions-csv';
  const CSV_HEADER = 'Date,Type,Category,Amount,Notes';

  function isSupported() {
    return typeof window.showOpenFilePicker === 'function';
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveHandle(handle) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadHandle() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function clearHandle() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function pickFile() {
    // An "open" picker so people select their existing transactions.csv,
    // rather than a "save as" dialog that can default to a different folder
    // and end up creating a fresh, empty file instead.
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }],
    });
    const granted = await handle.requestPermission({ mode: 'readwrite' });
    if (granted !== 'granted') {
      throw new DOMException('Write permission was not granted for the selected file.', 'NotAllowedError');
    }
    await saveHandle(handle);
    return handle;
  }

  async function queryPermission(handle, mode = 'readwrite') {
    return handle.queryPermission({ mode });
  }

  async function requestPermission(handle, mode = 'readwrite') {
    return handle.requestPermission({ mode });
  }

  function toCsvValue(v) {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function transactionsToCsv(transactions) {
    const rows = transactions.map((t) =>
      [t.date, t.type, t.category, t.amount, t.notes].map(toCsvValue).join(',')
    );
    return [CSV_HEADER, ...rows].join('\n') + '\n';
  }

  // Minimal RFC4180-style parser: handles quoted fields with embedded commas/newlines.
  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((c) => c !== ''));
  }

  function csvToTransactions(text) {
    const rows = parseCsv(text);
    if (rows.length <= 1) return [];
    return rows.slice(1).map((r, i) => ({
      id: `csv-${i}-${r[0]}-${r[2]}`,
      date: r[0] || '',
      type: r[1] || 'expense',
      category: r[2] || '',
      amount: Number(r[3]) || 0,
      notes: r[4] || '',
    }));
  }

  async function readTransactions(handle) {
    const file = await handle.getFile();
    const text = await file.text();
    return csvToTransactions(text);
  }

  async function writeTransactions(handle, transactions) {
    const writable = await handle.createWritable();
    await writable.write(transactionsToCsv(transactions));
    await writable.close();
  }

  return {
    isSupported,
    pickFile,
    loadHandle,
    clearHandle,
    queryPermission,
    requestPermission,
    readTransactions,
    writeTransactions,
  };
})();
