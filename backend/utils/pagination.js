/**
 * utils/pagination.js
 * Parses and validates pagination query params.
 * Returns { page, limit, skip } ready for MongoDB .skip().limit()
 */

const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 200;

/**
 * Parse page/limit from req.query with validation.
 * @param {object} query - req.query
 * @returns {{ page, limit, skip }}
 */
function parsePagination(query) {
  let page  = parseInt(query.page,  10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page)  || page  < 1) page  = DEFAULT_PAGE;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT)         limit = MAX_LIMIT;

  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build the standard paginated response envelope.
 */
function paginatedResponse(data, totalRecords, page, limit) {
  return {
    success:      true,
    data,
    totalRecords,
    totalPages:   Math.ceil(totalRecords / limit),
    currentPage:  page,
    limit,
  };
}

module.exports = { parsePagination, paginatedResponse };
