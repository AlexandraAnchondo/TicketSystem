IF OBJECT_ID(N'dbo.Cat_DepartamentoArea', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Cat_DepartamentoArea (
        id_departamento_area int IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Cat_DepartamentoArea PRIMARY KEY,
        departamento_area nvarchar(30) NOT NULL
            CONSTRAINT UQ_Cat_DepartamentoArea_nombre UNIQUE,
        CONSTRAINT CK_Cat_DepartamentoArea_nombre
            CHECK (departamento_area IN (N'Soporte Técnico', N'Sistemas'))
    );
END;
GO

INSERT INTO dbo.Cat_DepartamentoArea (departamento_area)
SELECT N'Soporte Técnico'
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Cat_DepartamentoArea
    WHERE departamento_area = N'Soporte Técnico'
);
GO

INSERT INTO dbo.Cat_DepartamentoArea (departamento_area)
SELECT N'Sistemas'
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Cat_DepartamentoArea
    WHERE departamento_area = N'Sistemas'
);
GO

IF COL_LENGTH(N'dbo.Cat_Usuario', N'id_departamento_area') IS NULL
    ALTER TABLE dbo.Cat_Usuario ADD id_departamento_area int NULL;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_Cat_Usuario_Cat_DepartamentoArea'
)
BEGIN
    ALTER TABLE dbo.Cat_Usuario WITH CHECK
        ADD CONSTRAINT FK_Cat_Usuario_Cat_DepartamentoArea
        FOREIGN KEY (id_departamento_area)
        REFERENCES dbo.Cat_DepartamentoArea (id_departamento_area);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Cat_Usuario')
      AND name = N'IX_Cat_Usuario_id_departamento_area'
)
BEGIN
    CREATE INDEX IX_Cat_Usuario_id_departamento_area
        ON dbo.Cat_Usuario (id_departamento_area);
END;
GO
