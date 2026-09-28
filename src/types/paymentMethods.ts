export interface PaymentMethodConfig {
  id: string; // 'contado' | 'addi' | 'sistecredito' | 'tarjeta' | 'apartado' | custom
  name: string;
  commissionPercent: number; // e.g. 5.5
  disbursementDays: number; // e.g. 3
  isCreditGateway?: boolean;
  isApartado?: boolean;
  badgeColor?: 'emerald' | 'blue' | 'indigo' | 'purple' | 'amber' | 'rose' | 'slate';
  description?: string;
  isCustom?: boolean;
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'contado',
    name: 'Contado / Transferencia',
    commissionPercent: 0,
    disbursementDays: 0,
    isCreditGateway: false,
    badgeColor: 'emerald',
    description: '0% comisión • Desembolso inmediato (100% liquidez en cuenta)',
  },
  {
    id: 'addi',
    name: 'Addi',
    commissionPercent: 5.5,
    disbursementDays: 3,
    isCreditGateway: true,
    badgeColor: 'blue',
    description: 'Crédito digital Addi (Desembolso estimado a 3 días)',
  },
  {
    id: 'sistecredito',
    name: 'Sistecrédito',
    commissionPercent: 6.0,
    disbursementDays: 15,
    isCreditGateway: true,
    badgeColor: 'indigo',
    description: 'Crédito Sistecrédito quincenal/mensual',
  },
  {
    id: 'tarjeta',
    name: 'Tarjeta / Datáfono',
    commissionPercent: 3.2,
    disbursementDays: 2,
    isCreditGateway: true,
    badgeColor: 'purple',
    description: 'Datáfono físico o pasarela de tarjetas',
  },
  {
    id: 'apartado',
    name: 'Apartado',
    commissionPercent: 0,
    disbursementDays: 0,
    isApartado: true,
    badgeColor: 'amber',
    description: 'Abono inicial en caja y reserva con saldo pendiente',
  },
];

export interface PaymentBreakdown {
  grossAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  netAmount: number;
  disbursementDays: number;
  estimatedDisbursementDate: Date;
}

export const calculatePaymentBreakdown = (
  grossAmount: number,
  commissionPercent: number,
  disbursementDays: number,
  baseDate: Date = new Date()
): PaymentBreakdown => {
  const safeGross = Math.max(0, grossAmount || 0);
  const safePercent = Math.max(0, commissionPercent || 0);
  const commissionAmount = Math.round(safeGross * (safePercent / 100));
  const netAmount = Math.max(0, safeGross - commissionAmount);
  
  const estimatedDate = new Date(baseDate);
  estimatedDate.setDate(estimatedDate.getDate() + (disbursementDays || 0));

  return {
    grossAmount: safeGross,
    commissionPercent: safePercent,
    commissionAmount,
    netAmount,
    disbursementDays: disbursementDays || 0,
    estimatedDisbursementDate: estimatedDate,
  };
};
