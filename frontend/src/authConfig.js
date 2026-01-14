import { LogLevel } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;

if (!clientId || !tenantId) {
    throw new Error("Missing Azure configuration. Please check VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID.");
}

export const msalConfig = {
    auth: {
        clientId: clientId,
        authority: tenantId === 'common'
            ? 'https://login.microsoftonline.com/common'
            : `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                    default:
                        return;
                }
            },
        },
    },
};

export const loginRequest = {
    scopes: [`api://${clientId}/access_as_user`],
};

export const tokenRequest = {
    scopes: [`api://${clientId}/access_as_user`],
};
