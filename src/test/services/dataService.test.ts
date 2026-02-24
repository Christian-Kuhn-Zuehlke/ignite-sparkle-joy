import { describe, it, expect } from 'vitest';
import { 
  getStatusColor, 
  getStatusLabel, 
  getReturnStatusLabel,
  type OrderStatus,
  type ReturnStatus
} from '@/services/dataService';

describe('getStatusColor', () => {
  it('should return pending for received status', () => {
    expect(getStatusColor('received')).toBe('pending');
  });

  it('should return pending for putaway status', () => {
    expect(getStatusColor('putaway')).toBe('pending');
  });

  it('should return processing for picking status', () => {
    expect(getStatusColor('picking')).toBe('processing');
  });

  it('should return processing for packing status', () => {
    expect(getStatusColor('packing')).toBe('processing');
  });

  it('should return processing for ready_to_ship status', () => {
    expect(getStatusColor('ready_to_ship')).toBe('processing');
  });

  it('should return shipped for shipped status', () => {
    expect(getStatusColor('shipped')).toBe('shipped');
  });

  it('should return shipped for delivered status', () => {
    expect(getStatusColor('delivered')).toBe('shipped');
  });

  it('should handle all order statuses', () => {
    const statuses: OrderStatus[] = [
      'received', 'putaway', 'picking', 'packing', 
      'ready_to_ship', 'shipped', 'delivered'
    ];
    
    statuses.forEach(status => {
      expect(getStatusColor(status)).toBeTruthy();
    });
  });
});

describe('getStatusLabel', () => {
  it('should return German labels for all statuses', () => {
    expect(getStatusLabel('received')).toBe('Eingegangen');
    expect(getStatusLabel('putaway')).toBe('Eingelagert');
    expect(getStatusLabel('picking')).toBe('Picking');
    expect(getStatusLabel('packing')).toBe('Packing');
    expect(getStatusLabel('ready_to_ship')).toBe('Versandbereit');
    expect(getStatusLabel('shipped')).toBe('Versendet');
    expect(getStatusLabel('delivered')).toBe('Zugestellt');
  });

  it('should handle all order statuses', () => {
    const statuses: OrderStatus[] = [
      'received', 'putaway', 'picking', 'packing', 
      'ready_to_ship', 'shipped', 'delivered'
    ];
    
    statuses.forEach(status => {
      const label = getStatusLabel(status);
      expect(label).toBeTruthy();
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });
});

describe('getReturnStatusLabel', () => {
  it('should return German labels for all return statuses', () => {
    expect(getReturnStatusLabel('announced')).toBe('Angekündigt');
    expect(getReturnStatusLabel('received')).toBe('Eingegangen');
    expect(getReturnStatusLabel('inspected')).toBe('Geprüft');
    expect(getReturnStatusLabel('approved')).toBe('Genehmigt');
    expect(getReturnStatusLabel('completed')).toBe('Abgeschlossen');
  });

  it('should handle all return statuses', () => {
    const statuses: ReturnStatus[] = [
      'announced', 'received', 'inspected', 'approved', 'rejected', 'restocked', 'disposed', 'completed'
    ];
    
    statuses.forEach(status => {
      const label = getReturnStatusLabel(status);
      expect(label).toBeTruthy();
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });
});
