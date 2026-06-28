import ApiError from "../utils/ApiError.js";


const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Handle Prisma known errors
  if (err.code === "P2002") {
    const field = err.meta?.target?.[0] || "field";
    err = new ApiError(409, `A record with this ${field} already exists`);
  }

  if (err.code === "P2025") {
    err = new ApiError(404, "Record not found");
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;

