
export type Role = 'SUPPORT' | 'ADMIN' | 'CO_AUDITOR' | 'MEMBER';
export type TransactionType = 'Income' | 'Expense' | 'Investment';
export type PaymentMethod = 'Bank Transfer' | 'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Other';

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
  senderRole: Role;
  text: string;
  timestamp: number;
  isRead?: boolean;
}

export interface AppConfig {
  googleDriveLink: string;
  members: string[];
  lastBackupDate?: number;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const YEARS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034'];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Bank Transfer', 'bKash', 'Nagad', 'Rocket', 'Cash', 'Other'
];

export const INITIAL_MEMBERS = [
  "1. Al-Mamun",
  "2. Al-Mamun-2",
  "3. Wayas Ali",
  "4. Abrar Sayan",
  "5. Arafath",
  "6. SR Shahin",
  "7. Obaydull Mia",
  "8. Shagor Mia",
  "9. Al Shahareia",
  "10. Miraj Hossain",
  "11. Moinul Islam (Suvo)",
  "12. Mamun Mia",
  "13. Amanulla (Aman)",
  "14. Monirul Islam",
  "15. Imran",
  "16. Tariqul Islam",
  "17. Mazharul Islam (Saddam)",
  "18. Mahdi Hasan (Mim)",
  "19. Jasim Uddin",
  "20. Abdullah"
];

export interface AITip {
  title: string;
  advice: string;
  priority: 'High' | 'Medium' | 'Low';
}
