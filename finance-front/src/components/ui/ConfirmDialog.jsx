import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info } from 'lucide-react';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger', // danger, warning, info
    isLoading = false
}) {
    const getIcon = () => {
        switch (type) {
            case 'danger':
            case 'warning':
                return <AlertTriangle className={`w-12 h-12 ${type === 'danger' ? 'text-red-500' : 'text-yellow-500'} mb-4`} />;
            default:
                return <Info className="w-12 h-12 text-blue-500 mb-4" />;
        }
    };

    const getButtonVariant = () => {
        switch (type) {
            case 'danger': return 'danger';
            case 'warning': return 'primary'; // Or custom warning variant
            default: return 'primary';
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            showCloseButton={false}
        >
            <div className="flex flex-col items-center text-center p-2">
                {getIcon()}

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {title}
                </h3>

                <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-3 w-full">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1"
                        disabled={isLoading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={getButtonVariant()}
                        onClick={onConfirm}
                        className="flex-1"
                        loading={isLoading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
