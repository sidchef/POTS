/*
  Warnings:

  - Added the required column `Category` to the `Brm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `TeamName` to the `Brm` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Brm" ADD COLUMN     "Category" TEXT NOT NULL,
ADD COLUMN     "TeamName" TEXT NOT NULL;
