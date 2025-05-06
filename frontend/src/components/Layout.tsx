import React from 'react';
import Header from './layout/Header';
import Sidebar from './layout/Sidebar';
import Content from './layout/Content';
import Footer from './layout/Footer';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showSidebar?: boolean;
  showFooter?: boolean;
}

const Layout = ({
  children,
  showHeader = true,
  showSidebar = true,
  showFooter = true,
}: LayoutProps) => {
  return (
    <div className='w-[100dvw] h-[100dvh]'>
      {showHeader && <Header />}
      <div
        className={`bg-pink-500 ${
          showHeader ? 'h-[calc(100%-96px)]' : 'h-full'
        } flex relative`}
      >
        {showSidebar && <Sidebar />}
        <main
          className={`${showSidebar && 'pl-[64px]'} ${
            showFooter && 'h-[calc(100%-128px)]'
          } w-full`}
        >
          <Content show={showFooter}>{children}</Content>
          {showFooter && <Footer />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
