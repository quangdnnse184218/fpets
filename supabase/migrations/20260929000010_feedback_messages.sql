-- Góp ý / liên hệ của khách (trang Liên hệ) được lưu lại để admin xử lý
-- trong mục Review & Feedback, thay cho việc mở ứng dụng email của khách.
-- Khách (kể cả chưa đăng nhập) chỉ gửi qua RPC submit_feedback, không đọc được bảng.

CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120),
  phone text NOT NULL CHECK (phone ~ '^0[0-9]{9}$'),
  email text CHECK (email IS NULL OR char_length(email) <= 200),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 120),
  message text NOT NULL CHECK (char_length(message) BETWEEN 5 AND 3000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
  admin_note text,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_messages_created_idx ON public.feedback_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_messages_phone_idx ON public.feedback_messages (phone, created_at DESC);

ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY feedback_admin_select ON public.feedback_messages FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY feedback_admin_update ON public.feedback_messages FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY feedback_admin_delete ON public.feedback_messages FOR DELETE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.submit_feedback(
  p_full_name text,
  p_phone text,
  p_email text,
  p_subject text,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_id uuid;
BEGIN
  IF v_phone !~ '^0[0-9]{9}$' THEN
    RAISE EXCEPTION 'ERR_PHONE_INVALID';
  END IF;
  IF char_length(trim(coalesce(p_message, ''))) < 5 THEN
    RAISE EXCEPTION 'ERR_MESSAGE_TOO_SHORT';
  END IF;
  -- Chống spam: mỗi số điện thoại tối đa 5 tin trong 1 giờ
  IF (SELECT count(*) FROM public.feedback_messages WHERE phone = v_phone AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'ERR_TOO_MANY_REQUESTS';
  END IF;

  INSERT INTO public.feedback_messages (user_id, full_name, phone, email, subject, message)
  VALUES (
    auth.uid(),
    left(trim(p_full_name), 120),
    v_phone,
    nullif(left(trim(coalesce(p_email, '')), 200), ''),
    left(trim(p_subject), 120),
    left(trim(p_message), 3000)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_feedback(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_feedback(text, text, text, text, text) TO anon, authenticated;
