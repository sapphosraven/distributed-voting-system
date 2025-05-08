import { X } from 'lucide-react';
import React from 'react';

interface ModalProps {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  actions?: React.ReactNode;
}

const Modal = ({ title, description, onClose, onConfirm }: ModalProps) => {
  return (
    <div
      className='fixed inset-0 z-1 bg-black/50 flex items-center justify-center'
      onClick={onClose}
    >
      <div
        className='h-[240px] w-[412px] bg-white text-black rounded flex flex-col items-center justify-between p-4'
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className='w-full'>
          <X
            className='text-black hover:text-red-500 cursor float-right cursor-pointer transition duration-300'
            onClick={onClose}
          />
        </div>
        <div className='w-full flex-1 flex flex-col items-center justify-center p-4'>
          <h1 className='font-semibold text-2xl'>{title}</h1>
          <p>{description}</p>
        </div>
        <div className='flex justify-end gap-2 w-full'>
          <button
            className='text-red-500 hover:bg-red-500 hover:text-white py-2 px-4 rounded cursor-pointer font-semibold transition duration-300'
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className='text-purple-800 hover:bg-purple-800 hover:text-white py-2 px-4 rounded cursor-pointer font-semibold transition duration-300'
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
