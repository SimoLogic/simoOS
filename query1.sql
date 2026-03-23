SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dim_branch'
AND table_schema = 'public'
ORDER BY ordinal_position;
