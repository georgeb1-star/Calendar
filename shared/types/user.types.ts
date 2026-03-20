export type Role = 'EMPLOYEE' | 'ADMIN' | 'COMPANY_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface UserWithCompany extends User {
  company: Company;
}

export interface JwtPayload {
  userId: string;
  companyId: string;
  role: Role;
  email: string;
  name: string;
}

