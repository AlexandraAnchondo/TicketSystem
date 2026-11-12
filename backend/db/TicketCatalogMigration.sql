USE [BD_TICKETS_SOPORTE];
GO

IF OBJECT_ID(N'dbo.Activities', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Activities (
        id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Activities PRIMARY KEY,
        name nvarchar(150) NOT NULL,
        active bit NOT NULL CONSTRAINT DF_Activities_active DEFAULT (1),
        createdAt datetime2(7) NOT NULL CONSTRAINT DF_Activities_createdAt DEFAULT (SYSDATETIME()),
        CONSTRAINT UQ_Activities_name UNIQUE (name)
    );
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

INSERT INTO dbo.Activities (name)
SELECT activities.name
FROM (VALUES
    (N'Instalación de software'),
    (N'Configuración de equipo'),
    (N'Mantenimiento preventivo'),
    (N'Mantenimiento correctivo'),
    (N'Soporte a impresora'),
    (N'Soporte de red'),
    (N'Creación o recuperación de cuenta'),
    (N'Asesoría a usuario'),
    (N'Revisión de equipo'),
    (N'Otro')
) AS activities(name)
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.Activities existing
    WHERE existing.name = activities.name
);
GO
