import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";

export const createUserStory = async ({ brmId, title, description, priority, createdById }) => {
  const brm = await prisma.brm.findUnique({ where: { id: brmId } });
  if (!brm) throw new ApiError(404, "BRM not found");
  
  // Auto-generate Story Number (e.g. BRM-123-US-1)
  const count = await prisma.userStory.count({ where: { brmId } });
  const storyNumber = `${brm.brmNumber}-US-${count + 1}`;

  return prisma.userStory.create({
    data: {
      brmId,
      storyNumber,
      title,
      description,
      priority: priority || "MEDIUM",
      status: "DRAFT",
      createdById,
    }
  });
};

export const getUserStoriesByBrm = async (brmId) => {
  return prisma.userStory.findMany({
    where: { brmId },
    orderBy: { createdAt: "asc" }
  });
};

export const updateUserStory = async (id, data, userId) => {
  const story = await prisma.userStory.findUnique({ where: { id } });
  if (!story) throw new ApiError(404, "User story not found");

  const { title, description, priority, status } = data;
  
  return prisma.$transaction(async (tx) => {
    const updated = await tx.userStory.update({
      where: { id },
      data: { title, description, priority, status },
    });

    await tx.userStoryHistory.create({
      data: {
        userStoryId: id,
        oldStatus: story.status,
        newStatus: status || story.status,
        remarks: "Story updated",
        changedById: userId
      }
    });
    return updated;
  });
};

export const deleteUserStory = async (id) => {
  const story = await prisma.userStory.findUnique({ where: { id } });
  if (!story) throw new ApiError(404, "User story not found");
  
  await prisma.userStoryHistory.deleteMany({ where: { userStoryId: id } });
  return prisma.userStory.delete({ where: { id } });
};
