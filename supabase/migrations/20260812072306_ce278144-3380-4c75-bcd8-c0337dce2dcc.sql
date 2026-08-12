CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  composition text NOT NULL DEFAULT '',
  stems integer NOT NULL DEFAULT 25,
  color text NOT NULL DEFAULT 'микс',
  price integer NOT NULL DEFAULT 0,
  image_url text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published products" ON public.products FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Admins can read all products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no bigint GENERATED ALWAYS AS IDENTITY (START WITH 1001),
  customer_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL DEFAULT '',
  delivery_date date,
  delivery_slot text NOT NULL DEFAULT '',
  comment text NOT NULL DEFAULT '',
  total integer NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'order',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit an order" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  qty integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can add order items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete order items" ON public.order_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.products (slug, title, description, composition, stems, color, price, image_url) VALUES
('rozovoe-utro-25', 'Розовое утро', 'Нежные пудрово-розовые тюльпаны, срезанные утром — самый мягкий способ сказать «доброе утро».', '25 розовых тюльпанов, крафтовая упаковка, атласная лента', 25, 'розовый', 3900, ''),
('belyj-shepot-35', 'Белый шёпот', 'Тихий белый букет для важных слов: свадьба, годовщина, просто «люблю».', '35 белых тюльпанов, матовая плёнка, лента айвори', 35, 'белый', 5200, ''),
('rannyaya-vesna-51', 'Ранняя весна', 'Микс из пяти оттенков — как первый тёплый день марта.', '51 тюльпан микс, дизайнерская бумага', 51, 'микс', 7400, ''),
('almaya-nota-15', 'Алая нота', 'Насыщенный красный для тех, кто говорит прямо.', '15 красных тюльпанов, бордовая лента', 15, 'красный', 2600, ''),
('sirenevyj-son-45', 'Сиреневый сон', 'Редкие сиреневые тюльпаны с лёгким градиентом лепестков.', '45 сиреневых тюльпанов, шёлковая лента', 45, 'сиреневый', 6800, ''),
('solnechnyj-den-31', 'Солнечный день', 'Жёлтые тюльпаны, которые включают свет в комнате.', '31 жёлтый тюльпан, крафт', 31, 'жёлтый', 4600, ''),
('pion-tulip-19', 'Пионовидные', 'Махровые пионовидные тюльпаны — объёмные и очень романтичные.', '19 пионовидных тюльпанов, фетр', 19, 'розовый', 4300, ''),
('bolshoj-buket-101', 'Сто один', 'Большой жест: 101 тюльпан в один букет.', '101 тюльпан микс, двойная упаковка, широкая лента', 101, 'микс', 13900, '');