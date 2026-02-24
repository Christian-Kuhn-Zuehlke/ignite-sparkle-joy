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
      announced: 'Angekündigt',
      received: 'Eingegangen',
      inspected: 'Geprüft',
      approved: 'Genehmigt',
      rejected: 'Abgelehnt',
      restocked: 'Eingelagert',
      disposed: 'Entsorgt',
      completed: 'Abgeschlossen',
    };

    Object.entries(returnLabels).forEach(([status, label]) => {
      it(`returns "${label}" for ${status}`, () => {
        expect(getReturnStatusLabel(status as ReturnStatus)).toBe(label);
      });
    });
  });

  describe('getReturnStatusVariant', () => {
    it('returns pending for announced status', () => {
      expect(getReturnStatusVariant('announced')).toBe('pending');
    });

    it('returns shipped for completed status', () => {
      expect(getReturnStatusVariant('completed')).toBe('shipped');
    });

    it('returns processing for approved status', () => {
      expect(getReturnStatusVariant('approved')).toBe('processing');
    });
  });
});
