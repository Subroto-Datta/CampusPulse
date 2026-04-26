/**
 * Standard API response helpers.
 */
class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data });
  }

  static created(res, data = null, message = 'Created') {
    return res.status(201).json({ success: true, message, data });
  }

  static error(res, message = 'Error', statusCode = 500, errors = null) {
    return res.status(statusCode).json({ success: false, message, errors });
  }
}

module.exports = ApiResponse;
