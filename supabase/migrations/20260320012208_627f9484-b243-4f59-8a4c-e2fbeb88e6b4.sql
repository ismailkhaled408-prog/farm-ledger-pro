CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'المتوكل على الله للدواجن',
  business_subtitle text NOT NULL DEFAULT 'جميع أنواع الأعلاف والدواجن',
  business_name_en text NOT NULL DEFAULT 'Al-Mutawakel',
  business_subtitle_en text NOT NULL DEFAULT 'Poultry & Feed Trading',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to business_settings" ON public.business_settings FOR ALL TO public USING (true) WITH CHECK (true);

INSERT INTO public.business_settings (business_name, business_subtitle, business_name_en, business_subtitle_en) VALUES ('المتوكل على الله للدواجن', 'جميع أنواع الأعلاف والدواجن', 'Al-Mutawakel', 'Poultry & Feed Trading');