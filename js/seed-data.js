// Default categories seeded from the household's existing budget spreadsheet.
// Amounts are monthly (annual expense items are divided by 12).
const SEED_CATEGORIES = [
  // Income
  { name: 'Salary', type: 'income', monthlyBudget: 393000 },
  { name: 'Rent', type: 'income', monthlyBudget: 21600 },
  { name: 'Bank Interest & Stock', type: 'income', monthlyBudget: 2000 },
  { name: 'Coding class', type: 'income', monthlyBudget: 11000 },
  { name: 'Byval consulting', type: 'income', monthlyBudget: 10000 },

  // Expense (converted from annual budget)
  { name: 'LIC', type: 'expense', monthlyBudget: round2(32869 / 12) },
  { name: 'Home expense (wife)', type: 'expense', monthlyBudget: round2(132000 / 12) },
  { name: 'Home expense (amma)', type: 'expense', monthlyBudget: round2(108000 / 12) },
  { name: 'Neha School expense', type: 'expense', monthlyBudget: round2(260000 / 12) },
  { name: 'Raahil School Expense', type: 'expense', monthlyBudget: round2(115000 / 12) },
  { name: 'Raahil Van fees', type: 'expense', monthlyBudget: round2(42000 / 12) },
  { name: 'Neha Van Fees', type: 'expense', monthlyBudget: round2(42000 / 12) },
  { name: 'Property / Water tax', type: 'expense', monthlyBudget: round2(12000 / 12) },
  { name: 'Big basket', type: 'expense', monthlyBudget: round2(50000 / 12) },
  { name: '2 wheeler Fuel expense', type: 'expense', monthlyBudget: round2(5000 / 12) },
  { name: '4 wheeler fuel & Travel expense', type: 'expense', monthlyBudget: round2(35000 / 12) },
  { name: 'Chekku oil', type: 'expense', monthlyBudget: round2(15000 / 12) },
  { name: 'Non veg', type: 'expense', monthlyBudget: round2(25000 / 12) },
  { name: 'Medicines', type: 'expense', monthlyBudget: round2(75000 / 12) },
  { name: 'Entertainment', type: 'expense', monthlyBudget: round2(20000 / 12) },
  { name: 'Bakrid expenses', type: 'expense', monthlyBudget: round2(30000 / 12) },
  { name: 'Ramzan expenses', type: 'expense', monthlyBudget: round2(30000 / 12) },
  { name: 'Ramzan Jakkath', type: 'expense', monthlyBudget: round2(15000 / 12) },
  { name: 'Family function', type: 'expense', monthlyBudget: round2(30000 / 12) },
  { name: 'Shakul education (GKV)', type: 'expense', monthlyBudget: round2(10000 / 12) },
  { name: 'EB charges', type: 'expense', monthlyBudget: round2(14000 / 12) },
  { name: 'Borewell water', type: 'expense', monthlyBudget: 0 },
  { name: 'Bike & Car maintenance', type: 'expense', monthlyBudget: round2(20000 / 12) },
  { name: 'Car insurance', type: 'expense', monthlyBudget: round2(20000 / 12) },
  { name: 'Misc charges', type: 'expense', monthlyBudget: round2(30000 / 12) },
  { name: 'Extra coaching class', type: 'expense', monthlyBudget: 0 },
  { name: 'Internet expense', type: 'expense', monthlyBudget: round2(12000 / 12) },
  { name: 'Mobile & OTT expense', type: 'expense', monthlyBudget: round2(4000 / 12) },
  { name: 'Trip Expenses', type: 'expense', monthlyBudget: round2(50000 / 12) },
  { name: 'Doctor consultation and test', type: 'expense', monthlyBudget: round2(15000 / 12) },
  { name: 'Maid salary', type: 'expense', monthlyBudget: round2(156000 / 12) },
].map((c, i) => ({ id: `seed-${i + 1}`, ...c }));

function round2(n) {
  return Math.round(n * 100) / 100;
}
