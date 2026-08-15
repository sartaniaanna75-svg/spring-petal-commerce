ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS admin_note text NOT NULL DEFAULT '';