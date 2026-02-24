-- Move pg_trgm extension from public to extensions schema for better security
-- First drop the extension
DROP EXTENSION IF EXISTS pg_trgm CASCADE;

-- Recreate in extensions schema
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Recreate the search function to use the extensions schema
CREATE OR REPLACE FUNCTION public.search_companies_fuzzy(search_term text)
 RETURNS TABLE(id text, name text, similarity_score real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT 
    c.id,
    c.name,
    GREATEST(
      extensions.similarity(LOWER(c.name), LOWER(search_term)),
      extensions.similarity(LOWER(c.id), LOWER(search_term))
    ) as similarity_score
  FROM public.companies c
  WHERE 
    LOWER(c.name) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(c.id) LIKE '%' || LOWER(search_term) || '%'
    OR extensions.similarity(LOWER(c.name), LOWER(search_term)) > 0.2
    OR extensions.similarity(LOWER(c.id), LOWER(search_term)) > 0.3
  ORDER BY similarity_score DESC
  LIMIT 5
$function$;