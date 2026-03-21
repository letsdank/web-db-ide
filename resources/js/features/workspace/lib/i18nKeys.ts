export const WORKSPACE_I18N_KEYS = {
    runAll: 'workspace.runAll',
    runSelection: 'workspace.runSelection',
    selectConnection: 'workspace.selectConnection',
    noConnection: 'workspace.noConnection',

    resources: {
        all: 'workspace.allResources',
        owned: 'workspace.ownedResources',
        shared: 'workspace.sharedResources',
    },

    dump: {
        export: 'workspace.exportDump',
        exporting: 'workspace.exportingDump',
        success: 'workspace.dumpExportSuccess',
        failed: 'workspace.dumpExportFailed',
        postgresOnly: 'workspace.dumpExportOnlyPostgres',
        connectionNotFound: 'workspace.dumpConnectionNotFound',

        format: 'workspace.dumpFormat',
        formatPlain: 'workspace.dumpFormatPlain',
        formatCustom: 'workspace.dumpFormatCustom',

        section: 'workspace.dumpSection',
        sectionFull: 'workspace.dumpSectionFull',
        sectionSchema: 'workspace.dumpSectionSchema',
        sectionData: 'workspace.dumpSectionData',

        clean: 'workspace.dumpClean',
        ifExists: 'workspace.dumpIfExists',
        noOwner: 'workspace.dumpNoOwner',
        noPrivileges: 'workspace.dumpNoPrivileges',
        includeBlobs: 'workspace.dumpIncludeBlobs',

        targetDatabase: 'workspace.dumpTargetDatabase',
        targetSchema: 'workspace.dumpTargetSchema',
        targetTable: 'workspace.dumpTargetTable',

        tableSchemaExportSuccess: 'workspace.tableSchemaExportSuccess',
        tableDataExportSuccess: 'workspace.tableDataExportSuccess',
    },
} as const;
