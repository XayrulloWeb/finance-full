/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "debts" ADD COLUMN     "is_linked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linked_debt_id" UUID,
ADD COLUMN     "partner_user_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "code_expires_at" TIMESTAMP(3),
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "verification_code" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "debt_requests" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "receiver_email" TEXT NOT NULL,
    "receiver_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "debt_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "due_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "linked_debt_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,

    CONSTRAINT "debt_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linked_debts" (
    "id" UUID NOT NULL,
    "user_a_id" UUID NOT NULL,
    "debt_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "debt_b_id" UUID NOT NULL,
    "original_amount" DECIMAL(12,2) NOT NULL,
    "current_amount" DECIMAL(12,2) NOT NULL,
    "is_settled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMPTZ,

    CONSTRAINT "linked_debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_activities" (
    "id" UUID NOT NULL,
    "linked_debt_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action_type" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "note" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debt_requests_receiver_email_status_idx" ON "debt_requests"("receiver_email", "status");

-- CreateIndex
CREATE INDEX "debt_requests_sender_id_status_idx" ON "debt_requests"("sender_id", "status");

-- CreateIndex
CREATE INDEX "debt_requests_receiver_id_status_idx" ON "debt_requests"("receiver_id", "status");

-- CreateIndex
CREATE INDEX "debt_requests_status_expires_at_idx" ON "debt_requests"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "linked_debts_debt_a_id_key" ON "linked_debts"("debt_a_id");

-- CreateIndex
CREATE UNIQUE INDEX "linked_debts_debt_b_id_key" ON "linked_debts"("debt_b_id");

-- CreateIndex
CREATE INDEX "linked_debts_user_a_id_is_settled_idx" ON "linked_debts"("user_a_id", "is_settled");

-- CreateIndex
CREATE INDEX "linked_debts_user_b_id_is_settled_idx" ON "linked_debts"("user_b_id", "is_settled");

-- CreateIndex
CREATE INDEX "debt_activities_linked_debt_id_created_at_idx" ON "debt_activities"("linked_debt_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- AddForeignKey
ALTER TABLE "debt_requests" ADD CONSTRAINT "debt_requests_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_requests" ADD CONSTRAINT "debt_requests_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_requests" ADD CONSTRAINT "debt_requests_linked_debt_id_fkey" FOREIGN KEY ("linked_debt_id") REFERENCES "linked_debts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linked_debts" ADD CONSTRAINT "linked_debts_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linked_debts" ADD CONSTRAINT "linked_debts_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linked_debts" ADD CONSTRAINT "linked_debts_debt_a_id_fkey" FOREIGN KEY ("debt_a_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linked_debts" ADD CONSTRAINT "linked_debts_debt_b_id_fkey" FOREIGN KEY ("debt_b_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_activities" ADD CONSTRAINT "debt_activities_linked_debt_id_fkey" FOREIGN KEY ("linked_debt_id") REFERENCES "linked_debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_activities" ADD CONSTRAINT "debt_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
