SELECT role_title, COUNT(*) as total
FROM dim_employee
WHERE role_title IN (
  'Branch Manager',
  'Non-Producing Branch Manager', 
  'Producing Branch Manager',
  'Market Leader'
)
GROUP BY role_title;
