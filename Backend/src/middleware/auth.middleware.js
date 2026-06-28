import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "No token provided. Please login first.");
    }

    const token = authHeader.split(" ")[1];

    if (!token || token === "undefined" || token === "null") {
      throw new ApiError(401, "Invalid token format.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.userId,
      employeeId: decoded.employeeId,
      email: decoded.email,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
    };

    // Warn if token expires in less than 30 minutes
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    if (expiresIn < 1800) {
      res.setHeader("X-Token-Expiring-Soon", "true");
    }

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ApiError(401, "Session expired. Please login again."));
    }
    if (err.name === "JsonWebTokenError") {
      return next(new ApiError(401, "Invalid token. Please login again."));
    }
    next(err);
  }
};

export const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "Not authenticated"));

    const hasPermission = requiredPermissions.some((perm) =>
      req.user.permissions.includes(perm)
    );

    if (!hasPermission) {
      return next(new ApiError(403, `Access denied. Required: ${requiredPermissions.join(" or ")}`));
    }
    next();
  };
};

export const authorizeRole = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "Not authenticated"));

    const hasRole = requiredRoles.some((role) => req.user.roles.includes(role));

    if (!hasRole) {
      return next(new ApiError(403, `Access denied. Required role: ${requiredRoles.join(" or ")}`));
    }
    next();
  };
};
