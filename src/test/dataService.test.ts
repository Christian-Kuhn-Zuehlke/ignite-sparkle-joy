import { describe, it, expect } from 'vitest';
import { 
  getStatusColor, 
  getStatusLabel, 
  getReturnStatusLabel,
  getReturnStatusVariant,
  OrderStatus,
  ReturnStatus,
} from '@/services/dataService';

describe('Order Status Functions', () => {
  describe('getStatusColor', () => {
    it('returns correct color for received status', () => {
      expect(getStatusColor('received')).toBe('secondary');
    });

    it('returns correct color for shipped status', () => {
      expect(getStatusColor('shipped')).toBe('success');
    });

    it('returns correct color for picking status', () => {
      expect(getStatusColor('picking')).toBe('warning');
    });

    it('returns correct color for delivered status', () => {
      expect(getStatusColor('delivered')).toBe('accent');
    });
  });

  describe('getStatusLabel', () => {
    const statusLabels: Record<OrderStatus, string> = {
      received: 'Eingegangen',
      putaway: 'Einlagerung',
      picking: 'Picking',
      packing: 'Packing',
      ready_to_ship: 'Versandbereit',
      shipped: 'Versendet',
      delivered: 'Zugestellt',
    };

    Object.entries(statusLabels).forEach(([status, label]) => {
      it(`returns "${label}" for ${status}`, () => {
        expect(getStatusLabel(status as OrderStatus)).toBe(label);
      });
    });
  });
});

describe('Return Status Functions', () => {
  describe('getReturnStatusLabel', () => {
    const returnLabels: Record<ReturnStatus, string> = {
      initiated: 'Initiiert',
      in_transit: 'Unterwegs',
      received: 'Empfangen',
      processing: 'In Bearbeitung',
      completed: 'Abgeschlossen',
    };

    Object.entries(returnLabels).forEach(([status, label]) => {
      it(`returns "${label}" for ${status}`, () => {
        expect(getReturnStatusLabel(status as ReturnStatus)).toBe(label);
      });
    });
  });

  describe('getReturnStatusVariant', () => {
    it('returns secondary for initiated status', () => {
      expect(getReturnStatusVariant('initiated')).toBe('secondary');
    });

    it('returns success for completed status', () => {
      expect(getReturnStatusVariant('completed')).toBe('success');
    });

    it('returns warning for processing status', () => {
      expect(getReturnStatusVariant('processing')).toBe('warning');
    });
  });
});
