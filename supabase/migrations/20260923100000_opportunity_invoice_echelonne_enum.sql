-- Ajoute la fréquence de facturation échelonnée.
ALTER TYPE public.opportunity_invoice_frequency_enum
  ADD VALUE IF NOT EXISTS 'echellonne';
