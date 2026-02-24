-- Enable pg_trgm extension for fuzzy matching FIRST
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a function to search companies with fuzzy matching
CREATE OR REPLACE FUNCTION public.search_companies_fuzzy(search_term TEXT)
RETURNS TABLE(
  id TEXT,
  name TEXT,
  similarity_score REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    c.id,
    c.name,
    GREATEST(
      similarity(LOWER(c.name), LOWER(search_term)),
      similarity(LOWER(c.id), LOWER(search_term))
    ) as similarity_score
  FROM public.companies c
  WHERE 
    LOWER(c.name) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(c.id) LIKE '%' || LOWER(search_term) || '%'
    OR similarity(LOWER(c.name), LOWER(search_term)) > 0.2
    OR similarity(LOWER(c.id), LOWER(search_term)) > 0.3
  ORDER BY similarity_score DESC
  LIMIT 5
$$;