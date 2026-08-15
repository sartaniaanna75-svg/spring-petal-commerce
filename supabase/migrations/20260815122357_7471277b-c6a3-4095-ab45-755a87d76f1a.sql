CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  needs_operator boolean NOT NULL DEFAULT false,
  order_no bigint,
  admin_note text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read chat sessions" ON public.chat_sessions
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update chat sessions" ON public.chat_sessions
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete chat sessions" ON public.chat_sessions
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_session_idx ON public.chat_messages(session_id, created_at);
CREATE INDEX chat_sessions_last_message_idx ON public.chat_sessions(last_message_at DESC);

GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read chat messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can write chat messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete chat messages" ON public.chat_messages
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.chat_start(_name text, _phone text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF length(coalesce(trim(_name), '')) < 2 OR length(coalesce(trim(_phone), '')) < 6 THEN
    RAISE EXCEPTION 'invalid contact data';
  END IF;
  INSERT INTO public.chat_sessions (customer_name, phone)
  VALUES (left(trim(_name), 100), left(trim(_phone), 30))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.chat_append(_session_id uuid, _role text, _content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _role NOT IN ('user', 'assistant', 'operator') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;
  IF length(coalesce(trim(_content), '')) = 0 THEN
    RETURN;
  END IF;
  INSERT INTO public.chat_messages (session_id, role, content)
  VALUES (_session_id, _role, left(_content, 4000));
  UPDATE public.chat_sessions SET last_message_at = now() WHERE id = _session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.chat_escalate(_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.chat_sessions
  SET needs_operator = true, status = 'operator', last_message_at = now()
  WHERE id = _session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.chat_set_order(_session_id uuid, _order_no bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.chat_sessions
  SET order_no = _order_no, status = 'ordered', last_message_at = now()
  WHERE id = _session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.chat_start(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.chat_append(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.chat_escalate(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.chat_set_order(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_start(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.chat_append(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.chat_escalate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.chat_set_order(uuid, bigint) TO service_role;