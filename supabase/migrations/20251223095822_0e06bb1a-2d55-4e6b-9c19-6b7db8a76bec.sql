-- Create order status enum
CREATE TYPE public.order_status AS ENUM (
  'received', 'putaway', 'picking', 'packing', 'ready_to_ship', 'shipped', 'delivered'
);

-- Create return status enum
CREATE TYPE public.return_status AS ENUM (
  'initiated', 'in_transit', 'received', 'processing', 'completed'
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_no TEXT NOT NULL,
  external_document_no TEXT,
  customer_no TEXT,
  company_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  ship_to_name TEXT NOT NULL,
  ship_to_address TEXT,
  ship_to_postcode TEXT,
  ship_to_city TEXT,
  ship_to_country TEXT DEFAULT 'CH',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_amount DECIMAL(10,2) DEFAULT 0,
  status order_status NOT NULL DEFAULT 'received',
  shipping_agent_code TEXT,
  tracking_code TEXT,
  tracking_link TEXT,
  posted_shipment_date DATE,
  posted_invoice_date DATE,
  status_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order lines table
CREATE TABLE public.order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create inventory table
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  on_hand INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  available INTEGER GENERATED ALWAYS AS (on_hand - reserved) STORED,
  low_stock_threshold INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, sku)
);

-- Create returns table
CREATE TABLE public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  company_id TEXT NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status return_status NOT NULL DEFAULT 'initiated',
  amount DECIMAL(10,2) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create return lines table
CREATE TABLE public.return_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_lines ENABLE ROW LEVEL SECURITY;

-- Orders policies
-- Customers can view their own company's orders
CREATE POLICY "Users can view own company orders"
ON public.orders FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

-- MSD staff can view all orders
CREATE POLICY "MSD staff can view all orders"
ON public.orders FOR SELECT
USING (
  public.has_role(auth.uid(), 'msd_csm') OR
  public.has_role(auth.uid(), 'msd_ma') OR
  public.has_role(auth.uid(), 'system_admin')
);

-- System admins can manage orders
CREATE POLICY "System admins can insert orders"
ON public.orders FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "System admins can update orders"
ON public.orders FOR UPDATE
USING (public.has_role(auth.uid(), 'system_admin'));

-- Order lines policies
CREATE POLICY "Users can view order lines for their orders"
ON public.order_lines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_lines.order_id 
    AND o.company_id = public.get_user_company_id(auth.uid())
  )
);

CREATE POLICY "MSD staff can view all order lines"
ON public.order_lines FOR SELECT
USING (
  public.has_role(auth.uid(), 'msd_csm') OR
  public.has_role(auth.uid(), 'msd_ma') OR
  public.has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "System admins can insert order lines"
ON public.order_lines FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

-- Inventory policies
CREATE POLICY "Users can view own company inventory"
ON public.inventory FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "MSD staff can view all inventory"
ON public.inventory FOR SELECT
USING (
  public.has_role(auth.uid(), 'msd_csm') OR
  public.has_role(auth.uid(), 'msd_ma') OR
  public.has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "System admins can manage inventory"
ON public.inventory FOR ALL
USING (public.has_role(auth.uid(), 'system_admin'));

-- Returns policies
CREATE POLICY "Users can view own company returns"
ON public.returns FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "MSD staff can view all returns"
ON public.returns FOR SELECT
USING (
  public.has_role(auth.uid(), 'msd_csm') OR
  public.has_role(auth.uid(), 'msd_ma') OR
  public.has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "System admins can manage returns"
ON public.returns FOR ALL
USING (public.has_role(auth.uid(), 'system_admin'));

-- Return lines policies
CREATE POLICY "Users can view return lines for their returns"
ON public.return_lines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.returns r 
    WHERE r.id = return_lines.return_id 
    AND r.company_id = public.get_user_company_id(auth.uid())
  )
);

CREATE POLICY "MSD staff can view all return lines"
ON public.return_lines FOR SELECT
USING (
  public.has_role(auth.uid(), 'msd_csm') OR
  public.has_role(auth.uid(), 'msd_ma') OR
  public.has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "System admins can manage return lines"
ON public.return_lines FOR ALL
USING (public.has_role(auth.uid(), 'system_admin'));

-- Triggers for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_orders_company_id ON public.orders(company_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_order_date ON public.orders(order_date);
CREATE INDEX idx_inventory_company_id ON public.inventory(company_id);
CREATE INDEX idx_returns_company_id ON public.returns(company_id);
CREATE INDEX idx_returns_order_id ON public.returns(order_id);