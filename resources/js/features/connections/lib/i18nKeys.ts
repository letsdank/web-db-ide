export const CONNECTIONS_I18N_KEYS = {
    newConnection: 'connections.newConnection',
    editConnection: 'connections.editConnection',
    deleteConnection: 'connections.deleteConnection',
    createConnection: 'connections.createConnection',
    saveChanges: 'connections.saveChanges',
    testConnection: 'connections.testConnection',
    testing: 'connections.testing',
    sshKey: 'connections.ssh',
    readOnly: 'connections.readOnly',

    sections: {
        database: 'connections.database',
        sshTunnel: 'connections.sshTunnel',
        authentication: 'connections.authentication',
        visibility: 'connections.visibility',
    },

    authModes: {
        password: 'connections.password',
        privateKey: 'connections.privateKey',
    },

    visibility: {
        private: 'connections.privateVisibility',
        shared: 'connections.sharedVisibility',
    },

    ssh: {
        useTunnel: 'connections.useSshTunnel',
        sshPassword: 'connections.sshPassword',
        sshPrivateKey: 'connections.sshPrivateKey',
        sshKeyPassphrase: 'connections.sshKeyPassphrase',
        stored: 'connections.stored',
    },

    placeholders: {
        connectionName: 'connections.placeholders.connectionName',
        host: 'connections.placeholders.host',
        port: 'connections.placeholders.port',
        database: 'connections.placeholders.database',
        username: 'connections.placeholders.username',
        password: 'connections.placeholders.password',
        passwordKeep: 'connections.placeholders.passwordKeep',
        defaultSchema: 'connections.placeholders.defaultSchema',
        sslMode: 'connections.placeholders.sslMode',
        colorTag: 'connections.placeholders.colorTag',
        sshHost: 'connections.placeholders.sshHost',
        sshPort: 'connections.placeholders.sshPort',
        sshUsername: 'connections.placeholders.sshUsername',
        hostFingerprint: 'connections.placeholders.hostFingerprint',
        sshPassword: 'connections.placeholders.sshPassword',
        sshPasswordKeep: 'connections.placeholders.sshPasswordKeep',
        privateKey: 'connections.placeholders.privateKey',
        privateKeyKeep: 'connections.placeholders.privateKeyKeep',
        passphrase: 'connections.placeholders.passphrase',
        passphraseKeep: 'connections.placeholders.passphraseKeep',
    },

    status: {
        connectedTo: 'connections.connectedTo',
    },
} as const;
