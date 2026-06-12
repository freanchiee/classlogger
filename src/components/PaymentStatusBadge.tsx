// src/components/PaymentStatusBadge.tsx
// Payment status badge component for displaying class payment status

import React from 'react';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'pending' | 'error';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  creditsDeducted?: number;
  className?: string;
  showCredits?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface StatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
  icon: string;
}

const statusConfigs: Record<PaymentStatus, StatusConfig> = {
  paid: {
    label: 'Paid',
    bgColor: 'bg-green-100',
    textColor: 'text-green-900', // Darker for better contrast
    icon: '✓'
  },
  partial: {
    label: 'Partial',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-900', // Darker for better contrast
    icon: '⚠'
  },
  unpaid: {
    label: 'Unpaid',
    bgColor: 'bg-red-100',
    textColor: 'text-red-900', // Darker for better contrast
    icon: '✗'
  },
  pending: {
    label: 'Pending',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: '⏳'
  },
  error: {
    label: 'Error',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-900',
    icon: '!'
  }
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base'
};

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
  creditsDeducted = 0,
  className = '',
  showCredits = false,
  size = 'md'
}) => {
  const config = statusConfigs[status] ?? statusConfigs.pending;
  const sizeClass = sizeClasses[size];

  const displayText = showCredits && creditsDeducted > 0 
    ? `${config.label} (${creditsDeducted}h)`
    : config.label;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${config.bgColor} ${config.textColor} ${sizeClass} ${className}
      `}
      title={getStatusTooltip(status, creditsDeducted)}
    >
      <span className="text-xs">{config.icon}</span>
      <span>{displayText}</span>
    </span>
  );
};

// Helper function to calculate payment status from class log data
export const calculatePaymentStatus = (
  creditsDeducted: number = 0,
  isPaid: boolean = false,
  paymentStatus?: string,
  durationMinutes?: number
): PaymentStatus => {
  // If we have explicit payment status from database, use it
  if (paymentStatus) {
    return paymentStatus as PaymentStatus;
  }

  // Fallback calculation based on credits and duration
  if (isPaid || creditsDeducted > 0) {
    if (durationMinutes && creditsDeducted >= (durationMinutes / 60)) {
      return 'paid';
    } else if (creditsDeducted > 0) {
      return 'partial';
    }
  }
  
  return 'unpaid';
};

// Helper function to get tooltip text
function getStatusTooltip(status: PaymentStatus, creditsDeducted: number): string {
  switch (status) {
    case 'paid':
      return creditsDeducted > 0 
        ? `Fully paid with ${creditsDeducted} credit hours`
        : 'Class has been fully paid for';
    case 'partial':
      return creditsDeducted > 0
        ? `Partially paid with ${creditsDeducted} credit hours`
        : 'Class has been partially paid for';
    case 'unpaid':
      return 'Class has not been paid for yet';
    default:
      return 'Payment status unknown';
  }
}

// Variant for compact display (icon only)
export const PaymentStatusIcon: React.FC<{
  status: PaymentStatus;
  className?: string;
}> = ({ status, className = '' }) => {
  const config = statusConfigs[status] ?? statusConfigs.pending;

  return (
    <span
      className={`
        inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold
        ${config.bgColor} ${config.textColor} ${className}
      `}
      title={config.label}
    >
      {config.icon}
    </span>
  );
};

// Variant for detailed display with description
export const PaymentStatusDetail: React.FC<{
  status: PaymentStatus;
  creditsDeducted?: number;
  durationMinutes?: number;
  className?: string;
}> = ({ status, creditsDeducted = 0, durationMinutes, className = '' }) => {
  const config = statusConfigs[status];
  const durationHours = durationMinutes ? (durationMinutes / 60).toFixed(1) : null;
  
  let description = '';
  if (status === 'paid' && creditsDeducted > 0) {
    description = `${creditsDeducted}h credits deducted`;
  } else if (status === 'partial' && creditsDeducted > 0 && durationHours) {
    const remaining = parseFloat(durationHours) - creditsDeducted;
    description = `${creditsDeducted}h paid, ${remaining.toFixed(1)}h pending`;
  } else if (status === 'unpaid' && durationHours) {
    description = `${durationHours}h pending payment`;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <PaymentStatusIcon status={status} />
      <div className="flex flex-col">
        <span className={`font-medium ${config.textColor}`}>
          {config.label}
        </span>
        {description && (
          <span className="text-xs text-gray-500">
            {description}
          </span>
        )}
      </div>
    </div>
  );
};

export default PaymentStatusBadge;