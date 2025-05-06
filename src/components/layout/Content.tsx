import React from 'react';

const Content = ({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) => {
  return <div className='bg-yellow-500 h-full w-100%'>{children}</div>;
};

export default Content;
