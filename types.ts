
export type Role = 'SUPPORT' | 'ADMIN' | 'CO_AUDITOR' | 'CUSTOMER';
export type TransactionType = 'Income' | 'Expense' | 'Investment';
export type PaymentMethod = 'Bank Account' | 'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Other';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: Role;
  name: string;
}

export interface Transaction {
  id: string;
  memberName: string;
  amount: number;
  category: string;
  date: string;
  month: string;
  year: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  recordedBy: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface AppConfig {
  googleDriveLink: string;
  members: string[];
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const YEARS = ['2024', '2025', '2026', '2027', '2028'];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Bank Account', 'bKash', 'Nagad', 'Rocket', 'Cash', 'Other'
];

export const INITIAL_MEMBERS = [
  "Member 1", "Member 2", "Member 3", "Member 4", "Member 5",
  "Member 6", "Member 7", "Member 8", "Member 9", "Member 10",
  "Member 11", "Member 12", "Member 13", "Member 14", "Member 15",
  "Member 16", "Member 17", "Member 18", "Member 19", "Member 20"
];

export interface AITip {
  title: string;
  advice: string;
  priority: 'High' | 'Medium' | 'Low';
}
