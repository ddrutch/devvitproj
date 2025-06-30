import { createContext, useContext, useState } from 'react';
import { Page } from '../shared';

const PageContext = createContext<{ page: Page; params?: any } | null>(null);
const PageUpdaterContext = createContext<((page: Page, params?: any) => void) | null>(null);

export const PageContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [pageState, setPageState] = useState<{ page: Page; params?: any }>({ page: 'battle' });

  const setPage = (page: Page, params?: any) => {
    setPageState({ page, params });
  };

  return (
    <PageUpdaterContext.Provider value={setPage}>
      <PageContext.Provider value={pageState}>{children}</PageContext.Provider>
    </PageUpdaterContext.Provider>
  );
};

export const usePage = () => {
  const context = useContext(PageContext);
  if (context === null) {
    throw new Error('usePage must be used within a PageContextProvider');
  }
  return context.page;
};

export const usePageParams = () => {
  const context = useContext(PageContext);
  if (context === null) {
    throw new Error('usePageParams must be used within a PageContextProvider');
  }
  return context.params;
};

export const useSetPage = () => {
  const setPage = useContext(PageUpdaterContext);
  if (setPage === null) {
    throw new Error('useSetPage must be used within a PageContextProvider');
  }
  return setPage;
};
