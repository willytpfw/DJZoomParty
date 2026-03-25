-- Add create_date column to company table
ALTER TABLE company ADD COLUMN create_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Fill existing records with current date
UPDATE company SET create_date = NOW() WHERE create_date IS NULL;
