'use client';

import { createContext, useContext, type ReactNode } from 'react';

type UserContextValue = {
  id: string;
  email: string | null;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: UserContextValue;
}) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const value = useContext(UserContext);

  if (!value) {
    throw new Error('useUserContext must be used within UserProvider');
  }

  return value;
}
