-- Renommer la valeur de rôle CLIENT → MEMBRE
UPDATE "User" SET "role" = 'MEMBRE' WHERE "role" = 'CLIENT';

-- Changer la valeur par défaut
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MEMBRE';
