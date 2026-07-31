export type Role = 'MEMBER' | 'LIBRARIAN' | 'ADMIN';
export type MembershipType = 'STUDENT' | 'FACULTY' | 'PUBLIC';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  identifier: string | null;
  phone: string | null;
  role: Role;
  membershipType: MembershipType;
  status: UserStatus;
  borrowingLimit: number;
  loanPeriodDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Author {
  id: string;
  name: string;
  bio?: string | null;
}
export interface Category {
  id: string;
  name: string;
  description?: string | null;
}
export interface Publisher {
  id: string;
  name: string;
  address?: string | null;
}

export type CopyStatus = 'AVAILABLE' | 'CHECKED_OUT' | 'RESERVED' | 'LOST' | 'DAMAGED';

export interface BookCopy {
  id: string;
  bookId: string;
  accessionNumber: string;
  shelfLocation: string;
  status: CopyStatus;
  acquiredDate?: string | null;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  description?: string | null;
  publicationYear: number;
  edition?: string | null;
  language?: string | null;
  coverImageUrl?: string | null;
  category: Category;
  publisher: Publisher;
  authors: Author[];
  copies?: BookCopy[];
  availableCopies: number;
  totalCopies: number;
}

export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE';

export interface Loan {
  id: string;
  copyId: string;
  userId: string;
  checkoutDate: string;
  dueDate: string;
  returnDate: string | null;
  status: LoanStatus;
  renewalCount: number;
  copy: {
    id: string;
    accessionNumber: string;
    shelfLocation: string;
    status: CopyStatus;
    book: { id: string; title: string; isbn: string };
  };
  user: { id: string; fullName: string; email: string };
  fine?: { id: string; amount: string; status: string } | null;
}

export type ReservationStatus = 'PENDING' | 'READY' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';

export interface Reservation {
  id: string;
  bookId: string;
  userId: string;
  reservationDate: string;
  status: ReservationStatus;
  queuePosition: number;
  readyAt: string | null;
  expiresAt: string | null;
  book: { id: string; title: string; isbn: string };
  user: { id: string; fullName: string; email: string };
}

export interface Eligibility {
  eligible: boolean;
  reasons: string[];
}

export type FineStatus = 'UNPAID' | 'PAID' | 'WAIVED';

export interface Fine {
  id: string;
  loanId: string;
  userId: string;
  amount: string;
  reason: string;
  status: FineStatus;
  paidAt: string | null;
  createdAt: string;
  loan: {
    id: string;
    dueDate: string;
    returnDate: string | null;
    copy: { book: { id: string; title: string; isbn: string } };
  };
  user: { id: string; fullName: string; email: string };
}

export interface Defaulter {
  id: string;
  fullName: string;
  email: string;
  status: UserStatus;
  membershipType: MembershipType;
  outstandingFines: number;
  unpaidFineCount: number;
  overdueLoans: number;
}

export interface AppNotification {
  id: string;
  type: string;
  channel: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  activeLoans: number;
  overdueLoans: number;
  totalBooks: number;
  copyStatus: Record<CopyStatus, number>;
  outstandingFines: number;
  members: number;
  pendingReservations: number;
  readyReservations: number;
  newMemberTrend: { month: string; count: number }[];
}

export interface MostBorrowed {
  book: { id: string; title: string; isbn: string };
  borrowCount: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
