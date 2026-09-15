-- Fréquence hebdomadaire pour les séries de missions récurrentes
ALTER TYPE public.mission_recurrence_frequency ADD VALUE IF NOT EXISTS 'hebdomadaire';
