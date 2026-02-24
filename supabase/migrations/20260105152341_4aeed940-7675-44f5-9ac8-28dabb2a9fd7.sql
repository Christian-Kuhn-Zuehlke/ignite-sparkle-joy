-- Enum for PO status
CREATE TYPE public.po_status AS ENUM (
  'draft',
  'submitted', 
  'confirmed',
  'in_transit',
  'arrived',
  'receiving',
  'received',
  'completed',
  'cancelled'
);

-- Enum for discrepancy type
CREATE TYPE public.discrepancy_type AS ENUM (
  'over_quantity',
  'under_quantity',
  'unknown_sku',
  'damaged',
  'missing_docs',
  'wrong_item',
  'quality_issue'
);

-- Enum for discrepancy severity
CREATE TYPE public.discrepancy_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Enum for discrepancy resolution
CREATE TYPE public.discrepancy_resolution AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'returned_to_supplier',
  'adjusted',
  'escalated'
);

-- Purchase Orders (header)
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_code TEXT,
  eta DATE,
  arrival_date DATE,
  location TEXT DEFAULT 'main_warehouse',
  status po_status NOT NULL DEFAULT 'draft',
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, po_number)
);

-- Purchase Order Lines
CREATE TABLE public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  product_name TEXT,
  qty_expected INTEGER NOT NULL DEFAULT 0,
  qty_received INTEGER NOT NULL DEFAULT 0,
  uom TEXT DEFAULT 'EA',
  gtin TEXT,
  line_number INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Receiving Sessions
CREATE TABLE public.receiving_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  started_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  method TEXT DEFAULT 'scan',
  status TEXT NOT NULL DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Receiving Counts
CREATE TABLE public.receiving_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.receiving_sessions(id) ON DELETE CASCADE,
  po_line_id UUID REFERENCES public.purchase_order_lines(id),
  sku TEXT NOT NULL,
  qty_received INTEGER NOT NULL DEFAULT 0,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scanned_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Discrepancies
CREATE TABLE public.discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.receiving_sessions(id) ON DELETE CASCADE,
  po_line_id UUID REFERENCES public.purchase_order_lines(id),
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type discrepancy_type NOT NULL,
  severity discrepancy_severity NOT NULL DEFAULT 'medium',
  resolution discrepancy_resolution NOT NULL DEFAULT 'pending',
  sku TEXT,
  expected_qty INTEGER,
  actual_qty INTEGER,
  notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PO Attachments
CREATE TABLE public.po_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_orders
CREATE POLICY "Users can view own company POs"
ON public.purchase_orders FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "MSD staff can view all POs"
ON public.purchase_orders FOR SELECT
USING (
  has_role(auth.uid(), 'msd_csm') OR 
  has_role(auth.uid(), 'msd_ma') OR 
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'msd_management') OR
  has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "Admins can insert POs for own company"
ON public.purchase_orders FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "MSD staff can insert POs"
ON public.purchase_orders FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "MSD staff can update POs"
ON public.purchase_orders FOR UPDATE
USING (
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "Admins can update own company POs"
ON public.purchase_orders FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') AND company_id = get_user_company_id(auth.uid())
);

-- RLS Policies for purchase_order_lines
CREATE POLICY "Users can view PO lines for own company POs"
ON public.purchase_order_lines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_lines.po_id
    AND po.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "MSD staff can view all PO lines"
ON public.purchase_order_lines FOR SELECT
USING (
  has_role(auth.uid(), 'msd_csm') OR 
  has_role(auth.uid(), 'msd_ma') OR 
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'msd_management') OR
  has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "Admins can manage PO lines for own company"
ON public.purchase_order_lines FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_lines.po_id
    AND po.company_id = get_user_company_id(auth.uid())
  ) AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "MSD staff can manage PO lines"
ON public.purchase_order_lines FOR ALL
USING (
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'system_admin')
);

-- RLS Policies for receiving_sessions
CREATE POLICY "Users can view own company receiving sessions"
ON public.receiving_sessions FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "MSD staff can view all receiving sessions"
ON public.receiving_sessions FOR SELECT
USING (
  has_role(auth.uid(), 'msd_csm') OR 
  has_role(auth.uid(), 'msd_ma') OR 
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'msd_management') OR
  has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "MSD ops can manage receiving sessions"
ON public.receiving_sessions FOR ALL
USING (
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'system_admin')
);

-- RLS Policies for receiving_counts
CREATE POLICY "Users can view receiving counts for own company sessions"
ON public.receiving_counts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.receiving_sessions rs
    WHERE rs.id = receiving_counts.session_id
    AND rs.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "MSD staff can view all receiving counts"
ON public.receiving_counts FOR SELECT
USING (
  has_role(auth.uid(), 'msd_csm') OR 
  has_role(auth.uid(), 'msd_ma') OR 
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'msd_management') OR
  has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "MSD ops can manage receiving counts"
ON public.receiving_counts FOR ALL
USING (
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'system_admin')
);

-- RLS Policies for discrepancies
CREATE POLICY "Users can view own company discrepancies"
ON public.discrepancies FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "MSD staff can view all discrepancies"
ON public.discrepancies FOR SELECT
USING (
  has_role(auth.uid(), 'msd_csm') OR 
  has_role(auth.uid(), 'msd_ma') OR 
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'msd_management') OR
  has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "MSD ops can manage discrepancies"
ON public.discrepancies FOR ALL
USING (
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'system_admin')
);

-- RLS Policies for po_attachments
CREATE POLICY "Users can view attachments for own company POs"
ON public.po_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_attachments.po_id
    AND po.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "MSD staff can view all attachments"
ON public.po_attachments FOR SELECT
USING (
  has_role(auth.uid(), 'msd_csm') OR 
  has_role(auth.uid(), 'msd_ma') OR 
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'msd_management') OR
  has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "Admins can manage attachments for own company POs"
ON public.po_attachments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_attachments.po_id
    AND po.company_id = get_user_company_id(auth.uid())
  ) AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "MSD staff can manage attachments"
ON public.po_attachments FOR ALL
USING (
  has_role(auth.uid(), 'msd_ops') OR
  has_role(auth.uid(), 'system_admin')
);

-- Indexes for performance
CREATE INDEX idx_purchase_orders_company_id ON public.purchase_orders(company_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_orders_eta ON public.purchase_orders(eta);
CREATE INDEX idx_purchase_order_lines_po_id ON public.purchase_order_lines(po_id);
CREATE INDEX idx_purchase_order_lines_sku ON public.purchase_order_lines(sku);
CREATE INDEX idx_receiving_sessions_po_id ON public.receiving_sessions(po_id);
CREATE INDEX idx_receiving_sessions_company_id ON public.receiving_sessions(company_id);
CREATE INDEX idx_receiving_counts_session_id ON public.receiving_counts(session_id);
CREATE INDEX idx_discrepancies_session_id ON public.discrepancies(session_id);
CREATE INDEX idx_discrepancies_company_id ON public.discrepancies(company_id);

-- Trigger for updated_at
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_order_lines_updated_at
  BEFORE UPDATE ON public.purchase_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receiving_sessions_updated_at
  BEFORE UPDATE ON public.receiving_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discrepancies_updated_at
  BEFORE UPDATE ON public.discrepancies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();