-- AddForeignKey
ALTER TABLE "Brm" ADD CONSTRAINT "Brm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brm" ADD CONSTRAINT "Brm_currentPlId_fkey" FOREIGN KEY ("currentPlId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrmApproval" ADD CONSTRAINT "BrmApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrmHistory" ADD CONSTRAINT "BrmHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrmOwnershipHistory" ADD CONSTRAINT "BrmOwnershipHistory_brmId_fkey" FOREIGN KEY ("brmId") REFERENCES "Brm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrmOwnershipHistory" ADD CONSTRAINT "BrmOwnershipHistory_oldPlId_fkey" FOREIGN KEY ("oldPlId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrmOwnershipHistory" ADD CONSTRAINT "BrmOwnershipHistory_newPlId_fkey" FOREIGN KEY ("newPlId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrmOwnershipHistory" ADD CONSTRAINT "BrmOwnershipHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAssignment" ADD CONSTRAINT "ApprovalAssignment_brmId_fkey" FOREIGN KEY ("brmId") REFERENCES "Brm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAssignment" ADD CONSTRAINT "ApprovalAssignment_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
