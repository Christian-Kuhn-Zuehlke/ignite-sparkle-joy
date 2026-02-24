export type OrderStatus = 
  | 'received'
  | 'putaway'
  | 'picking'
  | 'packing'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered';

export type ReturnStatus = 
  | 'initiated'
  | 'in_transit'
  | 'received'
  | 'processing'
  | 'completed';

export type UserRole = 
  | 'viewer'
  | 'admin'
  | 'msd_csm'
  | 'msd_ma'
  | 'system_admin';

export interface OrderLine {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  sourceNo: string;
  externalDocumentNo: string;
  customerNo: string;
  companyId: string;
  companyName: string;
  shipToName: string;
  shipToAddress: string;
  shipToPostcode: string;
  shipToCity: string;
  shipToCountry: string;
  orderDate: string;
  orderAmount: number;
  status: OrderStatus;
  returnStatus?: ReturnStatus;
  shippingAgentCode: string;
  trackingCode?: string;
  trackingLink?: string;
  postedShipmentDate?: string;
  postedInvoiceDate?: string;
  lines: OrderLine[];
  statusDate: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold?: number;
}

export interface Return {
  id: string;
  originalOrderId: string;
  returnDate: string;
  status: ReturnStatus;
  amount: number;
  items: OrderLine[];
}

export interface DashboardMetrics {
  ordersToday: number;
  ordersPending: number;
  ordersShipped: number;
  returnsOpen: number;
  avgProcessingTime: string;
}
