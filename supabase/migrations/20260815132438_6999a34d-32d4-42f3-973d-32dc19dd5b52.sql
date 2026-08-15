CREATE TABLE public.telegram_subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id bigint NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  username text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.telegram_subscribers TO authenticated;
GRANT ALL ON public.telegram_subscribers TO service_role;

ALTER TABLE public.telegram_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read telegram subscribers" ON public.telegram_subscribers
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update telegram subscribers" ON public.telegram_subscribers
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete telegram subscribers" ON public.telegram_subscribers
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER telegram_subscribers_updated_at BEFORE UPDATE ON public.telegram_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();