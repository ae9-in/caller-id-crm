const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/helpers');

const getNotifications = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const [dataResult, countResult, unreadCount] = await Promise.all([
      query(
        `SELECT * FROM notifications WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM notifications WHERE user_id = $1`, [req.user.id]),
      query(`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`, [req.user.id]),
    ]);

    res.json({
      success: true,
      data: dataResult.rows,
      unreadCount: parseInt(unreadCount.rows[0].count),
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page, limit,
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    sendSuccess(res, null, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [req.user.id]);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markRead, markAllRead };
