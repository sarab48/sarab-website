-- 2026-08-28 — المنطقة per pricing city (الشمال / المثلث / المركز / القدس / الجنوب),
-- so the أسعار المدن tab can filter and group by region. Additive column; the seed
-- UPDATEs classify the 74 cities present on 2026-08-28 by name and only fill NULLs,
-- so running after owner edits never overwrites a hand-set region. Cities added later
-- start with no region and surface under «بدون منطقة» until assigned in the tab.
ALTER TABLE cities ADD COLUMN region TEXT;

UPDATE cities SET region = 'الشمال' WHERE region IS NULL AND name IN (
  'الناصرة','عبلين','شفاعمرو','ابو سنان','كفر ياسيف','المكر','سخنين','مجد الكروم',
  'كرمئيل','نحف','طمرة','حيفا','اكسال','الرينة','بعينة نجيدات','كفرمندا','دير الاسد',
  'عيلوط','كفر كنا','عرابة البطوف','משהד','نين','معليا','طبريا','حرفيش','الجش','كابول',
  'فسوطة','دير حنا','بقيعة','كوكب ابو الهيجاء','الرامة','נוף הגליל','عين ماهل','عكا',
  'جولس','كفر مندا','نهريا','רגבה','عسفيا','يركا','دبورية','يانوح','عيلبون','المزرعة',
  'بير المكسور','ساجور','جسر الزرقاء','نوف هجليل','بسمة طبعون'
);

UPDATE cities SET region = 'المثلث' WHERE region IS NULL AND name IN (
  'ام الفحم','كفر قرع','المثلث','عرعرة','عارة','باقة الغربية','طيبة','قلنسوة',
  'الطيرة','معاوية','كفر قاسم','برطعة','كفر برا'
);

UPDATE cities SET region = 'المركز' WHERE region IS NULL AND name IN (
  'يافا','اللد','חולון','الرملة'
);

UPDATE cities SET region = 'القدس' WHERE region IS NULL AND name IN (
  'بيت حنينا','القدس','ابو غوش','العيزرية'
);

UPDATE cities SET region = 'الجنوب' WHERE region IS NULL AND name IN (
  'רהט','رهط','אילת'
);
