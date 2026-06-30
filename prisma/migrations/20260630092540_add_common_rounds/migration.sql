-- AlterTable
ALTER TABLE "rounds" ADD COLUMN     "is_common" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "role_id" DROP NOT NULL;
