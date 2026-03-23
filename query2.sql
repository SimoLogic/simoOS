SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dim_employee'
AND table_schema = 'public'
AND column_name LIKE '%branch%';
