import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface MessageOverlayProps {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
}

const MessageOverlay: React.FC<MessageOverlayProps> = ({ isVisible, message, type, onClose }) => {
  if (!isVisible) return null;

  const typeDetails = {
    success: {
      icon: <CheckCircleIcon className="w-12 h-12 text-green-500" />,
      title: 'Success',
      buttonClass: 'bg-green-500 hover:bg-green-600',
    },
    error: {
      icon: <XCircleIcon className="w-12 h-12 text-red-500" />,
      title: 'Error',
      buttonClass: 'bg-red-500 hover:bg-red-600',
    },
    warning: {
      icon: <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500" />,
      title: 'Warning',
      buttonClass: 'bg-yellow-500 hover:bg-yellow-600',
    },
  };

  const { icon, title, buttonClass } = typeDetails[type];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.3 }}
        className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm mx-4 w-full text-center"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center space-y-5">
          {icon}
          <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
          <p className="text-gray-600 text-base">{message}</p>
          <button
            onClick={onClose}
            className={`w-full py-2.5 rounded-lg font-semibold text-white transition-all duration-200 ${buttonClass}`}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MessageOverlay; 