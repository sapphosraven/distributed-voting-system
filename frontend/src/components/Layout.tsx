import React from 'react';
import Header from './layout/Header';
import Footer from './layout/Footer';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showHeader = true, showFooter = true }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 w-full">
      {showHeader && <Header />}
      <main className="flex-1 py-8 px-4 w-full">
        {children}
      </main>
      {showFooter && <Footer />};
    </div>
  );
};

export default Layout;