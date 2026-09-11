-- Normalize existing client names to uppercase for consistent display.
UPDATE public.client
SET client_name = upper(client_name)
WHERE client_name IS DISTINCT FROM upper(client_name);
