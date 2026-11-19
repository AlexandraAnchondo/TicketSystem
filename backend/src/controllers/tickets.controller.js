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
const VALID_SERVICE_TYPES = ['Sistemas', 'Soporte Técnico'];

const getUserId = (user) => {
  return user?.id || user?.IdUsuario || user?.userId || user?.idUsuario || null;
};

const getUserName = (user) => {
  return user?.nombre || user?.NombreUsuario || user?.usuario || user?.Usuario || 'Usuario';
};

const getUserContext = async (pool, authenticatedUser) => {
  const userId = getUserId(authenticatedUser);
  if (!userId) return null;

  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT
        u.IdUsuario AS id,
        u.IdPerfil AS idPerfil,
        u.id_departamento_area AS departmentAreaId,
        da.departamento_area AS serviceType,
        LTRIM(RTRIM(CONCAT(
          u.Nombre, N' ',
          u.ApellidoPaterno, N' ',
          COALESCE(u.ApellidoMaterno, N'')
        ))) AS fullName
      FROM dbo.Cat_Usuario u
      LEFT JOIN dbo.Cat_DepartamentoArea da
        ON da.id_departamento_area = u.id_departamento_area
      WHERE u.IdUsuario = @userId;
    `);

  if (!result.recordset.length) return null;

  const user = result.recordset[0];
  return { ...user, isAdmin: user.idPerfil === 1 };
};

const getDepartmentVisibility = (request, user, ticketAlias = 't') => {
  request
    .input('currentUserId', sql.Int, user.id)
    .input('currentDepartmentAreaId', sql.Int, user.departmentAreaId)
    .input('isAdmin', sql.Bit, user.isAdmin);

  return `(@isAdmin = 1 OR EXISTS (
    SELECT 1
    FROM dbo.Cat_DepartamentoArea da
    WHERE da.id_departamento_area = @currentDepartmentAreaId
      AND da.departamento_area = ${ticketAlias}.serviceType
  ))`;
};

const getTicketAccess = async (pool, ticketId, user) => {
  const result = await pool.request()
    .input('ticketId', sql.Int, ticketId)
    .query(`
      SELECT id, serviceType, createdBy
      FROM dbo.Tickets
      WHERE id = @ticketId;
    `);

  const ticket = result.recordset[0];
  if (!ticket) return null;

  if (
    !user.isAdmin
    && (!user.serviceType || ticket.serviceType !== user.serviceType)
  ) {
    return null;
  }

  return ticket;
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
  canViewDescription: row.canViewDescription,
  attendedPerson: row.attendedPerson,
  areaId: row.areaId,
  departmentId: row.departmentId,
  area: row.area,
  activityId: row.activityId,
  serviceType: row.serviceType,
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
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const {
      startDate,
      endDate,
      priority,
      status,
      serviceType,
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
    const departmentVisibility = getDepartmentVisibility(request, user);
    where += ` AND ${departmentVisibility}`;

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

    if (serviceType) {
      if (!VALID_SERVICE_TYPES.includes(serviceType)) {
        return res.status(400).json({ error: 'Tipo de servicio inválido' });
      }
      where += ' AND t.serviceType = @serviceType';
      request.input('serviceType', sql.NVarChar(30), serviceType);
    }

    const assignedToNumber = normalizeNullableNumber(assignedTo);
    if (assignedToNumber) {
      where += ' AND t.assignedTo = @assignedTo';
      request.input('assignedTo', sql.Int, assignedToNumber);
    }

    if (search && String(search).trim()) {
      where += ` AND (
        t.subject LIKE @search OR
        (
          (t.serviceType <> N'Sistemas' OR t.createdBy = @currentUserId OR @isAdmin = 1)
          AND t.description LIKE @search
        ) OR
        t.attendedPerson LIKE @search OR
        COALESCE(t.departmentName, a.nombre) LIKE @search
      )`;
      request.input('search', sql.NVarChar(250), `%${String(search).trim()}%`);
    }

    const query = `
      SELECT
        t.id,
        t.subject,
        CASE
          WHEN t.serviceType = N'Sistemas'
            AND ISNULL(t.createdBy, 0) <> @currentUserId
            AND @isAdmin = 0 THEN NULL
          ELSE t.description
        END AS description,
        CASE
          WHEN t.serviceType = N'Sistemas'
            AND ISNULL(t.createdBy, 0) <> @currentUserId
            AND @isAdmin = 0 THEN 0
          ELSE 1
        END AS canViewDescription,
        t.attendedPerson,
        t.areaId,
        t.departmentId,
        COALESCE(t.departmentName, a.nombre) AS area,
        t.activityId,
        t.serviceType,
        t.priority,
        t.difficulty,
        t.status,
        t.assignedTo,
        LTRIM(RTRIM(CONCAT(au.Nombre, N' ', au.ApellidoPaterno, N' ', COALESCE(au.ApellidoMaterno, N'')))) AS assignedToName,
        t.createdBy,
        LTRIM(RTRIM(CONCAT(cu.Nombre, N' ', cu.ApellidoPaterno, N' ', COALESCE(cu.ApellidoMaterno, N'')))) AS createdByName,
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
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });

    const ticketRequest = pool.request().input('id', sql.Int, ticketId);
    const departmentVisibility = getDepartmentVisibility(ticketRequest, user);
    const ticketResult = await ticketRequest.query(`
        SELECT
          t.id,
          t.subject,
          CASE
            WHEN t.serviceType = N'Sistemas'
              AND ISNULL(t.createdBy, 0) <> @currentUserId
              AND @isAdmin = 0 THEN NULL
            ELSE t.description
          END AS description,
          CASE
            WHEN t.serviceType = N'Sistemas'
              AND ISNULL(t.createdBy, 0) <> @currentUserId
              AND @isAdmin = 0 THEN 0
            ELSE 1
          END AS canViewDescription,
          t.attendedPerson,
          t.areaId,
          t.departmentId,
          COALESCE(t.departmentName, a.nombre) AS area,
          t.activityId,
          t.serviceType,
          t.priority,
          t.difficulty,
          t.status,
          t.assignedTo,
          LTRIM(RTRIM(CONCAT(au.Nombre, N' ', au.ApellidoPaterno, N' ', COALESCE(au.ApellidoMaterno, N'')))) AS assignedToName,
          t.createdBy,
          LTRIM(RTRIM(CONCAT(cu.Nombre, N' ', cu.ApellidoPaterno, N' ', COALESCE(cu.ApellidoMaterno, N'')))) AS createdByName,
          t.closedAt,
          t.createdAt,
          t.updatedAt
        FROM Tickets t
        LEFT JOIN Areas a ON a.id = t.areaId
        LEFT JOIN Cat_Usuario au ON au.IdUsuario = t.assignedTo
        LEFT JOIN Cat_Usuario cu ON cu.IdUsuario = t.createdBy
        WHERE t.id = @id
          AND ${departmentVisibility};
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
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const {
      activityId,
      description,
      attendedPerson,
      departmentId,
      serviceType: requestedServiceType,
      priority = 'medium',
      difficulty = 'medium',
      status = 'open',
    } = req.body;

    const activityIdNumber = normalizeNullableNumber(activityId);
    if (!Number.isSafeInteger(activityIdNumber) || activityIdNumber <= 0) {
      return res.status(400).json({ error: 'Selecciona una actividad válida' });
    }

    const serviceType = user.isAdmin ? requestedServiceType : user.serviceType;
    if (!user.isAdmin && !serviceType) {
      return res.status(409).json({ error: 'Un administrador debe asignarte un tipo de servicio antes de crear tickets' });
    }

    if (!VALID_SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({ error: 'Tipo de servicio inválido' });
    }

    if (!attendedPerson || !String(attendedPerson).trim()) {
      return res.status(400).json({ error: 'La persona atendida es obligatoria' });
    }

    const activityResult = await pool.request()
      .input('activityId', sql.Int, activityIdNumber)
      .query(`
        SELECT name, serviceType
        FROM dbo.Activities
        WHERE id = @activityId AND active = 1;
      `);

    if (!activityResult.recordset.length) {
      return res.status(400).json({ error: 'La actividad seleccionada no está disponible' });
    }
    if (activityResult.recordset[0].serviceType !== serviceType) {
      return res.status(400).json({ error: 'La actividad no corresponde al tipo de servicio seleccionado' });
    }

    const departmentIdNumber = normalizeNullableNumber(departmentId);
    if (!Number.isSafeInteger(departmentIdNumber) || departmentIdNumber <= 0) {
      return res.status(400).json({ error: 'Selecciona un área válida' });
    }

    const departmentResult = await pool.request()
      .input('departmentId', sql.Int, departmentIdNumber)
      .query(`
        SELECT TOP (1) COALESCE(NULLIF(LTRIM(RTRIM(DepartamentoNombre)), N''), Departamento) AS name
        FROM [SIC_2026].[dbo].[P_Departamentos]
        WHERE IdDepartamento = @departmentId
          AND (TRY_CONVERT(int, Status) = 1
            OR UPPER(LTRIM(RTRIM(CONVERT(nvarchar(30), Status)))) IN (N'ACTIVO', N'ACTIVE', N'A'));
      `);

    if (!departmentResult.recordset.length) {
      return res.status(400).json({ error: 'El área seleccionada no está disponible' });
    }
    const departmentName = departmentResult.recordset[0].name;

    if (!VALID_PRIORITY.includes(priority)) {
      return res.status(400).json({ error: 'Prioridad inválida' });
    }

    if (!VALID_DIFFICULTY.includes(difficulty)) {
      return res.status(400).json({ error: 'Dificultad inválida' });
    }

    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const createdBy = user.id;
    const result = await pool.request()
      .input('subject', sql.NVarChar(200), activityResult.recordset[0].name)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('attendedPerson', sql.NVarChar(150), String(attendedPerson).trim())
      .input('activityId', sql.Int, activityIdNumber)
      .input('departmentId', sql.Int, departmentIdNumber)
      .input('departmentName', sql.NVarChar(200), departmentName)
      .input('serviceType', sql.NVarChar(30), serviceType)
      .input('priority', sql.VarChar(20), priority)
      .input('difficulty', sql.VarChar(20), difficulty)
      .input('status', sql.VarChar(20), status)
      .input('assignedTo', sql.Int, createdBy)
      .input('createdBy', sql.Int, createdBy)
      .query(`
        INSERT INTO Tickets (
          subject,
          description,
          attendedPerson,
          activityId,
          departmentId,
          departmentName,
          serviceType,
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
          @activityId,
          @departmentId,
          @departmentName,
          @serviceType,
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
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const accessibleTicket = await getTicketAccess(pool, ticketId, user);
    if (!accessibleTicket) return res.status(404).json({ error: 'Ticket no encontrado' });
    const {
      subject,
      description,
      attendedPerson,
      areaId,
      priority,
      difficulty,
      status,
      assignedTo
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
    if (
      description !== undefined
      && oldTicket.serviceType === 'Sistemas'
      && !user.isAdmin
      && oldTicket.createdBy !== user.id
    ) {
      return res.status(403).json({ error: 'Solo quien creó el ticket o Admin puede modificar su descripción' });
    }

    const result = await pool.request()
      .input('id', sql.Int, ticketId)
      .input('currentUserId', sql.Int, user.id)
      .input('isAdmin', sql.Bit, user.isAdmin)
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
        OUTPUT
          INSERTED.id,
          INSERTED.subject,
          CASE
            WHEN INSERTED.serviceType = N'Sistemas'
              AND ISNULL(INSERTED.createdBy, 0) <> @currentUserId
              AND @isAdmin = 0 THEN NULL
            ELSE INSERTED.description
          END AS description,
          CASE
            WHEN INSERTED.serviceType = N'Sistemas'
              AND ISNULL(INSERTED.createdBy, 0) <> @currentUserId
              AND @isAdmin = 0 THEN 0
            ELSE 1
          END AS canViewDescription,
          INSERTED.status,
          INSERTED.serviceType,
          INSERTED.updatedAt
        WHERE id = @id;
      `);

    if (status && status !== oldTicket.status) {
      await pool.request()
        .input('ticketId', sql.Int, ticketId)
        .input('oldStatus', sql.VarChar(20), oldTicket.status)
        .input('newStatus', sql.VarChar(20), status)
        .input('changedBy', sql.Int, user.id)
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
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const accessibleTicket = await getTicketAccess(pool, ticketId, user);
    if (!accessibleTicket) return res.status(404).json({ error: 'Ticket no encontrado' });

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
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const accessibleTicket = await getTicketAccess(pool, ticketId, user);
    if (!accessibleTicket) return res.status(404).json({ error: 'Ticket no encontrado' });

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
      .input('currentUserId', sql.Int, user.id)
      .input('isAdmin', sql.Bit, user.isAdmin)
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
        OUTPUT
          INSERTED.id,
          INSERTED.status,
          CASE
            WHEN INSERTED.serviceType = N'Sistemas'
              AND ISNULL(INSERTED.createdBy, 0) <> @currentUserId
              AND @isAdmin = 0 THEN NULL
            ELSE INSERTED.description
          END AS description,
          CASE
            WHEN INSERTED.serviceType = N'Sistemas'
              AND ISNULL(INSERTED.createdBy, 0) <> @currentUserId
              AND @isAdmin = 0 THEN 0
            ELSE 1
          END AS canViewDescription
        WHERE id = @id;
      `);

    if (oldStatus !== status) {
      await pool.request()
        .input('ticketId', sql.Int, ticketId)
        .input('oldStatus', sql.VarChar(20), oldStatus)
        .input('newStatus', sql.VarChar(20), status)
        .input('changedBy', sql.Int, user.id)
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
    const { userId } = req.body;
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const accessibleTicket = await getTicketAccess(pool, ticketId, user);
    if (!accessibleTicket) return res.status(404).json({ error: 'Ticket no encontrado' });
    const assignedTo = normalizeNullableNumber(userId);

    if (assignedTo !== null && (!Number.isSafeInteger(assignedTo) || assignedTo <= 0)) {
      return res.status(400).json({ error: 'Usuario asignado inválido' });
    }

    const result = await pool.request()
      .input('id', sql.Int, ticketId)
      .input('assignedTo', sql.Int, assignedTo)
      .input('currentUserId', sql.Int, user.id)
      .input('isAdmin', sql.Bit, user.isAdmin)
      .query(`
        UPDATE Tickets
        SET assignedTo = @assignedTo, updatedAt = SYSDATETIME()
        OUTPUT
          INSERTED.id,
          INSERTED.assignedTo,
          CASE
            WHEN INSERTED.serviceType = N'Sistemas'
              AND ISNULL(INSERTED.createdBy, 0) <> @currentUserId
              AND @isAdmin = 0 THEN NULL
            ELSE INSERTED.description
          END AS description,
          CASE
            WHEN INSERTED.serviceType = N'Sistemas'
              AND ISNULL(INSERTED.createdBy, 0) <> @currentUserId
              AND @isAdmin = 0 THEN 0
            ELSE 1
          END AS canViewDescription
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
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const accessibleTicket = await getTicketAccess(pool, ticketId, user);
    if (!accessibleTicket) return res.status(404).json({ error: 'Ticket no encontrado' });

    if (!comment || !String(comment).trim()) {
      return res.status(400).json({ error: 'El comentario es obligatorio' });
    }

    const result = await pool.request()
      .input('ticketId', sql.Int, ticketId)
      .input('comment', sql.NVarChar(sql.MAX), String(comment).trim())
      .input('authorId', sql.Int, user.id)
      .input('authorName', sql.NVarChar(150), user.fullName || getUserName(req.user))
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

exports.updateTicketComment = async (req, res) => {
  try {
    const pool = await getConnection();
    const ticketId = Number(req.params.ticketId);
    const commentId = Number(req.params.commentId);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const accessibleTicket = await getTicketAccess(pool, ticketId, user);
    if (!accessibleTicket) return res.status(404).json({ error: 'Ticket no encontrado' });
    if (!Number.isSafeInteger(commentId) || commentId <= 0) {
      return res.status(400).json({ error: 'Comentario inválido' });
    }
    if (!comment) {
      return res.status(400).json({ error: 'El comentario es obligatorio' });
    }

    const result = await pool.request()
      .input('ticketId', sql.Int, ticketId)
      .input('commentId', sql.Int, commentId)
      .input('comment', sql.NVarChar(sql.MAX), comment)
      .query(`
        UPDATE dbo.TicketComments
        SET comment = @comment
        OUTPUT
          INSERTED.id,
          INSERTED.comment AS text,
          INSERTED.authorId,
          INSERTED.authorName AS author,
          INSERTED.createdAt AS date
        WHERE id = @commentId AND ticketId = @ticketId;
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    await pool.request()
      .input('ticketId', sql.Int, ticketId)
      .query('UPDATE dbo.Tickets SET updatedAt = SYSDATETIME() WHERE id = @ticketId;');

    res.json({ message: 'Comentario actualizado correctamente', comment: result.recordset[0] });
  } catch (error) {
    console.error('updateTicketComment error:', error);
    res.status(500).json({ error: 'Error al actualizar comentario' });
  }
};

exports.getTicketStats = async (req, res) => {
  try {
    const pool = await getConnection();
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const { startDate, endDate, assignedTo } = req.query;

    let where = 'WHERE 1 = 1';
    const request = pool.request();
    where += ` AND ${getDepartmentVisibility(request, user)}`;

    const assignedToNumber = normalizeNullableNumber(assignedTo);
    if (assignedToNumber !== null) {
      if (!Number.isSafeInteger(assignedToNumber) || assignedToNumber <= 0) {
        return res.status(400).json({ error: 'Usuario asignado inválido' });
      }
      where += ' AND t.assignedTo = @assignedTo';
      request.input('assignedTo', sql.Int, assignedToNumber);
    }

    if (startDate) {
      where += ' AND CAST(t.createdAt AS DATE) >= @startDate';
      request.input('startDate', sql.Date, startDate);
    }

    if (endDate) {
      where += ' AND CAST(t.createdAt AS DATE) <= @endDate';
      request.input('endDate', sql.Date, endDate);
    }

    const result = await request.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN t.status = 'open' THEN 1 ELSE 0 END) AS [open],
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN t.status = 'closed' THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN t.status = 'on_hold' THEN 1 ELSE 0 END) AS onHold,
        SUM(CASE WHEN t.priority = 'critical' THEN 1 ELSE 0 END) AS critical,
        SUM(CASE WHEN t.priority = 'high' THEN 1 ELSE 0 END) AS high,
        SUM(CASE WHEN t.priority = 'medium' THEN 1 ELSE 0 END) AS medium,
        SUM(CASE WHEN t.priority = 'low' THEN 1 ELSE 0 END) AS low
      FROM dbo.Tickets t
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
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const { date } = req.query;
    const request = pool.request().input('date', sql.Date, date);
    const departmentVisibility = getDepartmentVisibility(request, user);

    const result = await request.query(`
        SELECT
          CAST(t.createdAt AS DATE) AS date,
          COUNT(*) AS total,
          SUM(CASE WHEN t.status = 'closed' THEN 1 ELSE 0 END) AS closed,
          SUM(CASE WHEN t.status <> 'closed' THEN 1 ELSE 0 END) AS pending
        FROM dbo.Tickets t
        WHERE CAST(t.createdAt AS DATE) = @date
          AND ${departmentVisibility}
        GROUP BY CAST(t.createdAt AS DATE);
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
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const { date } = req.query;
    const request = pool.request().input('date', sql.Date, date);
    const departmentVisibility = getDepartmentVisibility(request, user);

    const result = await request.query(`
        SELECT
          DATEPART(HOUR, t.createdAt) AS hour,
          COUNT(*) AS total
        FROM dbo.Tickets t
        WHERE CAST(t.createdAt AS DATE) = @date
          AND ${departmentVisibility}
        GROUP BY DATEPART(HOUR, t.createdAt)
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
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const { startDate, endDate } = req.query;
    const request = pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate);
    const departmentVisibility = getDepartmentVisibility(request, user);

    const result = await request.query(`
        SELECT
          CAST(t.createdAt AS DATE) AS date,
          COUNT(*) AS total
        FROM dbo.Tickets t
        WHERE CAST(t.createdAt AS DATE) BETWEEN @startDate AND @endDate
          AND ${departmentVisibility}
        GROUP BY CAST(t.createdAt AS DATE)
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
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const { year, month } = req.query;
    const request = pool.request()
      .input('year', sql.Int, Number(year))
      .input('month', sql.Int, Number(month));
    const departmentVisibility = getDepartmentVisibility(request, user);

    const result = await request.query(`
        SELECT
          DAY(t.createdAt) AS day,
          COUNT(*) AS total
        FROM dbo.Tickets t
        WHERE YEAR(t.createdAt) = @year
          AND MONTH(t.createdAt) = @month
          AND ${departmentVisibility}
        GROUP BY DAY(t.createdAt)
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
      SELECT
        IdDepartamento AS id,
        IdDepartamento AS departmentId,
        IdPrograma AS programId,
        Departamento,
        COALESCE(NULLIF(LTRIM(RTRIM(DepartamentoNombre)), N''), Departamento) AS nombre,
        Status AS status
      FROM [SIC_2026].[dbo].[P_Departamentos]
      WHERE TRY_CONVERT(int, Status) = 1
        OR UPPER(LTRIM(RTRIM(CONVERT(nvarchar(30), Status)))) IN (N'ACTIVO', N'ACTIVE', N'A')
      ORDER BY COALESCE(NULLIF(LTRIM(RTRIM(DepartamentoNombre)), N''), Departamento);
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('getAreas error:', error);
    res.status(500).json({ error: 'Error al obtener áreas' });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const pool = await getConnection();
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const { serviceType: requestedServiceType } = req.query;
    if (requestedServiceType && !VALID_SERVICE_TYPES.includes(requestedServiceType)) {
      return res.status(400).json({ error: 'Tipo de servicio inválido' });
    }

    const request = pool.request();
    let where = 'WHERE active = 1';
    const serviceType = user.isAdmin ? requestedServiceType : user.serviceType;
    if (!user.isAdmin && !serviceType) {
      return res.status(409).json({ error: 'Un administrador debe asignarte un tipo de servicio antes de consultar actividades' });
    }
    if (serviceType) {
      where += ' AND serviceType = @serviceType';
      request.input('serviceType', sql.NVarChar(30), serviceType);
    }

    const result = await request.query(`
      SELECT id, name, serviceType
      FROM dbo.Activities
      ${where}
      ORDER BY name;
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('getActivities error:', error);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const { serviceType } = req.body;

    if (!name || name.length > 150) {
      return res.status(400).json({ error: 'El nombre debe tener entre 1 y 150 caracteres' });
    }
    if (!VALID_SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({ error: 'Tipo de servicio inválido' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('name', sql.NVarChar(150), name)
      .input('serviceType', sql.NVarChar(30), serviceType)
      .query(`
        INSERT INTO dbo.Activities (name, serviceType)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.serviceType
        VALUES (@name, @serviceType);
      `);

    res.status(201).json({ message: 'Actividad creada correctamente', activity: result.recordset[0] });
  } catch (error) {
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({ error: 'Ya existe una actividad con ese nombre' });
    }
    console.error('createActivity error:', error);
    res.status(500).json({ error: 'Error al crear la actividad' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const pool = await getConnection();
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    const request = pool.request();
    let userFilter = '';
    if (!user.isAdmin) {
      request.input('departmentAreaId', sql.Int, user.departmentAreaId);
      userFilter = 'WHERE u.id_departamento_area = @departmentAreaId';
    }

    const result = await request.query(`
      SELECT
        u.IdUsuario AS id,
        LTRIM(RTRIM(CONCAT(
          u.Nombre, N' ',
          u.ApellidoPaterno, N' ',
          COALESCE(u.ApellidoMaterno, N'')
        ))) AS nombre,
        u.NombreUsuario AS username,
        u.IdPerfil AS profileId,
        u.id_departamento_area AS departmentAreaId,
        da.departamento_area AS serviceType
      FROM dbo.Cat_Usuario u
      LEFT JOIN dbo.Cat_DepartamentoArea da
        ON da.id_departamento_area = u.id_departamento_area
      ${userFilter}
      ORDER BY u.Nombre, u.ApellidoPaterno, u.ApellidoMaterno;
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const pool = await getConnection();
    const user = await getUserContext(pool, req.user);
    if (!user) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    res.json({
      id: user.id,
      idPerfil: user.idPerfil,
      isAdmin: user.isAdmin,
      departmentAreaId: user.departmentAreaId,
      serviceType: user.serviceType,
      fullName: user.fullName,
    });
  } catch (error) {
    console.error('getCurrentUser error:', error);
    res.status(500).json({ error: 'Error al obtener el usuario autenticado' });
  }
};

exports.getDepartmentAreas = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        id_departamento_area AS id,
        departamento_area AS serviceType
      FROM dbo.Cat_DepartamentoArea
      ORDER BY id_departamento_area;
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('getDepartmentAreas error:', error);
    res.status(500).json({ error: 'Error al obtener tipos de departamento' });
  }
};

exports.updateUserDepartmentArea = async (req, res) => {
  try {
    const pool = await getConnection();
    const currentUser = await getUserContext(pool, req.user);
    if (!currentUser) return res.status(401).json({ error: 'Usuario autenticado no encontrado' });
    if (!currentUser.isAdmin) return res.status(403).json({ error: 'Solo Admin puede asignar departamentos' });

    const userId = Number(req.params.id);
    const departmentAreaId = normalizeNullableNumber(req.body.departmentAreaId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Usuario inválido' });
    }
    if (!Number.isSafeInteger(departmentAreaId) || departmentAreaId <= 0) {
      return res.status(400).json({ error: 'Selecciona un tipo de departamento válido' });
    }

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('departmentAreaId', sql.Int, departmentAreaId)
      .input('adminName', sql.VarChar(50), getUserName(req.user))
      .query(`
        UPDATE dbo.Cat_Usuario
        SET id_departamento_area = @departmentAreaId,
            FechaModificacion = SYSDATETIME(),
            UsuarioModificacion = @adminName
        OUTPUT
          INSERTED.IdUsuario AS id,
          LTRIM(RTRIM(CONCAT(
            INSERTED.Nombre, N' ',
            INSERTED.ApellidoPaterno, N' ',
            COALESCE(INSERTED.ApellidoMaterno, N'')
          ))) AS nombre,
          INSERTED.id_departamento_area AS departmentAreaId
        WHERE IdUsuario = @userId;
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const departmentArea = await pool.request()
      .input('departmentAreaId', sql.Int, departmentAreaId)
      .query(`
        SELECT departamento_area AS serviceType
        FROM dbo.Cat_DepartamentoArea
        WHERE id_departamento_area = @departmentAreaId;
      `);

    res.json({
      message: 'Departamento asignado correctamente',
      user: { ...result.recordset[0], serviceType: departmentArea.recordset[0]?.serviceType },
    });
  } catch (error) {
    if (error.number === 547) {
      return res.status(400).json({ error: 'Selecciona un tipo de departamento válido' });
    }
    console.error('updateUserDepartmentArea error:', error);
    res.status(500).json({ error: 'Error al asignar el departamento' });
  }
};
