-- Add soft delete columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT DEFAULT NULL;

-- Create index for faster queries on deleted status
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);

-- Function to soft delete a user account
CREATE OR REPLACE FUNCTION public.soft_delete_user_account(
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark profile as deleted
  UPDATE public.profiles
  SET 
    deleted_at = now(),
    deleted_by = auth.uid(),
    deletion_reason = p_reason
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;
  
  -- Deactivate all memberships
  UPDATE public.memberships
  SET status = 'rejected'
  WHERE user_id = p_user_id;
  
  -- Log the deletion
  INSERT INTO public.audit_logs (
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    'delete',
    'user',
    p_user_id::TEXT,
    jsonb_build_object(
      'reason', p_reason,
      'deleted_by', auth.uid(),
      'soft_delete', true
    )
  );
  
  RETURN TRUE;
END;
$$;

-- Function to restore a soft-deleted user account (admin only)
CREATE OR REPLACE FUNCTION public.restore_user_account(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only system admins can restore
  IF NOT has_role(auth.uid(), 'system_admin') THEN
    RAISE EXCEPTION 'Only system admins can restore deleted accounts';
  END IF;
  
  -- Restore profile
  UPDATE public.profiles
  SET 
    deleted_at = NULL,
    deleted_by = NULL,
    deletion_reason = NULL
  WHERE user_id = p_user_id
    AND deleted_at IS NOT NULL;
  
  -- Restore primary membership to pending (admin must re-approve)
  UPDATE public.memberships
  SET status = 'pending'
  WHERE user_id = p_user_id
    AND is_primary = true;
  
  -- Log the restoration
  INSERT INTO public.audit_logs (
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    'update',
    'user',
    p_user_id::TEXT,
    jsonb_build_object(
      'restored_by', auth.uid(),
      'action', 'account_restored'
    )
  );
  
  RETURN TRUE;
END;
$$;