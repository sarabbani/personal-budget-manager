const { createApp, computed, ref, onMounted } = Vue;

const CATEGORIES_KEY = 'budget-manager-categories';
const TRANSACTIONS_FALLBACK_KEY = 'budget-manager-transactions-fallback';

function loadCategories() {
  const raw = localStorage.getItem(CATEGORIES_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse saved categories, reseeding.', e);
    }
  }
  return SEED_CATEGORIES;
}

function loadFallbackTransactions() {
  const raw = localStorage.getItem(TRANSACTIONS_FALLBACK_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function currency(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Each group keeps a fixed color regardless of its rank in a given month —
// referenced as CSS custom properties so light/dark values swap in one place.
const EXPENSE_GROUP_COLORS = {
  Education: 'var(--donut-slot-1)',
  Food: 'var(--donut-slot-2)',
  Entertainment: 'var(--donut-slot-3)',
  Festival: 'var(--donut-slot-4)',
  'Home maintenance': 'var(--donut-slot-5)',
  Misc: 'var(--donut-other)',
};

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

// Builds an SVG path for one donut ring segment, with a small angular inset
// on both ends so the chart surface shows through as a gap between slices.
function donutSlicePath(startAngle, endAngle, cx, cy, outerR, innerR) {
  const span = endAngle - startAngle;
  const pad = Math.min(1.5, span * 0.15);
  const a0 = startAngle + pad;
  const a1 = endAngle - pad;
  const largeArc = a1 - a0 > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerR, a0);
  const outerEnd = polarToCartesian(cx, cy, outerR, a1);
  const innerEnd = polarToCartesian(cx, cy, innerR, a1);
  const innerStart = polarToCartesian(cx, cy, innerR, a0);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

createApp({
  setup() {
    const categories = ref(loadCategories());
    const transactions = ref([]);
    const selectedMonth = ref(currentMonthValue());

    // File connection state: 'checking' | 'unsupported' | 'disconnected' | 'needs-permission' | 'connected'
    const fileStatus = ref('checking');
    const fileName = ref('');
    let fileHandle = null;

    const form = ref({
      type: 'expense',
      category: '',
      date: new Date().toISOString().slice(0, 10),
      amount: '',
      notes: '',
    });

    const newCategory = ref({ name: '', type: 'expense', monthlyBudget: '' });

    function persistCategories() {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories.value));
    }

    async function persistTransactions() {
      if (fileStatus.value === 'connected' && fileHandle) {
        await CsvStorage.writeTransactions(fileHandle, transactions.value);
      } else {
        localStorage.setItem(TRANSACTIONS_FALLBACK_KEY, JSON.stringify(transactions.value));
      }
    }

    const categoriesByType = computed(() => (type) =>
      categories.value.filter((c) => c.type === type)
    );

    const filteredTransactions = computed(() =>
      transactions.value
        .filter((t) => t.date.slice(0, 7) === selectedMonth.value)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
    );

    const monthTotals = computed(() => {
      const income = filteredTransactions.value
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = filteredTransactions.value
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return { income, expense, savings: income - expense };
    });

    const budgetTotals = computed(() => {
      const income = categories.value
        .filter((c) => c.type === 'income')
        .reduce((sum, c) => sum + Number(c.monthlyBudget), 0);
      const expense = categories.value
        .filter((c) => c.type === 'expense')
        .reduce((sum, c) => sum + Number(c.monthlyBudget), 0);
      return { income, expense, savings: income - expense };
    });

    const hoveredSlice = ref(null);

    const expenseBreakdown = computed(() => {
      const totals = new Map();
      filteredTransactions.value
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
          const group = CATEGORY_TO_GROUP[t.category] || 'Misc';
          totals.set(group, (totals.get(group) || 0) + Number(t.amount));
        });

      const shown = [...totals.entries()]
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

      const total = shown.reduce((sum, e) => sum + e.amount, 0);
      if (total <= 0) return { total: 0, slices: [] };

      const cx = 100;
      const cy = 100;
      const outerR = 90;
      const innerR = 56;
      let cursor = 0;
      return {
        total,
        slices: shown.map((e) => {
          const startAngle = (cursor / total) * 360;
          cursor += e.amount;
          let endAngle = (cursor / total) * 360;
          if (endAngle - startAngle >= 359.99) endAngle = startAngle + 359.99;
          return {
            name: e.name,
            amount: e.amount,
            pct: Math.round((e.amount / total) * 1000) / 10,
            color: EXPENSE_GROUP_COLORS[e.name] || EXPENSE_GROUP_COLORS.Misc,
            path: donutSlicePath(startAngle, endAngle, cx, cy, outerR, innerR),
          };
        }),
      };
    });

    const hoveredSliceData = computed(
      () => expenseBreakdown.value.slices.find((s) => s.name === hoveredSlice.value) || null
    );

    const categoryBreakdown = computed(() => {
      return categories.value.map((c) => {
        const actual = filteredTransactions.value
          .filter((t) => t.category === c.name)
          .reduce((sum, t) => sum + Number(t.amount), 0);
        return {
          ...c,
          actual,
          remaining: Number(c.monthlyBudget) - actual,
          pct: c.monthlyBudget > 0 ? Math.min(100, Math.round((actual / c.monthlyBudget) * 100)) : 0,
        };
      });
    });

    async function addTransaction() {
      if (!form.value.category || !form.value.amount || !form.value.date) return;
      transactions.value.push({
        id: `txn-${Date.now()}`,
        type: form.value.type,
        category: form.value.category,
        date: form.value.date,
        amount: Number(form.value.amount),
        notes: form.value.notes.trim(),
      });
      await persistTransactions();
      form.value.amount = '';
      form.value.notes = '';
    }

    async function deleteTransaction(id) {
      transactions.value = transactions.value.filter((t) => t.id !== id);
      await persistTransactions();
    }

    function addCategory() {
      if (!newCategory.value.name.trim()) return;
      categories.value.push({
        id: `cat-${Date.now()}`,
        name: newCategory.value.name.trim(),
        type: newCategory.value.type,
        monthlyBudget: Number(newCategory.value.monthlyBudget) || 0,
      });
      persistCategories();
      newCategory.value = { name: '', type: 'expense', monthlyBudget: '' };
    }

    function deleteCategory(id) {
      const cat = categories.value.find((c) => c.id === id);
      const inUse = cat && transactions.value.some((t) => t.category === cat.name);
      if (inUse) {
        alert('This category has transactions against it and cannot be deleted.');
        return;
      }
      categories.value = categories.value.filter((c) => c.id !== id);
      persistCategories();
    }

    async function connectFile() {
      try {
        fileHandle = await CsvStorage.pickFile();
        fileName.value = fileHandle.name;
        transactions.value = await CsvStorage.readTransactions(fileHandle);
        fileStatus.value = 'connected';
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Failed to connect CSV file', e);
      }
    }

    async function reconnectFile() {
      if (!fileHandle) return;
      const granted = await CsvStorage.requestPermission(fileHandle);
      if (granted === 'granted') {
        transactions.value = await CsvStorage.readTransactions(fileHandle);
        fileStatus.value = 'connected';
      }
    }

    function disconnectFile() {
      CsvStorage.clearHandle();
      fileHandle = null;
      fileName.value = '';
      fileStatus.value = 'disconnected';
    }

    onMounted(async () => {
      if (!localStorage.getItem(CATEGORIES_KEY)) persistCategories();
      form.value.category = categoriesByType.value('expense')[0]?.name || '';

      if (!CsvStorage.isSupported()) {
        fileStatus.value = 'unsupported';
        transactions.value = loadFallbackTransactions();
        return;
      }

      const handle = await CsvStorage.loadHandle();
      if (!handle) {
        fileStatus.value = 'disconnected';
        transactions.value = loadFallbackTransactions();
        return;
      }

      fileHandle = handle;
      fileName.value = handle.name;
      const granted = await CsvStorage.queryPermission(handle);
      if (granted === 'granted') {
        transactions.value = await CsvStorage.readTransactions(handle);
        fileStatus.value = 'connected';
      } else {
        fileStatus.value = 'needs-permission';
        transactions.value = loadFallbackTransactions();
      }
    });

    return {
      categories,
      transactions,
      selectedMonth,
      form,
      newCategory,
      categoriesByType,
      filteredTransactions,
      monthTotals,
      budgetTotals,
      categoryBreakdown,
      expenseBreakdown,
      hoveredSlice,
      hoveredSliceData,
      addTransaction,
      deleteTransaction,
      addCategory,
      deleteCategory,
      currency,
      fileStatus,
      fileName,
      connectFile,
      reconnectFile,
      disconnectFile,
    };
  },
}).mount('#app');
