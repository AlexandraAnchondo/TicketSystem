const sql = require('mssql');

// SQL
const config_prod = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  }
};

async function getConnection() {
  const pool = await sql.connect(config_prod);
  return pool;
}

const VALID_PRIORITY = ['low', 'medium', 'high', 'critical'];
const VALID_STATUS = ['open', 'in_progress', 'closed', 'on_hold'];
const VALID_DIFFICULTY = ['low', 'medium', 'high'];

const getUserFromReq = (req) => {
  // Ajusta esto al nombre real que tu middleware verificarToken deja en req.
  return req.user || req.usuario || req.userData || null;
};

const getUserId = (req) => {
  const user = getUserFromReq(req);
  return user?.id || user?.IdUsuario || user?.userId || null;
};

const getUserName = (req) => {
  const user = getUserFromReq(req);
  return user?.nombre || user?.NombreUsuario || user?.usuario || user?.Usuario || 'Usuario';
};

const normalizeNullableNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const mapTicketRow = (row) => ({
  id: row.id,
  subject: row.subject,
  description: row.description,
  attendedPerson: row.attendedPerson,
  areaId: row.areaId,
  area: row.area,
  priority: row.priority,
  difficulty: row.difficulty,
  status: row.status,
  assignedTo: row.assignedTo,
  assignedToName: row.assignedToName,
  createdBy: row.createdBy,
  createdByName: row.createdByName,
  closedAt: row.closedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

exports.getTickets = async (req, res) => {
  try {
    const pool = await getConnection();
    const {
      startDate,
      endDate,
      priority,
      status,
      assignedTo,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 200);
    const offset = (safePage - 1) * safeLimit;

    let where = 'WHERE 1 = 1';
    const request = pool.request()
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, safeLimit);

    if (startDate) {
      where += ' AND CAST(t.createdAt AS DATE) >= @startDate';
      request.input('startDate', sql.Date, startDate);
    }

    if (endDate) {
      where += ' AND CAST(t.createdAt AS DATE) <= @endDate';
      request.input('endDate', sql.Date, endDate);
    }

    if (priority && VALID_PRIORITY.includes(priority)) {
      where += ' AND t.priority = @priority';
      request.input('priority', sql.VarChar(20), priority);
    }

    if (status && VALID_STATUS.includes(status)) {
      where += ' AND t.status = @status';
      request.input('status', sql.VarChar(20), status);
    }

    const assignedToNumber = normalizeNullableNumber(assignedTo);
    if (assignedToNumber) {
      where += ' AND t.assignedTo = @assignedTo';
      request.input('assignedTo', sql.Int, assignedToNumber);
    }

    if (search && String(search).trim()) {
      where += ` AND (
        t.subject LIKE @search OR
        t.description LIKE @search OR
        t.attendedPerson LIKE @search OR
        a.nombre LIKE @search
      )`;
      request.input('search', sql.NVarChar(250), `%${String(search).trim()}%`);
    }

    const query = `
      SELECT
        t.id,
        t.subject,
        t.description,
        t.attendedPerson,
        t.areaId,
        a.nombre AS area,
        t.priority,
        t.difficulty,
        t.status,
        t.assignedTo,
        au.NombreUsuario AS assignedToName,
        t.createdBy,
        cu.NombreUsuario AS createdByName,
        t.closedAt,
        t.createdAt,
        t.updatedAt,
        COUNT(*) OVER() AS totalRows
      FROM Tickets t
      LEFT JOIN Areas a ON a.id = t.areaId
      LEFT JOIN Cat_Usuario au ON au.IdUsuario = t.assignedTo
      LEFT JOIN Cat_Usuario cu ON cu.IdUsuario = t.createdBy
      ${where}
      ORDER BY t.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    const result = await request.query(query);
    const total = result.recordset[0]?.totalRows || 0;

    res.json({
      data: result.recordset.map(mapTicketRow),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    console.error('getTickets error:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const pool = await getConnection();
    const ticketId = Number(req.params.id);

    const ticketResult = await pool.request()
      .input('id', sql.Int, ticketId)
      .query(`
        SELECT
          t.id,
          t.subject,
          t.description,
          t.attendedPerson,
          t.areaId,
          a.nombre AS area,
          t.priority,
          t.difficulty,
          t.status,
          t.assignedTo,
          au.NombreUsuario AS assignedToName,
          t.createdBy,
          cu.NombreUsuario AS createdByName,
          t.closedAt,
          t.createdAt,
          t.updatedAt
        FROM Tickets t
        LEFT JOIN Areas a ON a.id = t.areaId
        LEFT JOIN Cat_Usuario au ON au.IdUsuario = t.assignedTo
        LEFT JOIN Cat_Usuario cu ON cu.IdUsuario = t.createdBy
        WHERE t.id = @id;
      `);

    if (!ticketResult.recordset.length) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const commentsResult = await pool.request()
      .input('ticketId', sql.Int, ticketId)
      .query(`
        SELECT
          id,
          comment AS text,
          authorId,
          authorName AS author,
          createdAt AS date
        FROM TicketComments
        WHERE ticketId = @ticketId
        ORDER BY createdAt ASC;
      `);

    res.json({
      ...mapTicketRow(ticketResult.recordset[0]),
      comments: commentsResult.recordset,
    });
  } catch (error) {
    console.error('getTicketById error:', error);
    res.status(500).json({ error: 'Error al obtener el ticket' });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const pool = await getConnection();
    const {
      subject,
      description,
      attendedPerson,
      areaId,
      priority = 'medium',
      difficulty = 'medium',
      status = 'open',
      assignedTo,
    } = req.body;

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ error: 'El asunto del ticket es obligatorio' });
    }

    if (!VALID_PRIORITY.includes(priority)) {
      return res.status(400).json({ error: 'Prioridad inválida' });
    }

    if (!VALID_DIFFICULTY.includes(difficulty)) {
      return res.status(400).json({ error: 'Dificultad inválida' });
    }

    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const createdBy = getUserId(req);
    const result = await pool.request()
      .input('subject', sql.NVarChar(200), String(subject).trim())
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('attendedPerson', sql.NVarChar(150), attendedPerson || null)
      .input('areaId', sql.Int, normalizeNullableNumber(areaId))
      .input('priority', sql.VarChar(20), priority)
      .input('difficulty', sql.VarChar(20), difficulty)
      .input('status', sql.VarChar(20), status)
      .input('assignedTo', sql.Int, normalizeNullableNumber(assignedTo))
      .input('createdBy', sql.Int, createdBy)
      .query(`
        INSERT INTO Tickets (
          subject,
          description,
          attendedPerson,
          areaId,
          priority,
          difficulty,
          status,
          assignedTo,
          createdBy,
          closedAt
        )
        OUTPUT INSERTED.*
        VALUES (
          @subject,
          @description,
          @attendedPerson,
          @areaId,
          @priority,
          @difficulty,
          @status,
          @assignedTo,
          @createdBy,
          CASE WHEN @status = 'closed' THEN SYSDATETIME() ELSE NULL END
        );
      `);

    const newTicket = result.recordset[0];

    await pool.request()
      .input('ticketId', sql.Int, newTicket.id)
      .input('newStatus', sql.VarChar(20), status)
      .input('changedBy', sql.Int, createdBy)
      .query(`
        INSERT INTO TicketStatusHistory (ticketId, oldStatus, newStatus, changedBy)
        VALUES (@ticketId, NULL, @newStatus, @changedBy);
      `);

    res.status(201).json({ message: 'Ticket creado correctamente', ticket: newTicket });
  } catch (error) {
    console.error('createTicket error:', error);
    res.status(500).json({ error: 'Error al crear el ticket' });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const pool = await getConnection();
    const ticketId = Number(req.params.id);
    const {
      subject,
      description,
      attendedPerson,
      areaId,
      priority,
      difficulty,
      status,
      assignedTo,
    } = req.body;

    if (priority && !VALID_PRIORITY.includes(priority)) {
      return res.status(400).json({ error: 'Prioridad inválida' });
    }
    if (difficulty && !VALID_DIFFICULTY.includes(difficulty)) {
      return res.status(400).json({ error: 'Dificultad inválida' });
    }
    if (status && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const current = await pool.request()
      .input('id', sql.Int, ticketId)
      .query('SELECT * FROM Tickets WHERE id = @id');

    if (!current.recordset.length) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const oldTicket = current.recordset[0];
    const nextStatus = status ?? oldTicket.status;

    const result = await pool.request()
      .input('id', sql.Int, ticketId)
      .input('subject', sql.NVarChar(200), subject ?? oldTicket.subject)
      .input('description', sql.NVarChar(sql.MAX), description ?? oldTicket.description)
      .input('attendedPerson', sql.NVarChar(150), attendedPerson ?? oldTicket.attendedPerson)
      .input('areaId', sql.Int, areaId !== undefined ? normalizeNullableNumber(areaId) : oldTicket.areaId)
      .input('priority', sql.VarChar(20), priority ?? oldTicket.priority)
      .input('difficulty', sql.VarChar(20), difficulty ?? oldTicket.difficulty)
      .input('status', sql.VarChar(20), nextStatus)
      .input('assignedTo', sql.Int, assignedTo !== undefined ? normalizeNullableNumber(assignedTo) : oldTicket.assignedTo)
      .query(`
        UPDATE Tickets
        SET
          subject = @subject,
          description = @description,
          attendedPerson = @attendedPerson,
          areaId = @areaId,
          priority = @priority,
          difficulty = @difficulty,
          status = @status,
          assignedTo = @assignedTo,
          closedAt = CASE
            WHEN @status = 'closed' AND closedAt IS NULL THEN SYSDATETIME()
            WHEN @status <> 'closed' THEN NULL
            ELSE closedAt
          END,
          updatedAt = SYSDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id;
      `);

    if (status && status !== oldTicket.status) {
      await pool.request()
        .input('ticketId', sql.Int, ticketId)
        .input('oldStatus', sql.VarChar(20), oldTicket.status)
        .input('newStatus', sql.VarChar(20), status)
        .input('changedBy', sql.Int, getUserId(req))
        .query(`
          INSERT INTO TicketStatusHistory (ticketId, oldStatus, newStatus, changedBy)
          VALUES (@ticketId, @oldStatus, @newStatus, @changedBy);
        `);
    }

    res.json({ message: 'Ticket actualizado correctamente', ticket: result.recordset[0] });
  } catch (error) {
    console.error('updateTicket error:', error);
    res.status(500).json({ error: 'Error al actualizar el ticket' });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const pool = await getConnection();
    const ticketId = Number(req.params.id);

    const result = await pool.request()
      .input('id', sql.Int, ticketId)
      .query('DELETE FROM Tickets WHERE id = @id');

    if (!result.rowsAffected[0]) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json({ message: 'Ticket eliminado correctamente' });
  } catch (error) {
    console.error('deleteTicket error:', error);
    res.status(500).json({ error: 'Error al eliminar el ticket' });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const pool = await getConnection();
    const ticketId = Number(req.params.id);
    const { status } = req.body;

    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const current = await pool.request()
      .input('id', sql.Int, ticketId)
      .query('SELECT status FROM Tickets WHERE id = @id');

    if (!current.recordset.length) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const oldStatus = current.recordset[0].status;

    const result = await pool.request()
      .input('id', sql.Int, ticketId)
      .input('status', sql.VarChar(20), status)
      .query(`
        UPDATE Tickets
        SET
          status = @status,
          closedAt = CASE
            WHEN @status = 'closed' AND closedAt IS NULL THEN SYSDATETIME()
            WHEN @status <> 'closed' THEN NULL
            ELSE closedAt
          END,
          updatedAt = SYSDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id;
      `);

    if (oldStatus !== status) {
      await pool.request()
        .input('ticketId', sql.Int, ticketId)
        .input('oldStatus', sql.VarChar(20), oldStatus)
        .input('newStatus', sql.VarChar(20), status)
        .input('changedBy', sql.Int, getUserId(req))
        .query(`
          INSERT INTO TicketStatusHistory (ticketId, oldStatus, newStatus, changedBy)
          VALUES (@ticketId, @oldStatus, @newStatus, @changedBy);
        `);
    }

    res.json({ message: 'Estado actualizado correctamente', ticket: result.recordset[0] });
  } catch (error) {
    console.error('updateTicketStatus error:', error);
    res.status(500).json({ error: 'Error al actualizar el estado' });
  }
};

exports.assignTicket = async (req, res) => {
  try {
    const pool = await getConnection();
    const ticketId = Number(req.params.id);
    const assignedTo = normalizeNullableNumber(req.body.userId);

    const result = await pool.request()
      .input('id', sql.Int, ticketId)
      .input('assignedTo', sql.Int, assignedTo)
      .query(`
        UPDATE Tickets
        SET assignedTo = @assignedTo, updatedAt = SYSDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id;
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json({ message: 'Ticket asignado correctamente', ticket: result.recordset[0] });
  } catch (error) {
    console.error('assignTicket error:', error);
    res.status(500).json({ error: 'Error al asignar el ticket' });
  }
};

exports.addTicketComment = async (req, res) => {
  try {
    const pool = await getConnection();
    const ticketId = Number(req.params.id);
    const { comment } = req.body;

    if (!comment || !String(comment).trim()) {
      return res.status(400).json({ error: 'El comentario es obligatorio' });
    }

    const ticketExists = await pool.request()
      .input('ticketId', sql.Int, ticketId)
      .query('SELECT id FROM Tickets WHERE id = @ticketId');

    if (!ticketExists.recordset.length) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const result = await pool.request()
      .input('ticketId', sql.Int, ticketId)
      .input('comment', sql.NVarChar(sql.MAX), String(comment).trim())
      .input('authorId', sql.Int, getUserId(req))
      .input('authorName', sql.NVarChar(150), getUserName(req))
      .query(`
        INSERT INTO TicketComments (ticketId, comment, authorId, authorName)
        OUTPUT
          INSERTED.id,
          INSERTED.comment AS text,
          INSERTED.authorId,
          INSERTED.authorName AS author,
          INSERTED.createdAt AS date
        VALUES (@ticketId, @comment, @authorId, @authorName);

        UPDATE Tickets
        SET updatedAt = SYSDATETIME()
        WHERE id = @ticketId;
      `);

    res.status(201).json({ message: 'Comentario agregado correctamente', comment: result.recordset[0] });
  } catch (error) {
    console.error('addTicketComment error:', error);
    res.status(500).json({ error: 'Error al agregar comentario' });
  }
};

exports.getTicketStats = async (req, res) => {
  try {
    const pool = await getConnection();
    const { startDate, endDate } = req.query;

    let where = 'WHERE 1 = 1';
    const request = pool.request();

    if (startDate) {
      where += ' AND CAST(createdAt AS DATE) >= @startDate';
      request.input('startDate', sql.Date, startDate);
    }

    if (endDate) {
      where += ' AND CAST(createdAt AS DATE) <= @endDate';
      request.input('endDate', sql.Date, endDate);
    }

    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS [open],
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END) AS onHold,
        SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) AS critical,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS high,
        SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) AS medium,
        SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) AS low
      FROM Tickets
      ${where}
    `);

    const stats = result.recordset[0];
    Object.keys(stats).forEach((key) => {
      stats[key] = stats[key] || 0;
    });

    res.json(stats);
  } catch (error) {
    console.error('getTicketStats error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

exports.getTicketsByDay = async (req, res) => {
  try {
    const pool = await getConnection();
    const { date } = req.query;

    const result = await pool.request()
      .input('date', sql.Date, date)
      .query(`
        SELECT
          CAST(createdAt AS DATE) AS date,
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
          SUM(CASE WHEN status <> 'closed' THEN 1 ELSE 0 END) AS pending
        FROM Tickets
        WHERE CAST(createdAt AS DATE) = @date
        GROUP BY CAST(createdAt AS DATE);
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('getTicketsByDay error:', error);
    res.status(500).json({ error: 'Error al agrupar tickets por día' });
  }
};

exports.getTicketsByHour = async (req, res) => {
  try {
    const pool = await getConnection();
    const { date } = req.query;

    const result = await pool.request()
      .input('date', sql.Date, date)
      .query(`
        SELECT
          DATEPART(HOUR, createdAt) AS hour,
          COUNT(*) AS total
        FROM Tickets
        WHERE CAST(createdAt AS DATE) = @date
        GROUP BY DATEPART(HOUR, createdAt)
        ORDER BY hour;
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('getTicketsByHour error:', error);
    res.status(500).json({ error: 'Error al agrupar tickets por hora' });
  }
};

exports.getWeekTickets = async (req, res) => {
  try {
    const pool = await getConnection();
    const { startDate, endDate } = req.query;

    const result = await pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .query(`
        SELECT
          CAST(createdAt AS DATE) AS date,
          COUNT(*) AS total
        FROM Tickets
        WHERE CAST(createdAt AS DATE) BETWEEN @startDate AND @endDate
        GROUP BY CAST(createdAt AS DATE)
        ORDER BY date;
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('getWeekTickets error:', error);
    res.status(500).json({ error: 'Error al obtener tickets de la semana' });
  }
};

exports.getMonthTickets = async (req, res) => {
  try {
    const pool = await getConnection();
    const { year, month } = req.query;

    const result = await pool.request()
      .input('year', sql.Int, Number(year))
      .input('month', sql.Int, Number(month))
      .query(`
        SELECT
          DAY(createdAt) AS day,
          COUNT(*) AS total
        FROM Tickets
        WHERE YEAR(createdAt) = @year AND MONTH(createdAt) = @month
        GROUP BY DAY(createdAt)
        ORDER BY day;
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('getMonthTickets error:', error);
    res.status(500).json({ error: 'Error al obtener tickets del mes' });
  }
};

exports.getAreas = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT id, nombre, descripcion
      FROM Areas
      WHERE activo = 1
      ORDER BY nombre;
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('getAreas error:', error);
    res.status(500).json({ error: 'Error al obtener áreas' });
  }
};

exports.getUsers = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT IdUsuario AS id, NombreUsuario AS nombre, Usuario AS usuario
      FROM Cat_Usuario
      ORDER BY NombreUsuario;
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};
