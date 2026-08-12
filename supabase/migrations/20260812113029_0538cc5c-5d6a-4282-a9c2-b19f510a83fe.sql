CREATE OR REPLACE FUNCTION public.place_order(
  _kind text,
  _customer_name text,
  _phone text,
  _address text,
  _delivery_date date,
  _delivery_slot text,
  _comment text,
  _items jsonb
)
RETURNS TABLE (order_no bigint, total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_order_id uuid;
  v_order_no bigint;
BEGIN
  IF length(coalesce(trim(_customer_name), '')) < 2 OR length(coalesce(trim(_phone), '')) < 6 THEN
    RAISE EXCEPTION 'invalid contact data';
  END IF;

  SELECT coalesce(sum(p.price * (i.qty)::int), 0) INTO v_total
  FROM jsonb_to_recordset(coalesce(_items, '[]'::jsonb)) AS i(product_id uuid, qty int)
  JOIN public.products p ON p.id = i.product_id AND p.published = true;

  IF v_total > 0 AND v_total < 7000 THEN
    v_total := v_total + 490;
  END IF;

  INSERT INTO public.orders (customer_name, phone, address, delivery_date, delivery_slot, comment, total, kind)
  VALUES (trim(_customer_name), trim(_phone), coalesce(_address, ''), _delivery_date, coalesce(_delivery_slot, ''), coalesce(_comment, ''), v_total, coalesce(_kind, 'order'))
  RETURNING id, orders.order_no INTO v_order_id, v_order_no;

  INSERT INTO public.order_items (order_id, product_id, title, price, qty)
  SELECT v_order_id, p.id, p.title, p.price, i.qty
  FROM jsonb_to_recordset(coalesce(_items, '[]'::jsonb)) AS i(product_id uuid, qty int)
  JOIN public.products p ON p.id = i.product_id AND p.published = true;

  RETURN QUERY SELECT v_order_no, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(text, text, text, text, date, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, text, date, text, text, jsonb) TO anon, authenticated;