USE [BD_TICKETS_SOPORTE];
GO

IF OBJECT_ID(N'dbo.Activities', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Activities (
        id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Activities PRIMARY KEY,
        name nvarchar(150) NOT NULL,
        serviceType nvarchar(30) NOT NULL CONSTRAINT DF_Activities_serviceType DEFAULT (N'Soporte Técnico'),
        active bit NOT NULL CONSTRAINT DF_Activities_active DEFAULT (1),
        createdAt datetime2(7) NOT NULL CONSTRAINT DF_Activities_createdAt DEFAULT (SYSDATETIME()),
        CONSTRAINT UQ_Activities_name UNIQUE (name),
        CONSTRAINT CK_Activities_serviceType CHECK (serviceType IN (N'Sistemas', N'Soporte Técnico'))
    );
END;
GO

IF COL_LENGTH(N'dbo.Activities', N'serviceType') IS NULL
    ALTER TABLE dbo.Activities ADD serviceType nvarchar(30) NULL;
GO

UPDATE dbo.Activities
SET serviceType = CASE
    WHEN name IN (
        N'Instalación de software',
        N'Configuración de equipo',
        N'Creación o recuperación de cuenta'
    ) THEN N'Sistemas'
    ELSE N'Soporte Técnico'
END
WHERE serviceType IS NULL
   OR serviceType NOT IN (N'Sistemas', N'Soporte Técnico');
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.default_constraints d
    INNER JOIN sys.columns c
        ON c.object_id = d.parent_object_id
        AND c.column_id = d.parent_column_id
    WHERE d.parent_object_id = OBJECT_ID(N'dbo.Activities')
      AND c.name = N'serviceType'
)
BEGIN
    ALTER TABLE dbo.Activities
        ADD CONSTRAINT DF_Activities_serviceType
        DEFAULT (N'Soporte Técnico') FOR serviceType;
END;
GO

ALTER TABLE dbo.Activities ALTER COLUMN serviceType nvarchar(30) NOT NULL;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.Activities')
      AND name = N'CK_Activities_serviceType'
)
BEGIN
    ALTER TABLE dbo.Activities WITH CHECK
        ADD CONSTRAINT CK_Activities_serviceType
        CHECK (serviceType IN (N'Sistemas', N'Soporte Técnico'));
END;
GO

IF COL_LENGTH(N'dbo.Tickets', N'activityId') IS NULL
    ALTER TABLE dbo.Tickets ADD activityId int NULL;
GO

IF COL_LENGTH(N'dbo.Tickets', N'departmentId') IS NULL
    ALTER TABLE dbo.Tickets ADD departmentId int NULL;
GO

IF COL_LENGTH(N'dbo.Tickets', N'departmentName') IS NULL
    ALTER TABLE dbo.Tickets ADD departmentName nvarchar(200) NULL;
GO

IF COL_LENGTH(N'dbo.Tickets', N'serviceType') IS NULL
    ALTER TABLE dbo.Tickets ADD serviceType nvarchar(30) NOT NULL
        CONSTRAINT DF_Tickets_serviceType DEFAULT (N'Sistemas') WITH VALUES;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_Tickets_Activities'
)
BEGIN
    ALTER TABLE dbo.Tickets WITH CHECK
        ADD CONSTRAINT FK_Tickets_Activities
        FOREIGN KEY (activityId) REFERENCES dbo.Activities(id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_Tickets_serviceType'
)
BEGIN
    ALTER TABLE dbo.Tickets WITH CHECK
        ADD CONSTRAINT CK_Tickets_serviceType
        CHECK (serviceType IN (N'Sistemas', N'Soporte Técnico'));
END;
GO

INSERT INTO dbo.Activities (name, serviceType)
SELECT activities.name, activities.serviceType
FROM (VALUES
    (N'Instalación de software', N'Sistemas'),
    (N'Configuración de equipo', N'Sistemas'),
    (N'Mantenimiento preventivo', N'Soporte Técnico'),
    (N'Mantenimiento correctivo', N'Soporte Técnico'),
    (N'Soporte a impresora', N'Soporte Técnico'),
    (N'Soporte de red', N'Soporte Técnico'),
    (N'Creación o recuperación de cuenta', N'Sistemas'),
    (N'Asesoría a usuario', N'Soporte Técnico'),
    (N'Revisión de equipo', N'Soporte Técnico'),
    (N'Otro', N'Soporte Técnico')
) AS activities(name, serviceType)
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.Activities existing
    WHERE existing.name = activities.name
);
GO

UPDATE ticket
SET ticket.serviceType = activity.serviceType
FROM dbo.Tickets ticket
INNER JOIN dbo.Activities activity ON activity.id = ticket.activityId
WHERE ticket.activityId IS NOT NULL
  AND ticket.serviceType <> activity.serviceType;
GO
