
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
  "Md. Abdur Rahman", 
  "Md. Karim Hasan", 
  "Md. Shafiqul Islam", 
  "Md. Jahangir Alam", 
  "Md. Rafiqul Islam", 
  "Md. Mofizur Rahman", 
  "Md. Nazmul Haque", 
  "Md. Kamal Hossain", 
  "Md. Saiful Islam", 
  "Md. Arifur Rahman", 
  "Md. Monirul Islam", 
  "Md. Faruk Ahmed", 
  "Md. Tanvir Ahmed", 
  "Md. Mahbubur Rahman", 
  "Md. Shahidul Islam", 
  "Md. Nasir Uddin", 
  "Md. Delwar Hossain", 
  "Md. Tariqul Islam", 
  "Md. Sohel Rana", 
  "Md. Emdadul Haque"
];

export interface AITip {
  title: string;
  advice: string;
  priority: 'High' | 'Medium' | 'Low';
}
